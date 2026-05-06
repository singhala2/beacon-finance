# Phase 1 — Onboarding (working plan)

Reference document for the Phase 1 build. Status checkboxes get updated as we ship each sub-milestone.

**Source documents**:
- `../../beacon-design/handoff/ROADMAP.md` (acceptance criteria)
- `../../beacon-design/handoff/FLOWS.md` (user flow per step)
- `../../beacon-design/handoff/COMPONENTS.md` (component inventory)
- `../../beacon-design/handoff/API.md` (backend contracts)
- `../../beacon-design/Beacon Prototype.html` (visual source of truth)
- `../../beacon-design/Beacon Onboarding.html` (full onboarding canvas)

**Acceptance (from ROADMAP)**: a new user can sign up, link a Plaid Sandbox bank account, set goals, and land on the dashboard with their real connected data.

## Sub-milestones

Each is independently shippable. Commit and push after each.

| #  | Milestone | Acceptance | Status |
|----|-----------|------------|--------|
| 1A | UI primitives port + `/welcome` showcase | Welcome page matches prototype pixel-for-pixel. No backend. | not started |
| 1B | Auth flow (sign-in, magic link, session) | "Get started" routes to `/signin`, real Resend magic link delivers, click lands in authed session. | not started |
| 1C | Onboarding shell + Step 1 (Profile) | `/onboard/1` renders DScreen layout, profile form persists to DB, back preserves state. | not started |
| 1D | Plaid integration (Steps 2 + 3) | Real Plaid Sandbox connect, accounts and holdings stored in DB. | not started |
| 1E | Steps 4-6 (Goals, Risk, Audit) + dashboard handoff | Goals saved, risk recorded, audit free-text saved, redirect to `/`. | not started |

## Database schema additions (`prisma/schema.prisma`)

| Model | Purpose | Added in |
|-------|---------|----------|
| `User` (extend) | `firstName`, `age`, `location`, `riskTolerance`, `onboardingStep`, `onboardingContext` | 1C |
| `PlaidItem` | One per institution-link. Encrypted access token. | 1D |
| `Account` | Financial account (depository, credit, investment). Linked to PlaidItem. | 1D |
| `Holding` | Per-symbol position inside an investment account. | 1D |
| `Goal` | name, type, targetAmount, targetDate, monthlyContribution | 1E |

## File plan

### 1A. Primitives + welcome (no backend)

UI primitives, ported from `beacon-design/ui-primitives.jsx` to TypeScript, one component per file:

- `components/ui/BeaconLogo.tsx`
- `components/ui/BBtn.tsx`
- `components/ui/BInput.tsx`
- `components/ui/BCard.tsx`
- `components/ui/BChip.tsx`
- `components/ui/BProgressBar.tsx`
- `components/ui/Sparkline.tsx`
- `components/ui/Icon.tsx` (the `Ico` set, exported as named exports)
- `components/ui/index.ts` (barrel)

Welcome:
- `app/(auth)/welcome/page.tsx` — Welcome two-pane with auto-rotating feature showcase
- `components/welcome/Showcase.tsx` — right-side rotating feature panel (4 slides, 4.5s)
- `app/(auth)/layout.tsx` — gate-free shell for logged-out routes
- `app/page.tsx` (modify) — replace Phase 0 placeholder with redirect logic. If not authed, go to `/welcome`. If authed but onboarding incomplete, go to `/onboard/[step]`. Else stay.

### 1B. Auth flow

- `app/(auth)/signin/page.tsx` — email input, sends magic link via `signIn('resend')`
- `app/(auth)/signin/verify/page.tsx` — "check your email" confirmation
- `lib/auth.ts` (modify) — wire callbacks so post-signin routes to `/onboard/[step]` if onboarding incomplete, else `/`
- `middleware.ts` — gate everything except `/welcome`, `/signin`, `/api/auth/*`

### 1C. Onboarding shell + Profile (Step 1)

- `app/(app)/onboard/layout.tsx` — auth-required wrapper
- `app/(app)/onboard/[step]/page.tsx` — server component, reads current step + user state, renders the matching step
- `components/onboard/DScreen.tsx` — two-pane layout: brand, step indicator, back chevron, screen-specific copy on left. Form on right.
- `components/onboard/StepIndicator.tsx` — "1 of 7" with mint progress
- `components/onboard/ProfileStep.tsx` — Step 1 form: firstName required, age + location optional
- `app/api/onboard/route.ts` — `PATCH` with step number + payload. Zod validation. Updates user, returns next step.
- `lib/onboard.ts` — pure helpers: `nextStep(currentStep)`, `getStepFromUser(user)`
- Migration: add onboarding fields to `User`

### 1D. Plaid integration (Steps 2 + 3)

Backend:
- `lib/plaid.ts` — Plaid client wrapper, env-gated
- `lib/encryption.ts` — AES-256-GCM helpers for access-token encryption
- `app/api/plaid/link-token/route.ts` — POST returns Plaid Link token
- `app/api/plaid/exchange/route.ts` — POST exchanges public_token, fetches accounts and holdings, persists, returns shaped data
- Migration: PlaidItem, Account, Holding models

Frontend:
- `components/onboard/ConnectBankStep.tsx` — Step 2, Plaid-primary card + manual link, shows pulled accounts after connect
- `components/onboard/InvestmentsStep.tsx` — Step 3, same pattern targeting investment products
- `components/plaid/PlaidLinkButton.tsx` — wraps `react-plaid-link`, opens Plaid Link, calls `/api/plaid/exchange` on success

New deps: `plaid`, `react-plaid-link`, `zod`.

New env vars: `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV=sandbox`, `ENCRYPTION_KEY`.

### 1E. Steps 4-6 + handoff

- `components/onboard/GoalsStep.tsx` — Step 4. Goal-template picker (Emergency, House, Retirement, Debt, Travel, Custom). 1-3 selectable, per-goal target + date.
- `components/onboard/RiskStep.tsx` — Step 5. 5-point segmented scale with descriptions.
- `components/onboard/AuditStep.tsx` — Step 6. Summary cards + free-text "Anything Beacon should know?". CTA: "Take me to my dashboard".
- `app/api/goals/route.ts` — POST creates goals. Just enough for onboarding to save them. Full CRUD lands in Phase 5.
- `app/(app)/page.tsx` — minimal authed landing page. "Welcome to Beacon, [name]. Dashboard arriving in Phase 2."

## Decisions confirmed before starting

These were confirmed in the planning conversation. Update if any changes.

1. **Plaid Sandbox credentials**: needed before 1D. Sign up at https://dashboard.plaid.com/signup, grab `client_id` and sandbox secret. Defer until 1D.
2. **Resend account**: needed before 1B. Free tier is fine for dev. https://resend.com.
3. **Auth-then-onboarding flow**: `/welcome` "Get started" goes to `/signin`, magic link lands on `/onboard/1`, Step 1 collects name and other profile fields. Email comes from the auth session.
4. **Manual account add (Step 2)**: deferred. Link visible but disabled with "coming soon" tooltip in 1D.
5. **Plaid token encryption**: AES-256-GCM with `ENCRYPTION_KEY` env var, generated when we start 1D.
6. **"Sign in" vs "Get started"**: both route to `/signin`. Magic link is unified for new and returning users.

## Working notes

Append findings, deviations from plan, and decisions made during execution under each milestone heading.

### 1A notes
_(empty)_

### 1B notes
_(empty)_

### 1C notes
_(empty)_

### 1D notes
_(empty)_

### 1E notes
_(empty)_
