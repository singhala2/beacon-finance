# Phase 9 — status (Filing Cabinet: document corpus + semantic RAG)

**Built:** 2026-07-07, straight on `main`. **Outcome:** 9A → 9F all shipped (9C folded into 9B). Everything is credential-gated and build-verified; it is **not** end-to-end runtime-verified because it needs two services you provision.

## What shipped

```
feat: 9E — corpus retrieval in chat (RAG)
feat: 9D — semantic index (pgvector + Voyage embeddings)
feat: 9B+9C — open document ingestion (store anything, classify, summarize, keep-both facts)
feat: 9A — encrypted original storage (R2) + quota + download/delete
docs: Phase 9 — Filing Cabinet plan
```

- **9A** — Originals stored **encrypted** in Cloudflare R2 (`lib/storage/objects.ts`, `encryptBytes`/`decryptBytes`). Per-user **100 MB quota**. Owner-only **download** and **delete** routes.
- **9B/9C** — **Open ingestion**: upload *anything*. Pipeline (`lib/knowledge/ingest.ts`) extracts text, classifies open-endedly (`docKind` + optional known type), summarizes key takeaways, and — for known types — still extracts structured facts to the ledger. Unknown types are stored + summarized, never rejected.
- **9D** — **Semantic index**: pgvector on Neon + Voyage embeddings (`lib/embeddings.ts`, `index-document.ts`). Chunk → embed → store vectors. Backfill route for existing docs.
- **9E** — **RAG in chat**: `search_documents` tool (joins the existing tool loop, no route change) does cosine k-NN over the user's chunks; the agent is told what documents exist and to cite its source.
- **9F** — **Filing cabinet UI**: `/knowledge/documents` — browse, open originals, delete, and semantic search.

## Two credentials you must add (nothing works end-to-end without them)

In `.env.local` **and** in Vercel (Production + Preview):

```
# Cloudflare R2 (original file storage — 9A)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...

# Voyage AI (embeddings for semantic search — 9D/9E/9F)
VOYAGE_API_KEY=...
```

Until then, everything degrades gracefully: uploads still classify/summarize/extract facts, but **no original is stored** (no R2) and **no semantic search** (no Voyage). The app runs; those features are just dark.

## Infra already done for you

- **pgvector 0.8.0 enabled on Neon**, `DocumentChunk` table created, **HNSW cosine index** built. No DB action needed on your side.
- All schema pushed via `db:push`.

## After you add the keys

1. Redeploy (Vercel picks up new env vars on the next deploy).
2. **Backfill the index** for any documents uploaded before the Voyage key existed: `POST /api/knowledge/reindex` while signed in (e.g. from the browser console: `fetch('/api/knowledge/reindex',{method:'POST'}).then(r=>r.json()).then(console.log)`).
3. Upload a document (a will, a tax return, anything). Then:
   - **Knowledge → Browse documents**: it should list, let you Open the original, and Search should return passages.
   - **Ask Beacon**: "what does my will say about the house?" — it should call `search_documents` and answer citing the file.

## What is NOT verified (needs the keys + a session)

Real R2 put/get, real Voyage embeddings, the vector insert/query SQL, and the live chat retrieval. All are `tsc`- and `pnpm build`-clean and logic-reviewed, but first real upload is the true test. Most likely first-run snags: an R2 bucket/CORS or region detail, or a Voyage response-shape/dimension mismatch (the column is `vector(1024)` for `voyage-3.5`; a different model's dims would need a one-line schema change + re-push + reindex).

## Design guarantees held

- **Redact the index, keep the original.** The R2 original is complete and encrypted; everything indexed, summarized, or sent to the prompt is PII-scrubbed.
- **Both layers.** Known docs still produce precise ledger facts; every doc also enters the searchable corpus.
- **Read-only to banks.** The corpus only ever reads/writes Beacon's own store.
- `README.md` left untouched; every commit used explicit `git add`.
