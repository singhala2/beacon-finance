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
| 8A | Fact ledger + domain registry (scalable core) | `KnowledgeFact` + `Document` models. `lib/knowledge/registry.ts` declares domains, fact types, and document types as metadata with per-fact `marginalWeight`. `lib/knowledge/facts.ts` is the single commit path: validates every fact against the registry, persists, supersedes prior confirmed facts on confirm, and audit-logs. No UI yet. | ✅ done |
| 8B | Document upload + schema-driven extraction (Income slice) | Upload endpoint stores the file (encrypted blob ref), classifies against a registry document type, and runs one **generic** extractor that reads the doc type's `extractionFields` and calls Claude for typed JSON. PII redacted before persistence. Ships `pay_stub` + `offer_letter`. Facts land in the ledger as `pending`. | ✅ done |
| 8C | Confirmation queue | Extracted/chat facts show next to their source snippet. Confirm / edit / reject each. Confirm commits + supersedes; reject marks rejected. | ✅ done |
| 8D | Knowledge Hub page — domain-organized | `/knowledge` renders domains generically from the registry × the user's confirmed facts. Ever-present, un-scored "Add more" affordance per domain with `marginalWeight`-driven suggestions. A new registry domain appears with zero new page code. | ✅ done |
| 8E | Chat integration | Per-domain summarizers render confirmed facts into compact blocks. Priority-budgeted assembly fills the system-prompt context budget by `marginalWeight`. `search_facts` / `get_document` retrieval tools for the long tail. The agent can request a document mid-conversation when it hits a gap. | ✅ done |
| 8F | Additional sources + lifecycle | Manual entry + conversational fact capture adapters (same commit path). Staleness re-verification invitations and Plaid-vs-fact conflict surfacing. | ✅ done |

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

- Schema applied via `pnpm db:push` (project has no migrations dir). `Document` and `KnowledgeFact` tables live on Neon; `User` gets `documents` + `knowledgeFacts` back-relations.
- `KnowledgeFact` supersession is tracked by a `supersededById` pointer, not a status value. "Live" facts are `status = confirmed AND supersededById = null` — that is what `getConfirmedFacts` returns and what chat/Hub will read.
- `commitFacts` validates every input against the registry and returns the invalid ones rather than throwing, so one bad extracted field never discards the good fields beside it. `plaid`/`system` sources auto-confirm (and supersede immediately); `document`/`chat`/`manual` land `pending`.
- Value normalization lives in `validateFactValue` (registry): strips `$ , %` from money/number, coerces dates to ISO, checks enum membership. Verified: `"$85,000"` → `85000`; enum rejects out-of-set values.
- Registry invariant checked at build time: every `DocumentType.extractionField.factKey` resolves to a real `FactType` of the same `valueType` in its declared domain. A mismatch here would silently drop extractions in 8B, so re-run that check when adding document types.
- `AuditAction` extended with five `knowledge.*` actions; every fact mutation is audit-logged (Phase 7B).

### 8B notes

- **No blob store (no `BLOB_READ_WRITE_TOKEN`), so raw binaries are not persisted.** `Document.blobUrl` is now nullable and left null; a new `Document.sourceExcerpt String? @db.Text` holds a redacted, per-fact evidence excerpt as provenance. This is the pinned autorun default and satisfies "runs without new credentials."
- **Generic extractor** `lib/knowledge/extract.ts`: `extractFacts(docTypeKey, file)` builds an Anthropic tool from the doc type's `extractionFields` (enum of allowed `factKey`s), forces `tool_choice`, and parses the typed JSON — mirrors `lib/insights-ai.ts`. Adding a doc type is a registry declaration; this file never changes. Model: `claude-sonnet-4-6` (matches insights; higher-stakes persisted output). `classifyDocument(file)` picks a registry doc type when the uploader chooses "Detect automatically".
- **PDFs/images go to Claude natively** (`document` / `image` content blocks, base64). Text files are `redactPii`-scrubbed before they reach Anthropic.
- **PII** `lib/knowledge/redact.ts`: `redactPii()` strips SSNs and full account/routing/card numbers (labelled + bare) from any excerpt before persistence; `looksLikePii()` is a final guard so no fact value that still looks like an identifier is ever committed. Dollar amounts, dates, employer names are preserved.
- **Commit path unchanged**: extracted values flow through `commitFacts` as `source: 'document'`, landing `pending`. One bad field is dropped by registry validation without discarding the rest (8A behavior).
- **Endpoint** `app/api/knowledge/documents/route.ts` (`POST` upload, `GET` list). Records the `Document` up front (`processing`) so a failed extraction still leaves a trace, then `ready`/`failed`. Audit-logs `knowledge.document.upload`. 10 MB cap; accepts PDF, PNG/JPG/GIF/WebP, and text.
- **Minimal UI to make the pipeline testable**: `/knowledge` page + `components/knowledge/UploadCard.tsx` (upload + doc-type picker + recent-documents list + pending-count hint). Added a `Knowledge` sidebar nav entry (new `KnowledgeIcon`, `DASHBOARD_NAV`, topbar title). **8D replaces this page with the domain-organized Hub; 8C adds the confirmation queue it points to.** This minimal surface is intentional throwaway scaffolding, kept small.
- **Incidental build fix (separate commit): `lib/logger.ts`** used `process.stdout.write`, which the Edge Runtime analyzer rejects; it is reachable from `middleware.ts` via `ratelimit.ts`, so `pnpm build` was already failing on the 8A parent commit (unrelated to Phase 8). Swapped to `console.log(JSON.stringify(...))` — same one-line stdout output in the Node server, Edge-safe. Build is green after this.
- **Not runtime-verified here**: live extraction needs a signed-in session + a real Anthropic call. `tsc` and `pnpm build` are clean; end-to-end upload is in the testing notes for the user.

### 8C notes

- **Page** `/knowledge/review` (server) builds `QueueItem`s from all `pending` facts, joined to their `Document` for provenance. Linked from the `/knowledge` pending banner and the upload success message.
- **`components/knowledge/ConfirmationQueue.tsx`** (client): one row per fact showing domain, registry label, formatted value, the source snippet, and confidence. Confirm / Edit / Reject. Edit reveals an input prefilled with a re-parseable value; Save confirms with the patch. Rows disappear optimistically on resolve and `router.refresh()` keeps the nav/Hub counts in sync.
- **Actions API** `app/api/knowledge/facts/[id]/route.ts` `PATCH { action: 'confirm' | 'reject', value? }` → `confirmFact` / `rejectFact`. All truth-changing logic (supersession, audit) stays in `lib/knowledge/facts.ts`; the route is a thin auth wrapper. Editing re-validates the new value against the registry inside `confirmFact`.
- **Shared display helpers** `lib/knowledge/display.ts`: `factLabel`, `formatFactValue` (money/number/date/boolean/text), and `evidenceForKey` which pulls the per-fact evidence line out of `Document.sourceExcerpt` (stored as `key: evidence`). Reused by 8D so a fact renders identically in the queue and the Hub.
- Confirming supersedes any prior live fact with the same key (8A behavior), so re-uploading a newer pay stub and confirming replaces the old value rather than duplicating it.

### 8D notes

- **`/knowledge` rebuilt as the domain-organized Hub.** It maps over `DOMAINS` × the user's `getConfirmedFacts`. A brand-new registry domain or fact type appears here with zero page changes — the generic-rendering invariant the plan asked for.
- **Populated domains** render a Card per domain: each confirmed fact as `label · value · source`, value formatted by `formatFactValue` with the registry `unit` (e.g. `%`, `months`). Source shown as a small chip (Document / Chat / Manual / Plaid / Beacon).
- **No completeness score.** Each populated domain ends with an un-scored "Beacon could still use" invitation listing the top unfilled fact types ranked by `marginalWeight` (high → medium → low). Domains with no facts collapse into one compact "Add more context" card so the page invites without nagging. No domain is ever "done".
- **Suggestion chips are non-interactive in 8D** (open invitations). Manual entry that turns a chip into an editable fact is 8F; documents and chat already write through the confirm flow.
- The minimal 8B documents list was dropped from the page: the Hub is a fact ledger, not a file cabinet (principle 3). Upload still lives at the top; a failed upload surfaces its error inline in `UploadCard`.
- Verified generic-rendering by reading DOMAINS: income/retirement/debt/housing/insurance/taxes/benefits/household/goals/estate all render from declaration; only income + retirement have facts wired via 8B extraction so far.

### 8E notes

- **Inline context** `lib/knowledge/context.ts` `buildKnowledgeContext(userId, {budgetChars})`: renders confirmed facts into one compact "What you know about this user, confirmed by them" block, grouped by domain in registry order. **Priority-budgeted**: facts are admitted to a ~1600-char budget by `marginalWeight` (high → medium → low), so the facts Plaid cannot see win the space; a trailing note tells the model how many were omitted and to use `search_facts`. Returns `''` when there are no facts, so the prompt stays unchanged for users without any.
- **System prompt** `lib/system-prompt.ts`: the block is injected after RISK PROFILE, before SPENDING, and the intro paragraph now tells the agent it can call `search_facts` / `get_document`, preferring the inline facts.
- **Retrieval tools** `lib/knowledge/tools.ts`: `KNOWLEDGE_TOOLS` (`search_facts` by keyword/domain, `get_document` to list or fetch a redacted excerpt), `isKnowledgeTool`, `handleKnowledgeTool(userId, name, input)`. Generic domain/key/text selection; the contract can swap to vectors later without changing callers. All reads are scoped to the user.
- **Chat route** `app/api/chat/route.ts` gained its **first tool loop** (chat had none before). It offers the tools each round and streams text deltas exactly as before; when a turn stops on `tool_use` it runs the handlers, feeds `tool_result`s back, and continues (bounded to 4 rounds; the final round drops tools to force a text answer). **The no-tool happy path is byte-for-byte the old behavior** — the model just now has tools available. Frontend unchanged (tool execution is fully server-side; `useChatStream` still only sees `delta`/`done`).
- **Verification**: `tsc` clean; full `pnpm build` clean (compiles the modified route + system prompt + tools together); Prisma probe confirmed the knowledge tables + new `sourceExcerpt` column query end to end. **Not driven live here**: an authenticated chat turn hitting Anthropic needs a browser session this unattended run cannot create. Manual check for the user: ask Beacon something only a confirmed fact knows (e.g. gross salary) and confirm normal chat is unaffected. The loop is bounded and read-only, so worst case is an extra tool round, never a bank write.

### 8F notes

- **Conversational capture** `capture_fact` tool added to `KNOWLEDGE_TOOLS` (8E loop). When the user states a durable fact in chat ("my rent is 2400"), the agent maps it to a registry domain/key (both provided as enums so it stays valid) and it commits through `commitFacts` as `source: 'chat'` → lands **pending**. The tool result explicitly tells the agent not to claim it is confirmed, so truth still gates on the review queue.
- **Manual entry** `POST /api/knowledge/facts` → `commitFacts(source: 'manual')` → pending. UI: `components/knowledge/AddFactChip.tsx` turns every Hub suggestion chip (populated "could still use" and empty-domain invites) into an inline input; saving posts and refreshes. Same commit path, no new truth logic.
- **Staleness** `lib/knowledge/lifecycle.ts` `getStaleFacts`: confirmed live facts that are past `expiresAt` (`expired`) or older than 180 days (`aging`). Surfaced as a "Worth re-checking" Hub card linking to the review queue. No facts are stale yet (all fresh), so the card is dormant until facts age; logic verified by reading.
- **Plaid-vs-fact conflict** `detectConflicts`: finds keys where a user-confirmed fact (document/chat/manual) disagrees with a Plaid/system-derived fact of the same key, surfaced as a "Worth a look" Hub card. **Dormant by design**: nothing writes `plaid`/`system` facts yet (an aggregator/derivation writer is explicitly out of Phase 8 scope), so it returns nothing today but lights up automatically once derived facts land in the ledger. Shipping the detector + surface now means that writer needs zero Hub changes later.
- All four adapters/detectors are read-only to banks and route every write through the single `commitFacts` path. Verified: `tsc` + full `pnpm build` clean. Live chat `capture_fact` and the aged-fact/conflict cards need real data + a session to see populated; the code paths are build- and type-verified and exercised structurally.
