# Phase 5 — Insights and polish (working plan)

Reference document for the Phase 5 build. Status checkboxes get updated as we ship each sub-milestone.

**Source documents**:
- `../../beacon-design/handoff/ROADMAP.md` (acceptance criteria)
- `../../beacon-design/handoff/FLOWS.md` (account / goal / settings flows)
- `../../beacon-design/handoff/COMPONENTS.md` (component inventory)
- `../../beacon-design/handoff/API.md` (`/api/insights`, `/api/me`, settings contracts)
- `../../beacon-design/Beacon Prototype.html` (account drawer, goal detail, settings tabs)

**Acceptance**: a user can refresh their Beacon's Brief and get fresh AI-generated insights from their real data, drill into a specific goal or account, and manage profile / integrations / data export from a real Settings page.

This is the last build phase before mobile (Phase 6) and production hardening (Phase 7). It's the "make it feel finished" milestone.

**Deferred indefinitely**: the weekly email digest from the original ROADMAP. Not yet clear it adds enough value to justify maintaining a templated email pipeline; we can revisit once we've deployed and have real-user signal. The hooks needed to add it later (preferences schema, Resend integration) already exist.

## Sub-milestones

Each is independently shippable. Commit and push after each.

| #  | Milestone | Acceptance | Status |
|----|-----------|------------|--------|
| 5A | Real AI-generated insights — schema + generation route + dashboard read | Beacon's Brief on the dashboard reads from a persisted `Insight` table. A POST endpoint generates fresh insights via Anthropic from live user data and writes them. | ✅ done |
| 5B | Insights cron + dismiss/action affordances | Daily cron triggers per-user generation. Each brief card has a real × dismiss and "Take action" link wired to the right destination. | ✅ done |
| 5C | `/accounts` table + per-account drawer | Real table view of every connected `FinancialAccount` with rename / hide / disconnect actions. Click a row → side drawer with detail and recent transactions. | ✅ done |
| 5D | `/goals/[id]` detail page | Replace the goal stub with a real detail page: progress chart, contribution suggestion, edit/delete. Top-level `/goals` becomes a goal list. | ✅ done |
| 5E | `/settings` tabs — profile, integrations, data, danger | Profile (name/age/location), integrations (Plaid items list with disconnect), data (export JSON, account deletion), all wired to real endpoints. | ✅ done |
| 5F | Polish pass — loading, empty, error, copy | Audit every screen for skeletons during data fetch, friendly empty states, consistent error toasts, and copy that follows CLAUDE.md voice rules. | ✅ done |
| 5G | `/spending` page — first draft | Replace the stub with a real page: total month spend with prior-month delta, full category breakdown, full filterable transaction list. | ✅ done |

## Database schema additions (`prisma/schema.prisma`)

| Model / field | Purpose | Added in |
|---|---|---|
| `Insight` | id, userId, type, severity, headline, body, evidence (JSON), actions (JSON), dismissedAt, createdAt. Index on `(userId, dismissedAt, createdAt)`. | 5A |
| `User.lastInsightGeneratedAt DateTime?` | Throttle so we don't regenerate within minutes when the cron + a manual trigger collide. | 5B |
| `FinancialAccount.customName` already exists from Phase 1 — surface in the table UI. | (no schema work) | 5C |
| `Goal.deletedAt DateTime?` | Soft-delete so insights / history don't break when a goal is removed. | 5D |

Out of scope:
- Insight `actions[]` becoming actual server-driven workflows (e.g., one-click HYSA transfer). Phase 5 ships actions as deep links / chat seeds only.
- Conversation history truncation, rate limiting, audit log — Phase 7.

## File plan

### 5A. Real AI-generated insights

Backend:
- `prisma/schema.prisma` — `Insight` model.
- `lib/insights-ai.ts` — `generateInsightsForUser(userId): Promise<Insight[]>`. Builds a focused system prompt (similar to chat's, but instructs Claude to return strict JSON: an array of `{ type, severity, headline, body, evidence, actions }`). Uses tool calling so Claude can't drift from the schema. Persists results, deletes stale insights for that user.
- `app/api/insights/route.ts` — `GET` returns the user's active (not dismissed, not expired) insights. `POST` generates fresh insights synchronously (used by cron and the manual refresh in 5B).
- `lib/system-prompt.ts` — extract the "facts about user" portion into a reusable `buildUserContextSnippet(userId)` so chat and insights generation stay in sync.

Frontend:
- `components/dashboard/BeaconsBrief.tsx` — switch from `lib/insights.ts` (hardcoded triggers) to fetching from `/api/insights`. Server-render the initial three; the page re-renders when the API returns.
- The hardcoded `lib/insights.ts` becomes a fallback used only when no AI insights exist yet (first-time user, before cron runs).

### 5B. Cron + dismiss + action

- `app/api/cron/insights/route.ts` — endpoint that the platform-level cron hits. Iterates all users with connected accounts and generates insights. Auth via a shared `CRON_SECRET` env var checked against the `Authorization: Bearer` header.
- Vercel `vercel.json` cron config (or Neon/equivalent) — runs daily at 03:00 UTC.
- `app/api/insights/[id]/dismiss/route.ts` — `POST` sets `dismissedAt`.
- `app/api/insights/[id]/action/route.ts` — `POST` logs that the user took action (separate from dismiss).
- `BriefCard` — wire the existing × button to call dismiss; CTA button maps each `action.id` to a destination (`chat?q=...`, `/accounts/[id]`, etc.).
- New env: `CRON_SECRET`.

### 5C. `/accounts` table + drawer

- `app/(app)/accounts/page.tsx` — replace the stub. Real table of all `FinancialAccount` rows with columns matching `API.md` (institution, account name, type, balance, last sync, actions).
- `app/(app)/accounts/[id]/page.tsx` — drawer-style detail (we render as a full page on desktop for now; true side drawer is a Phase 6 mobile concern). Shows account meta + recent 30 transactions for that account.
- `app/api/accounts/route.ts` — `GET` list (already would be a useful endpoint).
- `app/api/accounts/[id]/route.ts` — `PATCH` (rename via `customName`, set `isHidden`), `DELETE` (disconnect — removes the `PlaidItem` and cascades).
- Hidden accounts excluded from dashboard hero/sums but visible (greyed) in the table.

### 5D. `/goals/[id]` + goal CRUD

- `app/(app)/goals/page.tsx` — replace the stub with a real card grid of all goals.
- `app/(app)/goals/[id]/page.tsx` — detail with target/date/contribution, projection chart (simple linear), edit form, delete confirmation.
- `app/api/goals/[id]/route.ts` — `GET`, `PATCH`, `DELETE` (soft via `deletedAt`).
- `app/(app)/goals/new/page.tsx` — explicit "+ New goal" form (currently goals only come from onboarding).
- `Goal.deletedAt` field for soft-delete.

### 5E. `/settings` tabs

Tabs match `FLOWS.md` Section 6 (notifications tab dropped along with the deferred digest):
- **Profile** (`/settings`) — name, age, location, email (read-only).
- **Integrations** (`/settings/integrations`) — list `PlaidItem`s, disconnect button, re-link button, last sync time.
- **Data** (`/settings/data`) — export everything as JSON download, "delete account" confirmation flow.

Files:
- `app/(app)/settings/page.tsx` (replaces stub) — profile form
- `app/(app)/settings/integrations/page.tsx`
- `app/(app)/settings/data/page.tsx`
- `app/api/me/route.ts` — `PATCH` profile, `DELETE` account (cascades all user data).
- `app/api/me/export/route.ts` — `GET` returns full user export JSON.
- `app/api/plaid/item/[id]/route.ts` — `DELETE` disconnect.

### 5F. Polish pass

- **Loading skeletons**: every async card on the dashboard already renders SSR with data, but `/accounts`, `/goals`, `/settings` need skeleton states for slow loads. Use `<Suspense>` with simple skeleton rectangles.
- **Empty states**: `<CardEmptyState>` already centralized in Phase 4. Audit every page-level empty state for consistent voice and at least one CTA when relevant.
- **Error states**: a small `<ErrorBanner>` component surfaced on top of any page where a fetch fails. Consistent dismissable pattern.
- **Copy audit**: re-read every user-visible string against CLAUDE.md voice rules. No em dashes, no semicolons in copy, no exclamation marks, no emoji. Run a final design-auditor subagent before commit.
- **Edit-mode polish**: small "Saving…" pill on the topbar while a `/api/preferences` PATCH is in flight. Currently silent.
- **Sidebar "Recent chats" truncation** when titles are long.

## Decisions confirmed before starting

These are my best guesses. Flag any you want to change before we start 5A.

1. **Insight generation strategy**: tool calling. Claude returns a JSON-schema-validated array of insight objects. Keeps the contract tight and the prompt focused. Fallback to plain-text parsing only if a tool call fails.
2. **Insight refresh cadence**: daily cron, plus a manual "refresh insights" button in the brief header that respects a 30-minute throttle so a panicky user can't blow through Anthropic credits.
3. **Hardcoded triggers in `lib/insights.ts` stay** as a fallback for users whose AI insights are still being generated (first-time, or after a cron failure). They render the same `Brief` shape so the UI doesn't care which source produced them.
4. **Account drawer ships as a full page** in 5C, not a true overlay drawer. True drawer + mobile gestures lands in Phase 6.
5. **Goal soft-delete via `deletedAt`** rather than hard-delete. Insights and history reference goals, and a hard-delete cascade would lose narrative.
6. **Settings is one route, four sub-routes**. Tab-style navigation. Each sub-route is a server-rendered page with its own form and PATCH endpoint.
7. **Cron via Vercel cron** if we deploy there. We add a generic `app/api/cron/*` pattern protected by `CRON_SECRET` so we can switch to a self-hosted scheduler without code changes.
8. **Action handling stays passive in 5B** — clicking "Take action" on an insight sends the user to `/chat?q=...` with a pre-seeded question. No actual write operations to bank accounts ever (CLAUDE.md: read-only access to financial data).
9. **Polish pass uses the design-auditor subagent** before commit to surface anything we missed. Read-only audit, then we act on the punch list.
10. **Weekly digest is deferred indefinitely**. Hooks needed to add it later (Resend integration, opt-in toggle on User.preferences) already exist or are trivial to add when the time comes.

## Working notes

Append findings, deviations from plan, and decisions made during execution under each milestone heading.

### 5A notes
_(empty)_

### 5B notes
_(empty)_

### 5C notes
_(empty)_

### 5D notes
_(empty)_

### 5E notes
_(empty)_

### 5F notes
_(empty)_

### 5G notes
_(empty)_
