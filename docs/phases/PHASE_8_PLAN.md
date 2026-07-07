# Phase 8 — Knowledge Hub (working plan)

Reference document for the Phase 8 build. Status checkboxes get updated as we ship each sub-milestone.

**Source documents**:
- `../../beacon-design/handoff/ROADMAP.md` (Phase 8 acceptance criteria)
- `../../beacon-design/handoff/DESIGN_SYSTEM.md` (tokens, voice)
- `lib/system-prompt.ts` (the grounded-prompt pattern this extends)
- `prisma/schema.prisma` (fact ledger + document models)

**Acceptance**: a user can give Beacon context it cannot see through Plaid by uploading documents (pay stubs, offer letters, loan statements, etc.), reviewing and confirming the facts Beacon extracts, and browsing everything Beacon knows about them organized by financial domain. Confirmed facts flow into the chat agent so its answers get materially more grounded.

## Thesis and principles

The Hub is a **fact ledger, not a file cabinet**. The unit of value is a confirmed `KnowledgeFact` (gross salary, 401(k) match, loan APR); documents are one *source* of provenance behind facts. Chat, manual entry, and Plaid also write facts to the same ledger.

Design principles, all load-bearing:
1. **No terminal state.** The Hub always invites more. There is no completeness score and no "done." Affordances are open invitations, never progress toward a target.
2. **Extend by declaration.** Adding a domain, fact type, or document type is a **registry** entry, not a new code path, table, or page. Storage, extraction, UI, and chat context are all generic consumers of one declaration.
3. **Facts are the unit; sources are plural.** Documents, chat, manual entry, and Plaid all write to one ledger through a single commit path. The domain view is source-agnostic.
4. **Confirmation gates truth.** Every non-system fact is provisional until the user confirms it. A misread number acted on by an advisor is real harm.
5. **Prioritize what Plaid cannot see.** Marginal utility drives what the Hub asks for. It never solicits documents Beacon already streams (bank/card/brokerage statements).

**Marginal-utility ordering** (drives solicitation + chat context budget): tax return, pay stub, credit report, offer letter, and loan/lease terms sit at the top (invisible to Plaid, whole-domain). The 1099/1098 family sits low (redundant once the tax return is in). Bank/card/brokerage statements sit lowest (Plaid already has them).

## Sub-milestones

Each is independently shippable. Commit and push after each.

| #  | Milestone | Acceptance | Status |
|----|-----------|------------|--------|
| 8A | Fact ledger + domain registry (scalable core) | `KnowledgeFact` + `Document` models. `lib/knowledge/registry.ts` declares domains, fact types, and document types as metadata with per-fact `marginalWeight`. `lib/knowledge/facts.ts` is the single commit path: validates every fact against the registry, persists, supersedes prior confirmed facts on confirm, and audit-logs. No UI yet. | next |
| 8B | Document upload + schema-driven extraction (Income slice) | Upload endpoint stores the file (encrypted blob ref), classifies against a registry document type, and runs one **generic** extractor that reads the doc type's `extractionFields` and calls Claude for typed JSON. PII redacted before persistence. Ships `pay_stub` + `offer_letter`. Facts land in the ledger as `pending`. | not started |
| 8C | Confirmation queue | Extracted/chat facts show next to their source snippet. Confirm / edit / reject each. Confirm commits + supersedes; reject marks rejected. | not started |
| 8D | Knowledge Hub page — domain-organized | `/knowledge` renders domains generically from the registry × the user's confirmed facts. Ever-present, un-scored "Add more" affordance per domain with `marginalWeight`-driven suggestions. A new registry domain appears with zero new page code. | not started |
| 8E | Chat integration | Per-domain summarizers render confirmed facts into compact blocks. Priority-budgeted assembly fills the system-prompt context budget by `marginalWeight`. `search_facts` / `get_document` retrieval tools for the long tail. The agent can request a document mid-conversation when it hits a gap. | not started |
| 8F | Additional sources + lifecycle | Manual entry + conversational fact capture adapters (same commit path). Staleness re-verification invitations and Plaid-vs-fact conflict surfacing. | not started |

## Database schema additions (`prisma/schema.prisma`)

| Model / field | Purpose | Added in |
|---|---|---|
| `Document` | id, userId, type (registry doc-type key), filename, mimeType, blobUrl (encrypted ref), status (processing/ready/failed), error, uploadedAt, processedAt. Index `(userId, uploadedAt)`. | 8A |
| `KnowledgeFact` | id, userId, domain, key, valueJson, valueType, source (document/chat/manual/plaid/system), documentId?, confidence?, status (pending/confirmed/rejected), effectiveDate?, expiresAt?, supersededById?, timestamps. Indexes `(userId, domain, status)` and `(userId, key, status)`. | 8A |
| `User.documents` / `User.knowledgeFacts` | Back-relations, cascade delete. | 8A |
| `AuditLog` actions | Extend the `AuditAction` union with `knowledge.document.upload`, `knowledge.fact.commit`, `knowledge.fact.confirm`, `knowledge.fact.reject`, `knowledge.document.delete`. | 8A |

Out of scope for Phase 8:
- Embeddings / pgvector retrieval. The `search_facts` / `get_document` tool *interface* ships in 8E; the implementation selects by domain/key and can swap to vectors later without changing callers.
- Auto-refreshing payroll data via an aggregator (Argyle/Pinwheel). The Hub deliberately covers the same data via one-time document upload first; an aggregator is a later "keep it fresh" upgrade.
- Broad document-type coverage. 8B ships the Income slice; more doc types are registry declarations on top of the working pipeline.

## File plan

### 8A. Fact ledger + domain registry (this milestone)

- `prisma/schema.prisma` — `Document` and `KnowledgeFact` models + `User` back-relations. Applied via `pnpm db:push` (project uses push, no migrations dir).
- `lib/knowledge/registry.ts` — the load-bearing declaration:
  - Types: `ValueType`, `MarginalWeight`, `FactType`, `DomainKey`, `Domain`, `ExtractionField`, `DocumentType`.
  - `DOMAINS`: the v1 taxonomy (income, retirement, debt, housing, insurance, taxes, benefits, household, goals, estate), each with declared fact types. Income fully specced; others seeded.
  - `DOCUMENT_TYPES`: `pay_stub`, `offer_letter` for the Income slice, each declaring `extractionFields` mapped to domain + fact key + value type.
  - Lookups + validation: `getDomain`, `getFactType`, `getDocumentType`, `isKnownFactKey`, `validateFactValue(valueType, value)`.
- `lib/knowledge/facts.ts` — the single commit path:
  - `commitFacts(userId, inputs, opts)` — validates each input against the registry, persists as `pending` (or `confirmed` for `plaid`/`system` sources), audit-logs.
  - `confirmFact(userId, factId, patch?)` — sets `confirmed`, supersedes prior confirmed facts with the same `key`, audit-logs.
  - `rejectFact(userId, factId)` — sets `rejected`, audit-logs.
  - `getConfirmedFacts(userId, domain?)` and `getFactsByStatus(userId, status)` — read helpers for chat + the queue.
- `lib/audit.ts` — extend `AuditAction` with the five `knowledge.*` actions.

## Decisions confirmed before starting

1. **Phase number**: this is Phase 8. Phase 6 (mobile) and the MCP track remain independent and unstarted; Phase 8 does not depend on either.
2. **Registry-driven from commit one.** Domains/fact types/doc types are declared as data so every layer is generic. This is the scalability bet the user asked for; it is cheap to design in now and expensive to retrofit.
3. **Flexible-but-typed ledger.** `KnowledgeFact` uses a `domain` + `key` + `valueJson` + `valueType` shape (EAV-style) so new fact types never require a migration, with the registry enforcing typing at the app layer.
4. **No completeness score.** Dropped per user direction. The Hub is open-ended; suggestions are ranked by `marginalWeight`, not framed as gaps toward 100%.
5. **Confirmation is mandatory** for document/chat/manual facts. `plaid`/`system` facts are auto-confirmed at high confidence.
6. **Supersession over conflict.** A newer confirmed fact with the same `key` supersedes the older one via `supersededById` rather than both being live.
7. **Privacy is first-class.** Blobs stored via an encrypted reference (reuse `lib/encryption.ts`), PII redacted at extraction (8B), deletion cascades facts, every mutation hits the `AuditLog` (Phase 7B). The privacy policy gets a document-processing disclosure when 8B ships.
8. **Read-only to bank accounts stays absolute.** The Hub only ever reads/writes Beacon's own knowledge store, never the user's financial institutions.

## Working notes

Append findings, deviations from plan, and decisions made during execution under each milestone heading.

### 8A notes
_(to be filled during the build)_

### 8B notes
_(empty)_

### 8C notes
_(empty)_

### 8D notes
_(empty)_

### 8E notes
_(empty)_

### 8F notes
_(empty)_
