# Phase 8 autonomous run — status

**Run date:** 2026-07-07. **Branch:** `phase-8-autorun` (pushed). **Outcome:** 8B → 8F all shipped. Nothing blocked, nothing deferred that was in scope.

## What shipped

All six commits are on `phase-8-autorun`, one sub-milestone each (plus one incidental build fix):

```
ea8fa93 feat: 8F — additional fact sources + lifecycle
e1d419d feat: 8E — knowledge facts in chat (inline context + retrieval tools)
cc78a22 feat: 8D — domain-organized Knowledge Hub
e934bc1 feat: 8C — confirmation queue (confirm / edit / reject pending facts)
b2a6754 feat: 8B — document upload + schema-driven Claude extraction (Income slice)
3bf1ae7 fix: logger — use console.log in prod so lib/logger is Edge-safe
```

- **8B** — Generic registry-driven extractor (`lib/knowledge/extract.ts`), PII redaction (`lib/knowledge/redact.ts`), upload endpoint (`app/api/knowledge/documents/route.ts`), minimal `/knowledge` page + `UploadCard`, Knowledge nav entry. Schema: `Document.blobUrl` nullable + new `Document.sourceExcerpt` (applied via `db:push`).
- **8C** — Confirmation queue (`/knowledge/review` + `ConfirmationQueue`), fact-action API (`app/api/knowledge/facts/[id]/route.ts`), shared display helpers (`lib/knowledge/display.ts`).
- **8D** — Domain-organized Hub: `/knowledge` renders every domain generically from the registry × confirmed facts, no completeness score.
- **8E** — Facts in chat: priority-budgeted inline context (`lib/knowledge/context.ts`), `search_facts` / `get_document` tools (`lib/knowledge/tools.ts`), and the **first tool loop** in `app/api/chat/route.ts`. The no-tool happy path is unchanged.
- **8F** — `capture_fact` chat tool + manual entry (`POST /api/knowledge/facts`, `AddFactChip`), staleness + Plaid-conflict detectors (`lib/knowledge/lifecycle.ts`) surfaced as Hub cards.

## The one deviation worth knowing

`lib/logger.ts` used `process.stdout.write`, which the Edge Runtime analyzer rejects; it is reachable from `middleware.ts`, so **`pnpm build` was already failing on the 8A parent commit** — unrelated to Phase 8. Fixed in a separate commit (`console.log`, same one-line stdout output, Edge-safe). Build is green after it. This was necessary to make the build gate meaningful for the run.

## Verification

- **Every commit**: `pnpm exec tsc --noEmit` clean.
- **8B and 8F**: full `pnpm build` clean (route + page integration).
- **8E**: full `pnpm build` clean **and** a Prisma probe confirming the knowledge tables + new `sourceExcerpt` column query end to end.
- **Not driven live** (needs a signed-in browser session this unattended run cannot create): the actual document extraction call, an authenticated chat turn exercising the tools, and the aged-fact/conflict cards with real data. These are type- and build-verified and structurally exercised; the manual checks are below.

## Guardrails honored

- `README.md`'s uncommitted change was never staged (every commit used explicit `git add`, never `git add -A`).
- Read-only to banks stayed absolute; every fact write goes through the single `commitFacts` path and lands `pending` for non-derived sources.
- All work on `phase-8-autorun`; nothing pushed to `main`.

## Dormant by design (not deferred)

- **Plaid-vs-fact conflict detection** returns nothing today because nothing writes `plaid`/`system` facts yet (an aggregator/derivation writer is explicitly out of Phase 8 scope). The detector + Hub surface are shipped, so that writer needs zero Hub changes to light it up.
- **Staleness cards** are empty until facts age past 180 days.

## How to test (5 minutes)

```
git checkout phase-8-autorun
pnpm install
pnpm db:push          # applies Document.sourceExcerpt
pnpm dev
```

1. **8B + 8C** — Sign in, open **Knowledge** in the sidebar. Upload `docs/phases/samples/sample_pay_stub.txt` (or a real pay stub / offer letter PDF). It extracts → facts land pending → the **Review** banner appears. Open it: confirm / edit / reject each fact next to its source snippet.
2. **8D** — Back on `/knowledge`, confirmed facts show under **Income & Employment** / **Retirement**, with "could still use" invitations. No completeness score.
3. **8F manual** — Click any `+` suggestion chip, type a value, Save → it appears in the review queue.
4. **8E + 8F chat** — Ask Beacon "what's my gross salary?" (should answer from the confirmed fact, via inline context or `search_facts`). Tell it "my rent is 2400" and check a pending `monthly_rent` fact shows up in the queue (`capture_fact`). Confirm normal chat is otherwise unchanged.

## Merge

`phase-8-autorun` is 6 commits ahead of `main` with no conflicts. Fast-forward merge when you have reviewed:

```
git checkout main && git merge --ff-only phase-8-autorun
```

`README.md` still has its prior uncommitted change, untouched.
