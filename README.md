# Beacon

**An AI-native personal finance copilot.** Connect your accounts, watch your money in one place, ask any question, get advice grounded in the actual numbers.

**Live:** [beacon-finance-orcin.vercel.app](https://beacon-finance-orcin.vercel.app)
**Repo:** [github.com/singhala2/beacon-finance](https://github.com/singhala2/beacon-finance)

---

## The problem

I'm about to graduate, and over the last few months I've spent a lot of conversations with Claude trying to set up the rest of my financial life: Roth IRA vs brokerage, 401(k) contribution rate, which credit card actually rewards the way I spend, when to consolidate accounts, how aggressive my asset allocation should be at 23. Each question was solvable. The cumulative *setup* was the problem: tedious, fragmented, and entirely opaque to anyone who didn't already know what to ask.

That isn't just my experience.

- **56% of US adults can't cover a $1,000 emergency from savings.** ([Bankrate Emergency Savings Survey, 2024](https://www.bankrate.com/banking/savings/emergency-savings-report/))
- **Only 36% of Americans have a written financial plan.** ([Schwab Modern Wealth Survey, 2024](https://www.aboutschwab.com/modernwealth2024))
- **~$24 billion in 401(k) employer match is left unclaimed every year**, averaging ~$1,336 per under-contributing employee. ([Financial Engines / Edelman analysis](https://www.edelmanfinancialengines.com/about-us/news/missing-out-2015/))
- **73% of US adults rank money as a significant source of stress** — the top stressor in the APA's annual report. ([APA Stress in America, 2022](https://www.apa.org/news/press/releases/stress/2022/concerned-future-inflation))

There are good personal-finance products (Mint was the canonical one before Intuit killed it; Monarch and Copilot are the strongest current options). What none of them do well: have a *conversation* with you about *your* numbers, the way a real financial advisor would, but at a price point that works for someone with $30k of net worth instead of $3M.

Beacon is the wedge into that gap: an AI-native finance tool aimed at young Americans who want professional-grade advice without professional-grade cost.

---

## What Beacon does

| Surface | What it gives you |
|---|---|
| **Onboarding** | A 6-step setup: profile, bank connect via Plaid, investment connect, goals, risk tolerance, free-text audit. |
| **Dashboard** | Customizable hero metric (net worth / cash / investable / debt / cash flow) with a Trends sparkline + Breakdown donut composition (Liquid vs Illiquid). Drag-rearrangeable cards for spending, activity, accounts, goals, investments, allocation, debt. |
| **Ask Beacon (chat)** | Streaming chat backed by Claude. The system prompt is built from your live accounts, holdings, goals, spending patterns, income, and recent transactions, so the AI gives answers grounded in *your* numbers, not generic advice. |
| **Beacon's Brief** | AI-generated insights (idle cash, allocation drift, goal-behind, spend spike, savings opportunity, debt) regenerated daily via cron. Each has an evidence trail and a "Take action" link. |
| **/spending, /investments, /accounts, /goals** | Real pages, not stubs: filterable transaction lists, category breakdowns, holdings table by account, per-goal progress chart with contribution suggestions. |
| **/settings** | Profile, integrations (connect / disconnect institutions), data (export everything as JSON, delete account). |

It's read-only on your banking data (it can't move money), TypeScript strict, and gated behind clickwrap acceptance of a Privacy Policy and Terms of Service.

---

## Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript strict
- **Database:** Postgres (Neon serverless), Prisma ORM
- **Auth:** Auth.js v5 (magic-link via Resend), database session strategy
- **Banking data:** Plaid
- **AI:** Anthropic Claude (Sonnet for chat streaming + insight generation)
- **Hosting:** Vercel (cron, auto-deploys on push to `main`)
- **Observability:** Sentry (server + client + edge, with PII scrubbing)
- **Rate limiting:** Upstash Redis + `@upstash/ratelimit`
- **At-rest encryption:** AES-256-GCM for Plaid access tokens

---

## How it was built

The project shipped in phases, each independently deployable. Per-phase planning docs live in [`docs/PHASE_N_PLAN.md`](./docs).

| Phase | Theme | Highlights |
|---|---|---|
| 0 | **Foundations** | Next.js app scaffold, Prisma schema, design tokens, NextAuth magic-link, Vercel preview |
| 1 | **Onboarding** | 6-step flow with state persistence, Plaid connect, goals + risk picker |
| 2 | **Dashboard** | Real metrics from real accounts: net worth, accounts, goals, allocation, activity, cash flow, spending, with skeletons + empty states |
| 3 | **Ask Beacon (chat)** | Streaming SSE backed by Anthropic, conversation persistence, sidebar history, prompt chips |
| 4 | **Customization** | Drag-reorder cards, add / remove via card library, hero metric picker, layout persisted per user |
| 5 | **Insights + polish** | AI-generated insights with dismiss / action affordances, daily cron job, account detail drawer, goal detail pages, settings tabs (profile / integrations / data), polish pass on all states |
| 6 | _Mobile responsive_ | Roadmap (not yet started) |
| 7 | **Production hardening** | Security headers + CSP, audit log, rate limiting, Sentry, env validation, structured logger, legal pages + clickwrap, cookie banner, `/.well-known/security.txt` |

A few capabilities shipped after the formal phase plan as smaller commits: a Trends/Breakdown toggle on the net-worth hero with composition donut, a derived 90-day net-worth history chart, and a manual account type for assets that don't live behind a Plaid connection (private equity, real estate, etc.). All visible in the commit history.

---

## Evaluation & validation

**Build & type integrity**
- TypeScript strict mode across the entire repo, no `any` without justification
- `pnpm build` runs clean in CI on every push to `main` (Vercel)
- `pnpm exec tsc --noEmit` clean before every push

**Boundary verification with curl / scripts**
- Plaid payloads validated end-to-end before shipping each new integration
- Rate limiter burst-tested: 5×302 from auth, 6th = 429 with `X-RateLimit-*` + `Retry-After` headers
- Sentry verified end-to-end: deliberate test error with `SENTRY_DEBUG=1` showed `Captured event` → `Flushing events...` → `Done flushing events`, then visible in the Sentry dashboard
- Security headers verified with `curl -I` on `/welcome`, `/signin`, and `/api/me` redirect

**End-to-end smoke tests**
- Sign-up flow (magic link via Resend) on the live deploy
- Full onboarding including Plaid connect and goal creation
- Disconnect + reconnect to verify cascade-delete behaviour (caught a real bug — orphan accounts were being created when a Plaid item was removed, fixed in `416a0a8`)
- Chat against real account data — confirmed answers were grounded in actual category spend, not generic advice
- /settings/data → export, delete account (GDPR-style data rights work end-to-end)

**Known issues are tracked**, not hidden, in [`docs/KNOWN_ISSUES.md`](./docs/KNOWN_ISSUES.md):
- Stale-terms-version re-prompt: schema + helper exist, UI redirect missing
- Plaid Link refresh race: documented with reproduction steps and proposed fix

---

## How AI was used (disclosure)

Beacon was built in close collaboration with [Claude Code](https://claude.com/claude-code), Anthropic's CLI that runs Claude as a software-engineering partner with file edit, shell, and git access. The development pattern was conversational: I described what I wanted, Claude proposed an implementation plan, I approved or steered, Claude shipped the code, I tested in the browser and gave feedback, we iterated.

**What I did myself:**
- Set the product vision, scope, and roadmap
- Made every product decision (what's in scope, what gets deferred, what the data model should look like)
- Reviewed every commit before pushing
- Did all in-browser testing and reported UX issues back
- Made the explicit calls on tradeoffs (e.g., "draft the legal docs in-house rather than pay for a template service", "skip the email-digest feature", "manual account type instead of waiting for Plaid coverage of alternatives")
- Set up Plaid, Neon, Resend, Upstash, Sentry, Vercel, and GitHub accounts and configured every env var
- Designed the prototype (visual source of truth in `../beacon-design/`) before any code was written

**What Claude did:**
- Wrote the substantial majority of the implementation code
- Wrote the per-phase planning documents based on my direction
- Drafted the Privacy Policy and Terms of Service
- Wrote this README
- Debugged issues I reported and proposed fixes
- Set up the entire backend (Prisma schema, API routes, Plaid integration, NextAuth, Anthropic SDK wiring, rate limiting, Sentry instrumentation)
- Wrote the audit log, env validator, logger, net-worth history derivation, composition donut
- Made small autonomous decisions inside agreed scope (variable names, helper structures, error handling style)

**Other AI involvement:**
- The prototype HTML in `../beacon-design/Beacon Prototype.html` and the design tokens were generated in conversation with Claude before any code was written, then iterated on visually
- All user-facing insights and chat responses come from Anthropic Claude (Sonnet) via the production API at runtime

**No code was copied from a fork.** The repo was bootstrapped with `create-next-app`, then everything else was net new. Every open-source dependency is listed in `package.json` and credited via the standard npm registry.

---

## Repo structure

```
beacon-app/                  ← this Next.js app
├── app/                     ← Next.js App Router pages + API routes
│   ├── (app)/               ← authed app surface (dashboard, accounts, spending, etc.)
│   ├── (auth)/              ← signin, magic-link verify, welcome
│   ├── (public)/            ← privacy, terms
│   └── api/                 ← REST endpoints (Plaid, chat, insights, cron, auth)
├── components/              ← React components grouped by surface
│   ├── dashboard/           ← Hero cards, sidebar, topbar, the customizer
│   ├── onboard/             ← step components for the 6-step flow
│   ├── plaid/               ← PlaidLinkButton, ConnectCard
│   ├── settings/            ← Profile / Integrations / Data panels
│   └── legal/               ← LegalShell, Footer, CookieBanner
├── lib/                     ← server-side modules (db, auth, plaid, anthropic, audit, ratelimit, env, logger, system-prompt, networth)
├── prisma/                  ← schema.prisma (single source of truth for the DB)
├── docs/                    ← phase plan docs + KNOWN_ISSUES
└── public/                  ← static assets including /.well-known/security.txt

../beacon-design/            ← design source of truth (prototype HTML, tokens, screens)
```

The two sibling directories live under `/Beacon/` because the design pre-dated the code. The git repo is the `beacon-app/` subtree.

---

## Running locally

```bash
git clone https://github.com/singhala2/beacon-finance.git
cd beacon-finance
pnpm install
cp .env.example .env.local      # fill in DATABASE_URL, AUTH_SECRET, AUTH_RESEND_KEY,
                                #   PLAID_CLIENT_ID, PLAID_SECRET, ENCRYPTION_KEY,
                                #   ANTHROPIC_API_KEY, CRON_SECRET, plus optional
                                #   UPSTASH_REDIS_REST_*, SENTRY_*
pnpm db:push                    # apply schema to your Postgres
pnpm dev                        # http://localhost:3000
```

`pnpm db:push` syncs Prisma schema additively (the project uses `db:push`, not migrations — a future cleanup is to switch to versioned migrations before the next major schema change).

---

## Major decisions

A few decisions worth surfacing for anyone reading:

1. **Draft legal documents.** The Privacy Policy and Terms of Service in `app/(public)/{privacy,terms}/page.tsx` accurately enumerate every data flow and carry a clear DRAFT watermark. They will be replaced with a paid template service (Termly / iubenda) or lawyer-reviewed copy before scaled rollout.
2. **Net worth history is derived from transactions**, not stored snapshots. The history chart walks backwards from the current snapshot, undoing each day's transactions. Holdings values and loan balances are held flat (price-history and amortization aren't tracked yet). Visually accurate over a 90-day window for accounts whose movement is transaction-driven.
3. **`db:push` instead of Prisma migrations.** Faster for solo iteration; needs to switch to versioned migrations before the next breaking schema change.
4. **`Sentry.setUser({ id })` on session callback**, not on every request. Means the user-id tagging on Sentry events is per-AsyncLocalStorage scope. PII (emails, access tokens, account numbers) is scrubbed via a `beforeSend` hook in `lib/sentry-scrub.ts` so it never leaves the server.

---

## Roadmap

- **Mobile responsive** pass across every screen (Phase 6, planned next).
- **Plaid webhooks** so we react to `ITEM_LOGIN_REQUIRED`, transaction updates, and item errors instead of polling.
- **Backup & DR upgrade** beyond Neon's free-tier 7-day PITR.
- **Source-map upload to Sentry** for symbolicated prod stack traces.
- **Verified email sending domain** so magic-link emails reliably land in the primary inbox.
- **Net-worth time series snapshots** persisted to the DB so the history chart isn't derived, and so it can extend past 90 days and account for holding-price movement.
- **Manual transactions** so users can add cash spending that Plaid wouldn't see.
- **Native iOS/Android** via React Native sharing the component library.

---

## Credits

- Built by Anant Singhal
- AI pair-programmer: [Claude Code](https://claude.com/claude-code) by Anthropic (Claude Opus 4.7)
- Banking data: [Plaid](https://plaid.com)
- AI inference: [Anthropic Claude](https://www.anthropic.com) (Sonnet)
- Hosting: [Vercel](https://vercel.com)
- Database: [Neon](https://neon.tech)
- Auth: [Resend](https://resend.com) + [Auth.js](https://authjs.dev)
- Error monitoring: [Sentry](https://sentry.io)
- Rate limiting: [Upstash](https://upstash.com)
