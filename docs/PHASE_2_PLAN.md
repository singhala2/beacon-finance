# Phase 2 — Dashboard (working plan)

Reference document for the Phase 2 build. Status checkboxes get updated as we ship each sub-milestone.

**Source documents**:
- `../../beacon-design/handoff/ROADMAP.md` (acceptance criteria)
- `../../beacon-design/handoff/FLOWS.md` (dashboard flows + customize/edit mode)
- `../../beacon-design/handoff/COMPONENTS.md` (card inventory)
- `../../beacon-design/handoff/API.md` (metrics endpoints contract)
- `../../beacon-design/Beacon Prototype.html` lines 555–707 (`ScreenDashboard`) — visual source of truth

**Acceptance (from ROADMAP)**: a user with linked accounts sees a fully populated dashboard with real numbers from their connected Plaid accounts.

## Open question: prototype vs. ROADMAP delta

The ROADMAP and the prototype list different dashboard cards. We follow the prototype (per CLAUDE.md source-of-truth precedence), with one caveat — the prototype shows several cards that need transaction data (cash flow, spending by category, subscriptions, runway) which we don't yet pull from Plaid. The plan therefore splits the work into "static data" cards (work today with what's in the DB) and "transaction-powered" cards (require a new Plaid transactions sync).

## Sub-milestones

Each is independently shippable. Commit and push after each.

| #  | Milestone | Acceptance | Status |
|----|-----------|------------|--------|
| 2A | Dashboard shell — sidebar, topbar, greeting, route group | Signed-in user with completed onboarding lands on a real dashboard frame. Cards are placeholder skeletons. | ✅ done |
| 2B | Static-data cards — Hero (net worth), Accounts, Goals, Investments, Allocation, Debt | Each card renders real numbers computed from existing DB tables. Empty + loading states wired. | not started |
| 2C | Plaid transactions sync — schema + sync route + first-load trigger | New `Transaction` rows persisted for all `PlaidItem`s, scoped to last 90 days. | not started |
| 2D | Transaction-powered cards — CashFlow, Activity, Spending | Cards show real income/expense, last 5 transactions, category breakdown. | not started |
| 2E | Beacon's Brief + AskBar + polish — hardcoded insights, chat entry-point, skeletons, empty states | Brief shows 3 data-driven insights. AskBar input routes to `/chat` placeholder (real chat in Phase 3). | not started |

Sub-cards from the prototype that do **not** ship in Phase 2: `SubsCard` (recurring-charge detection) and `RunwayCard` (months-of-runway calculation) — both deferred to Phase 5 polish. The card grid shows "+ Add card" placeholders for them in customize mode (Phase 4).

## Database schema additions (`prisma/schema.prisma`)

| Model | Purpose | Added in |
|-------|---------|----------|
| `Transaction` | One row per Plaid transaction. Indexed on `(userId, date)` for the cash-flow + activity queries. | 2C |
| `PlaidItem.cursor` | Already in schema. Used by 2C to incrementally sync via `/transactions/sync`. | 2C |

Deferred to later phases:
- `NetWorthSnapshot` (daily snapshot for hero sparkline history) — Phase 5 polish. For Phase 2 the hero sparkline shows a flat line at current value with copy "history will fill in as Beacon watches your accounts."
- `Insight` (AI-generated insights) — Phase 5. Brief uses hardcoded triggers off real data for now.

## File plan

### 2A. Dashboard shell

- `app/(app)/layout.tsx` — auth-required server layout. Loads user; if onboarding incomplete, redirect to `/onboard/[step]`.
- `app/page.tsx` (modify) — replace post-onboarding placeholder with `<Dashboard />`.
- `components/dashboard/DSidebar.tsx` — collapsible left rail. Beacon logo, nav items (Home active, Goals, Accounts, Settings — non-Home stubbed for now), "+ New chat" button at top.
- `components/dashboard/DTopbar.tsx` — "Home" eyebrow, sync status pill ("Synced N min ago · K accounts"), "Customize" button (no-op until Phase 4).
- `components/dashboard/Greeting.tsx` — time-of-day greeting (`Good morning/afternoon/evening, [firstName]`) + date line.
- `components/dashboard/Dashboard.tsx` — composes sidebar + topbar + greeting + card grid skeleton.
- `lib/dashboard.ts` — small helpers (greeting copy, sync-time formatter).

### 2B. Static-data cards

API:
- `app/api/metrics/networth/route.ts` — returns `{ current, accountCount, debtTotal, currency }`. No history yet.
- `app/api/metrics/allocation/route.ts` — sums `Holding.currentValue` by `type`, returns `{ stocks, bonds, cash, crypto, other }` as fractions.
- `app/api/accounts/route.ts` — list of connected `FinancialAccount` rows shaped for the card.

Components (each with default + loading skeleton + empty states):
- `components/dashboard/NetWorthHero.tsx` — large mono number, delta hidden in 2B (no history), 1M/3M/1Y/All tabs visually present but disabled, flat sparkline placeholder, AI summary line drawn from real numbers.
- `components/dashboard/AccountsCard.tsx` — top 4 accounts by balance, mini sparkline per row deferred (no history).
- `components/dashboard/GoalsCard.tsx` — top 2 goals; progress bar reads from `targetAmount` vs. inferred `currentAmount` (sum of linked accounts; for now just `0 / target` since linkage is Phase 5).
- `components/dashboard/InvestmentsCard.tsx` — top holdings by value, total portfolio value at top.
- `components/dashboard/AllocationCard.tsx` — donut chart from `/api/metrics/allocation`. Inline SVG, no chart library.
- `components/dashboard/DebtCard.tsx` — sum of credit-account balances, list of credit cards.

### 2C. Plaid transactions sync

Schema migration:
- `Transaction` model — id, userId, plaidTransactionId (unique), accountId, date, amount, currency, name, merchantName, category, pending, createdAt, updatedAt.

Backend:
- `lib/transactions.ts` — sync helper. Uses Plaid `/transactions/sync` with the per-`PlaidItem` cursor for incremental updates.
- `app/api/plaid/sync/route.ts` — POST. For the current user, iterates over `PlaidItem`s and calls the sync helper. Returns counts.
- Update `app/api/plaid/exchange/route.ts` — kick off an initial sync after the first exchange, fire-and-forget.
- Dashboard server component triggers a background sync (await `fetch(/api/plaid/sync)` w/ short timeout) on first load if no transactions yet.

### 2D. Transaction-powered cards

API:
- `app/api/metrics/cashflow/route.ts` — current month + prior month, returns `{ income, expenses, net, byCategory[] }`.
- `app/api/transactions/route.ts` — list with optional `?limit=N` and `?accountId=`.

Components:
- `components/dashboard/CashFlowCard.tsx` — money-in vs. money-out for current month, comparison to last month.
- `components/dashboard/ActivityCard.tsx` — last 5 transactions, "View all" link to `/accounts` (stubbed in 2A).
- `components/dashboard/SpendingCard.tsx` — top 5 categories this month vs. last month, horizontal bars (matches prototype `SpendByCategoryMini`).

### 2E. Brief + AskBar + polish

- `components/dashboard/BeaconsBrief.tsx` — 3 cards. Hardcoded *triggers* off real data (examples: "Cash > $5k in a low-APY account → suggest HYSA", "401k match observed → suggest contribution bump", "Roth IRA window if April"). Copy is templated, numbers are real.
- `components/dashboard/AskBar.tsx` — chat input pill matching prototype's `AskBar`. Submit routes to `/chat?q=...`.
- `app/chat/page.tsx` — placeholder page. "Chat arrives in Phase 3." Real chat lands then.
- Skeleton + empty + error states audited across every card.

## Decisions confirmed before starting

These are my best guesses. Flag any you want to change before we start 2A.

1. **Hero sparkline history**: defer until Phase 5 polish. Hero shows the current value + a flat sparkline placeholder with copy. Real history needs daily snapshots, which is a cron job and not Phase 2 work.
2. **Insights**: hardcoded triggers off real data in 2E. Real AI-generated insights are Phase 5 (per ROADMAP).
3. **Transactions sync trigger**: fire on dashboard first load if `Transaction` table is empty for the user, plus fire-and-forget in `/api/plaid/exchange` after a successful connect. Background cron for periodic refresh is Phase 7.
4. **Customize mode (drag, add/remove card, hero picker)**: out of scope. Customize button visible but no-op. Lands in Phase 4.
5. **Sub navigation routes (`/accounts`, `/goals`, `/settings`)**: each gets a stub page in 2A so the sidebar links don't 404. Real implementations land in Phase 5.
6. **AskBar in 2E**: chat is Phase 3. AskBar is visible and functional as an input but submit just navigates to `/chat?q=...`. The Phase 3 work picks up that pre-filled question.
7. **Holdings `currentValue` staleness**: holdings only refresh when we re-call `investmentsHoldingsGet`. The transactions sync (2C) does **not** refresh holdings. We will refresh holdings on dashboard load alongside the transaction sync.
8. **Allocation buckets**: matches the `Holding.type` enum we already have (`equity | etf | mutual_fund | crypto | bond | cash | other`). Donut groups `equity + etf + mutual_fund` as "stocks" for display.

## Working notes

Append findings, deviations from plan, and decisions made during execution under each milestone heading.

### 2A notes
_(empty)_

### 2B notes
_(empty)_

### 2C notes
_(empty)_

### 2D notes
_(empty)_

### 2E notes
_(empty)_
