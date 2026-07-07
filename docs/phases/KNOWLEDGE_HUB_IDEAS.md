# Knowledge Hub — next-iteration ideas (running tab)

Working list captured during the post-Phase-8 review cycle. Raw ideas as given, not yet phased. We turn these into roadmap phases after the review.

> Ideas #1 and #2 are now folded into **`PHASE_9_PLAN.md`** (Filing Cabinet: document corpus + semantic RAG). Decisions locked: semantic retrieval via pgvector + Voyage, originals in Cloudflare R2, keep both the fact ledger and the corpus.

## Ideas

### 1. Store original documents (with privacy measures + quota)
Persist the uploaded file itself, not just the redacted `sourceExcerpt`.
- **Feasibility:** low-difficulty by design. `Document.blobUrl` (nullable, "encrypted storage reference") and `lib/encryption.ts` (`encrypt`/`decrypt`) already exist; the upload route already holds the raw bytes. ~half a day: add `@vercel/blob`, write encrypted bytes on upload, add an auth+ownership-gated `GET .../documents/[id]` download route, and a `DELETE` route (currently **missing** — the `knowledge.document.delete` audit action is declared but unused).
- **Quota:** ~1–2 hrs. Add `Document.sizeBytes`, aggregate-sum per user on upload, reject over limit, surface "X of Y used" on the Hub.
- **Real weight is privacy, not code:** reintroduces raw SSNs/account numbers at rest (currently redacted away), so encrypt the blob bytes, ship provably-complete deletion, add a retention policy, and update the Plaid/privacy disclosure. Bigger breach target. Only worth it with a concrete reason (re-view / re-extract / audit source).

### 2. Turn the Hub into a personal filing cabinet: store-any-doc + corpus-wide RAG chat (the big one)
Vision (as given): upload **any** document (tax return, private-equity holdings, a will, a relative's bank details, anything), have the system tell what kind of document it is, extract "key takeaways" / major info into system-prompt or some quick-access memory, let chat pull on **all** documents as context when answering (like Glean for enterprise), and let the user browse + search everything they've uploaded. The Hub becomes their filing cabinet.

Breaks into capabilities:
- **(a) Open ingestion.** Accept arbitrary document types, not just registry-declared ones, and store the original. (Depends on idea #1 — storing originals is now foundational, not optional.)
- **(b) Open-ended classification.** Identify the document kind beyond the fixed enum; "unknown / other" is a valid outcome instead of a rejection.
- **(c) Per-document key takeaways.** At upload, extract a short freeform summary/highlights as quick-access memory. Small enough to inject inline for a handful of docs; the full content goes to retrieval.
- **(d) Retrieval / RAG over the whole corpus.** Chunk + embed + vector search so chat can answer "what does my will say about the house?" across every uploaded doc. **The seam already exists:** 8E shipped the `search_facts` / `get_document` tool *interface* and explicitly noted the implementation can swap to vectors without changing callers. Add a semantic `search_documents` tool alongside them.
- **(e) Filing-cabinet UX.** Browse the document list, open a document, and full-text / semantic search across the corpus.

Architectural notes & decisions to make:
- **Two layers, not a replacement.** Structured fact ledger (precise confirmed values: salary, APR, filing status) + document corpus (freeform recall: "what's in my will"). They answer different questions; keep both. This is a **conscious departure from the Phase 8 thesis** ("fact ledger, NOT a file cabinet") — the principle needs reconciling/rewriting.
- **Everything can't live in the system prompt.** Two-tier memory: cheap per-doc takeaways (injectable, budgeted by `marginalWeight` like 8E) + full-content vector retrieval on demand. This subsumes the earlier "broaden document-type coverage" candidate: known types get structured facts as a fast-path; unknown types still get stored, summarized, and retrievable.
- **Privacy is the gating concern, magnified.** Storing + embedding wills, estate docs, and *other people's* financial data (dad's) is a large sensitive surface with third-party-consent questions. Encrypt at rest, be deliberate about what enters the embedding index, retention/deletion, disclosure. This — not the engineering — is what paces the work.

<!-- append new ideas below as they come -->
