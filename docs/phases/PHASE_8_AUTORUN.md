# Phase 8 autonomous run brief (8B → 8F)

You are running unattended with permissions skipped. The user has left. Execute
Phase 8 sub-milestones **8B through 8F** per `docs/phases/PHASE_8_PLAN.md`.
Work from `/Users/anjal1/Documents/Beacon/beacon-app`.

## Run configuration (decided 2026-07-07)

- **Branch: `phase-8-autorun`.** All commits land here, not `main`. Push after
  each milestone. The user reviews the 5 commits and fast-forward merges on
  return. Do NOT push to `main`.
- **Blob storage: excerpt-only.** `BLOB_READ_WRITE_TOKEN` is not set, so the
  fallback path IS the path: persist a redacted `sourceExcerpt String? @db.Text`
  on `Document`, no raw-binary storage. Confirmed final; do not revisit.
- **This brief (`PHASE_8_AUTORUN.md`) is committed with the 8B commit.**

## Token efficiency (this is a long run)

- Delegate exploration to `Explore` / `general-purpose` sub-agents ("find the
  pattern in X", "how is page Y structured") so file dumps stay out of the main
  context. Keep implementation in the main loop.
- Read surgically: specific functions/sections, never whole files. Never re-read
  a file you just edited.
- Each milestone's commit is a context checkpoint. Batch independent tool calls.

## Pinned decisions (do NOT ask — these are final)

1. **Blob storage.** Use Vercel Blob only if `BLOB_READ_WRITE_TOKEN` is set in
   `.env.local`. Otherwise DO NOT block: persist only a **redacted extracted-text
   excerpt** on `Document` (add a `sourceExcerpt String? @db.Text` field) as
   provenance, and skip raw-binary storage. Either path must run without new
   credentials.
2. **PII.** Redact SSNs and full account numbers (regex) from any text BEFORE it
   is persisted or sent to Anthropic. Never store raw SSNs as facts.
3. **Extraction.** Reuse `lib/anthropic.ts`. Feed Claude the doc type's
   `extractionFields` from the registry and use tool-calling for strict typed
   JSON (mirror the `lib/insights-ai.ts` pattern). PDFs/images go to Claude
   natively. Map results through `commitFacts` so they land as `pending`.
4. **Voice/design.** Obey every hard rule in `beacon-app/CLAUDE.md` for any UI
   (no em dashes/semicolons/emoji in copy, tokens only, Geist only). Match the
   prototype where it speaks; the Hub is new, so keep it consistent with
   existing pages (`/spending`, `/accounts`).
5. **Read-only to banks** stays absolute. Only ever read/write Beacon's own
   knowledge store.

## Per-milestone loop (repeat for 8B, 8C, 8D, 8E, 8F)

1. Implement the milestone from the file plan in `PHASE_8_PLAN.md`.
2. `pnpm db:push` if schema changed. `pnpm exec tsc --noEmit` must be clean.
3. Run `pnpm build` before the FINAL commit of the run to catch route errors.
   For **8E specifically**, also drive the chat flow end-to-end (the `/verify`
   skill or a manual chat request) — it edits the shipped `system-prompt.ts`
   path and a clean `tsc` alone will not catch a chat regression.
4. Update that milestone's row to `✅ done` and fill its notes section in
   `PHASE_8_PLAN.md`.
5. Commit `feat: 8X — <subject>` (+ Co-Authored-By trailer) and `git push`.
   One commit per milestone.

## Guardrails / stop conditions

- **Never touch `README.md`** (it has an unrelated uncommitted change — leave it).
- Commit only Phase 8 files. Do not `git add -A` blindly.
- If `tsc` or `build` fails and you cannot fix it after a genuine attempt, STOP:
  write what happened to `docs/phases/PHASE_8_AUTORUN_STATUS.md` and exit.
- If you hit something that truly needs a human decision or a missing credential
  you cannot work around, take the documented default; if there is none, log it
  to the STATUS file and move to the next independent milestone, else stop.
- On completion, write a summary (what shipped, commits, anything deferred) to
  `docs/phases/PHASE_8_AUTORUN_STATUS.md`.

Begin with 8B.
