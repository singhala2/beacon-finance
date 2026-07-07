# Phase 9 — Knowledge Hub: Filing Cabinet (document corpus + semantic RAG)

Working plan for turning the Knowledge Hub into a personal filing cabinet: store any document, understand it, and let chat retrieve across the whole corpus. Builds directly on Phase 8. Ideas captured in `KNOWLEDGE_HUB_IDEAS.md` (#1 store originals + quota, #2 store-anything + corpus RAG).

**Source documents**:
- `docs/phases/PHASE_8_PLAN.md` (the fact ledger + registry this extends)
- `lib/knowledge/*` (registry, facts, extract, tools, context, display, lifecycle)
- `lib/encryption.ts` (AES-256-GCM at rest), `lib/system-prompt.ts`, `app/api/chat/route.ts` (the tool loop)

**Acceptance**: a user can upload *any* document (known or unknown type). Beacon stores the original securely (encrypted, in Cloudflare R2), identifies what it is, extracts key takeaways, and semantically indexes its contents. The chat agent can retrieve across the entire corpus to answer questions ("what does my will say about the house?"), citing the source document. The user can browse, open, and search everything they have uploaded, with a per-user storage quota. Known document types (pay stub, offer letter, ...) continue to produce precise structured facts in the ledger.

## Thesis update

Phase 8's thesis was "a fact ledger, not a file cabinet." Phase 9 **keeps the ledger and adds the cabinet** — two complementary layers:
- **Fact ledger** (Phase 8): precise, confirmed, typed values (gross salary, APR, filing status). Best for exact answers and math.
- **Document corpus** (Phase 9): the full contents of everything uploaded, summarized and semantically indexed. Best for freeform recall over anything Beacon was never taught to type.

A known document feeds both layers; an unknown document feeds only the corpus. The Hub becomes the single place a user's financial life is stored and queryable.

Principles (carried forward + new):
1. **Two layers, both first-class.** Structured extraction (8B) still runs for known types; every document also enters the corpus.
2. **Store originals securely.** Encrypted at rest in R2, never a bare public URL. Deletion is provably complete (object + rows + facts + chunks).
3. **Open ingestion.** Any file type is accepted. "Unknown / other" is a valid classification, not a rejection.
4. **Redact the index, keep the original.** The encrypted original retains everything; the text that enters the vector index, summaries, and the prompt is PII-scrubbed (SSNs, full account numbers) — so a retrieval or prompt leak never exposes an identifier.
5. **Retrieval over recall-by-cramming.** The corpus is reached by a semantic tool, not by stuffing everything into the system prompt. Only compact per-doc takeaways ride inline, budgeted like 8E.
6. **Privacy is the gate.** Third-party data (a relative's details), estate docs, and raw financials raise the stakes: encryption, retention, deletion, an upload acknowledgment, and a privacy-disclosure update are in-scope, not afterthoughts.

## Credentials required before execution

These gate the run. Both are the user's to provision:
- **Cloudflare R2** (9A): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`. S3-compatible.
- **Voyage AI embeddings** (9D): `VOYAGE_API_KEY`. Model `voyage-3.5` (1024-dim), configurable.

Each sub-milestone that needs a credential fails closed with a clear error if it is absent, so earlier milestones remain runnable.

## Sub-milestones

Each is independently shippable. Commit and push after each.

| #  | Milestone | Acceptance | Status |
|----|-----------|------------|--------|
| 9A | Encrypted original storage + quota | R2 client (`lib/storage/objects.ts`, S3 SDK). Upload encrypts bytes and stores them in R2; `Document` records the object key + `sizeBytes`. Auth+ownership `GET /documents/[id]` streams the decrypted file; `DELETE` removes the object, row, facts, and chunks and audit-logs `knowledge.document.delete`. Per-user byte quota enforced on upload; usage shown on the Hub. | ✅ done |
| 9B | Open ingestion + classification + text extraction | Uploads accept any supported file; unknown types are allowed, not rejected. A generic step extracts full text (Claude-native for PDFs/images), stores a redacted, encrypted copy, an open-ended `docKind` label, and a freeform key-takeaways `summary`. | not started |
| 9C | Structured facts for known types | When classification maps to a registry `DocumentType`, the existing 8B extractor still runs and lands typed facts in the ledger (pending). Unknown types skip it. Both layers, one pipeline. | not started |
| 9D | Semantic index (pgvector + Voyage) | Enable `pgvector` on Neon. `DocumentChunk` model holds chunked, redacted text + embeddings. On upload, text is chunked and embedded via `lib/embeddings.ts` (Voyage). Re-index + backfill path for existing docs. | not started |
| 9E | Corpus retrieval in chat (RAG) | `search_documents` tool: embed the question, k-NN over the user's chunks (cosine), return snippets + document refs; added to the existing chat tool loop. Top per-doc takeaways optionally ride inline, budgeted. Answers cite the source document. | not started |
| 9F | Filing-cabinet UX | A documents view: browse (type/kind, date, size, status), open a document (view original via the download route), per-doc detail (summary, extracted facts if any, delete), and a corpus search box (semantic + keyword). | not started |

## Database schema additions (`prisma/schema.prisma`)

| Model / field | Purpose | Added in |
|---|---|---|
| `Document.objectKey String?` | R2 object key for the encrypted original (replaces the unused `blobUrl` intent). | 9A |
| `Document.sizeBytes Int?` | Original byte size, for quota aggregation. | 9A |
| `Document.docKind String?` | Open-ended classification label (e.g. "will", "K-1", "bank statement"). Free text; not registry-gated. | 9B |
| `Document.summary String? @db.Text` | Freeform key-takeaways summary (redacted). | 9B |
| `Document.extractedText String? @db.Text` | Redacted full text, encrypted, for re-indexing without re-fetching the original. | 9B |
| `DocumentChunk` | id, userId, documentId, ord, content (`@db.Text`, redacted), embedding (`Unsupported("vector(1024)")`), createdAt. Index `(userId)`; ivfflat/hnsw index on `embedding`. Cascade-deletes with the document. | 9D |
| `AuditLog` actions | Add `knowledge.document.download`, `knowledge.document.index`; use the already-declared `knowledge.document.delete`. | 9A/9D |

## Decisions confirmed before starting

1. **Retrieval: semantic, pgvector on Neon + Voyage embeddings.** No new database; `pgvector` extension on the existing Postgres. k-NN via raw SQL (`embedding <=> $query`) since Prisma models the column as `Unsupported`. `voyage-3.5`, 1024-dim, configurable.
2. **Storage: Cloudflare R2** via the S3-compatible SDK (`@aws-sdk/client-s3`). Bytes are AES-256-GCM encrypted (extend `lib/encryption.ts` to bytes) before `put`; the object is never public.
3. **Keep both layers.** Structured fact extraction for known types stays; the corpus is added around it.
4. **Redact the index, not the original.** The encrypted original is complete; `summary`, `extractedText`, `DocumentChunk.content`, and anything sent to Voyage or the prompt are PII-scrubbed via `lib/knowledge/redact.ts` (extended as needed).
5. **Quota.** Default 100 MB / user (constant, per-plan later). Enforced by summing `Document.sizeBytes` on upload.
6. **Third-party data.** A one-line upload acknowledgment ("you have the right to store this") for documents about others. Stored on the audit trail.
7. **Text extraction.** Claude-native transcription for PDFs/images (handles scans), size-capped; a parser library is a later optimization. Large documents are chunked before embedding, not before extraction, unless they exceed the model context.
8. **The `search_facts` / `get_document` seam from 8E is honored** — `search_documents` joins them; the chat tool loop needs no structural change.

## File plan (high level)

- `lib/storage/objects.ts` — R2 client: `putObject`, `getObject`, `deleteObject` (encrypt/decrypt at the boundary). Env-gated.
- `lib/encryption.ts` — add `encryptBytes` / `decryptBytes` (Buffer in/out) alongside the string helpers.
- `lib/embeddings.ts` — Voyage client: `embed(texts): number[][]`. Env-gated.
- `lib/knowledge/ingest.ts` — the new pipeline: store original → extract text (redact) → classify (open-ended) → summarize → [known type → 8B structured facts] → chunk + embed.
- `lib/knowledge/retrieval.ts` — `searchDocuments(userId, query, k)` (embed + pgvector k-NN via raw SQL).
- `lib/knowledge/tools.ts` — add `search_documents` to `KNOWLEDGE_TOOLS` + handler.
- `app/api/knowledge/documents/route.ts` — extend upload for open ingestion, storage, quota.
- `app/api/knowledge/documents/[id]/route.ts` — `GET` (download/stream), `DELETE` (purge everywhere).
- `app/(app)/knowledge/documents/` — the filing-cabinet browse/detail/search UI.
- `prisma/schema.prisma` — fields + `DocumentChunk` + pgvector (applied via `db:push`; pgvector extension enabled first).

## Out of scope for Phase 9

- Cross-user / household sharing of documents.
- Re-embedding on a schedule / model migration tooling (a one-shot backfill ships; automated re-index does not).
- OCR-library optimization (Claude-native extraction ships first).
- Answering by editing documents or generating new ones — retrieval only.

## Working notes

Append findings, deviations, and decisions during execution under each milestone heading.

### 9A notes

- **Storage** `lib/storage/objects.ts`: R2 via `@aws-sdk/client-s3` (S3-compatible, `region: 'auto'`, `<account>.r2.cloudflarestorage.com`). `putObject`/`getObject`/`deleteObject` encrypt/decrypt at the boundary with new `encryptBytes`/`decryptBytes` in `lib/encryption.ts` (same AES-256-GCM iv+tag+ciphertext layout, Buffer in/out). Objects are stored as `application/octet-stream` ciphertext; real content type kept on the row + object metadata.
- **Credential-gated**: `isObjectStorageConfigured()` checks `R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET`. When absent, upload skips original storage (objectKey null) and everything else still runs — so 9A is committable/shippable before the creds land.
- **Schema**: `Document.objectKey` (R2 key) + `Document.sizeBytes`; `blobUrl` kept as legacy. Applied via `db:push`.
- **Upload** (`app/api/knowledge/documents/route.ts`): quota check (`hasRoom`) → 413 if over; records `sizeBytes`; stores the encrypted original under `documents/<userId>/<docId>` when R2 is configured (storage failure is non-fatal, leaves objectKey null).
- **Routes** `app/api/knowledge/documents/[id]/route.ts`: `GET` streams the decrypted original to its owner (audit `knowledge.document.download`); `DELETE` removes the R2 object + row (audit `knowledge.document.delete`).
- **Delete semantics decision**: deleting a document removes the sensitive original (R2) + will cascade its indexed chunks (9D), but derived **facts survive** with their `documentId` nulled (schema `SetNull`). A confirmed number the user relies on should not vanish because they deleted a source file; the sensitive raw bytes and indexed text are what get purged.
- **Quota** `lib/knowledge/quota.ts`: 100 MB/user default (constant), `getUsage` sums `sizeBytes`. Hub shows "X of 100 MB used".
- New audit actions: `knowledge.document.download`, `knowledge.document.index`.
- Not runtime-verified (needs R2 creds): `tsc` clean; storage paths exercised on first real upload once creds are set.

### 9B notes
_(empty)_

### 9C notes
_(empty)_

### 9D notes
_(empty)_

### 9E notes
_(empty)_

### 9F notes
_(empty)_
