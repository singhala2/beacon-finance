# Phase 7 — Production hardening (working plan)

Reference document for the Phase 7 build. Status checkboxes get updated as we ship each sub-milestone.

**Source documents**:
- `../../beacon-design/handoff/ROADMAP.md` (acceptance criteria — Phase 7 bullets)
- `../../beacon-design/handoff/STACK.md` (where each prod dependency lives)

**Acceptance**: Beacon is credibly production-grade from an engineering standpoint. A reviewer poking at headers, auth flows, rate limits, and error handling sees a real app, not a prototype. Real-user launch still requires the items in "Deferred until actual launch" below.

**End-state context**: aiming for a polished school deliverable that *could* become a real product. Phase 7 closes the engineering gaps; the user-driven, lawyer-driven, and multi-week-application gaps are explicitly deferred and called out.

## Sub-milestones

Each is independently shippable. Commit and push after each.

| #  | Milestone | Acceptance | Status |
|----|-----------|------------|--------|
| 7A | Security headers + CSP | `next.config.ts` returns `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` on every response. CSP allows only the origins we actually use (self, Anthropic, Plaid, Sentry, Resend). Verified with `curl -I` against a running dev server. | ✅ done |
| 7B | Audit log | New `AuditLog` Prisma model. `logAudit()` helper in `lib/audit.ts`. Emit events on: signin, signout, Plaid item connect/disconnect, account rename/hide, transaction sync, goal create/delete, settings change, data export, account deletion. Visible in a `/settings/data` read-only table. | ⏳ not started |
| 7C | Rate limiting | `@upstash/ratelimit` + Upstash Redis. Per-IP limits on auth + signin magic link. Per-user limits on Plaid exchange/sync, chat, insights generation, export. 429s render a friendly toast in the UI, not a raw error. | ⏳ not started |
| 7D | Sentry error monitoring | `@sentry/nextjs` wired for server, client, edge runtimes. User id tagged on capture; PII (emails, account numbers, access tokens) scrubbed from breadcrumbs and request bodies. One deliberate test error confirmed visible in the Sentry dashboard. Source-map upload deferred (no `SENTRY_AUTH_TOKEN`). | ⏳ not started |
| 7E | Legal: privacy policy + ToS + clickwrap | See expanded breakdown below. Ships as a single sub-milestone but several files. | ⏳ not started |
| 7F | Prod polish | Cron route authed via `CRON_SECRET` header. Env-var validation at boot (zod schema in `lib/env.ts`, fails fast with a clear message if anything required is missing). Replace stray `console.*` (6 occurrences) with a minimal `lib/logger.ts` wrapper that no-ops in tests and structured-logs in prod. `pnpm build` runs clean. `pnpm exec tsc --noEmit` runs clean. | ⏳ not started |
| 7G | `/.well-known/security.txt` | Static file under `public/.well-known/security.txt` per RFC 9116: contact, preferred languages, expiration. Cheap, expected for fintech. | ⏳ not started |

### 7E breakdown (expanded scope)

| # | Piece | What ships |
|---|---|---|
| 7E1 | Schema | `User.acceptedTermsAt DateTime?`, `User.acceptedTermsVersion String?`. Migration. |
| 7E2 | Content pages | `/privacy` and `/terms` as server-rendered MDX or plain TSX. Privacy enumerates every data flow we actually have: NextAuth/Resend (email auth), Plaid (banking data — what's pulled, what isn't), Anthropic (chat content sent for inference, not used to train), Sentry (error context, scrubbed), Upstash (rate-limit counters only, no PII), Neon (encrypted at rest), Vercel (hosting + logs). Names user rights and points at the export/delete endpoints we already shipped in Phase 5E. Versioned in code (`TERMS_VERSION` constant). Footer disclaimer: **"DRAFT — not yet legally reviewed. Do not rely on for compliance until reviewed by counsel."** |
| 7E3 | Clickwrap | Signin form gets a required checkbox: "I agree to the Terms and Privacy Policy" with inline links. On submit, persist `acceptedTermsAt = now()` and `acceptedTermsVersion = TERMS_VERSION`. Existing-user re-prompt path: if `acceptedTermsVersion` is stale (or null) at next signin, force re-acceptance. |
| 7E4 | Cookie notice | Minimal banner shown to all visitors on first load. "We use cookies for sign-in sessions only — no tracking or ads." Dismiss persists in localStorage. No tracker-blocking logic needed since we don't load any (Posthog is mentioned in roadmap Phase 0 but isn't actually wired). |
| 7E5 | Plaid-required disclosure | Plaid's developer agreement requires a specific end-user disclosure. Pulled from their template, customized to name Beacon, linked from privacy policy and from the bank-connect screen. |
| 7E6 | Footer wiring | Every page in the authed shell + the signin/welcome flow gets a small footer: Privacy · Terms · Contact. |

## Database schema additions (`prisma/schema.prisma`)

| Model / field | Purpose | Added in |
|---|---|---|
| `AuditLog` | id, userId, action (enum-ish string), targetType, targetId, metadata (Json), ip, userAgent, createdAt. Index `(userId, createdAt desc)`. | 7B |
| `User.acceptedTermsAt DateTime?` | Timestamp of last ToS acceptance (clickwrap). | 7E1 |
| `User.acceptedTermsVersion String?` | Version of ToS accepted. Mismatch with current `TERMS_VERSION` re-prompts on next signin. | 7E1 |

## Deferred until actual launch

These do NOT block "production-ready engineering" but DO block "real users can sign up." Flagged explicitly so we don't kid ourselves about what Phase 7 buys.

| Item | What's needed | Why it's deferred |
|---|---|---|
| **Plaid Production access** | Apply via `dashboard.plaid.com`. Real company info, KYC, redirect URIs, sometimes a review call. Days to weeks. Switch is then `PLAID_ENV=production` + prod keys. | Sandbox is the right answer for a school demo. Hooks are already in `lib/plaid.ts` for the env switch. |
| **Verified Resend sending domain** | Add and verify a domain in Resend (DKIM + SPF DNS records). Then set `AUTH_EMAIL_FROM=login@your-domain.com`. | Magic-link emails from `onboarding@resend.dev` will land in spam for any real recipient. Trivial config change once a domain is owned. |
| **Plaid webhooks** | New `/api/plaid/webhook/route.ts` handling `TRANSACTIONS`, `ITEM`, `HOLDINGS` topics. Verify Plaid signature. Re-sync on `DEFAULT_UPDATE`, surface `ITEM_LOGIN_REQUIRED` in UI. | Without webhooks, transactions get stale and item errors are silent. Required for real users; not for a demo where we control all the test data. |
| **Vercel deploy + env vars** | `vercel link`, paste every `.env.local` value into Vercel project settings (mark `ANTHROPIC_API_KEY`, Plaid secret, `ENCRYPTION_KEY`, etc. as encrypted), configure preview + prod environments separately. | Nothing's deployed yet. Whole separate ritual; do once the engineering plan is done. |
| **Source-map upload to Sentry** | Generate `SENTRY_AUTH_TOKEN` in Sentry settings, set env var, the SDK uploads on build. | Prod stack traces show original source instead of minified. Cheap upgrade later. |
| **Backup / DR upgrade** | Move Neon to a paid tier for >7-day PITR. Document restore runbook. | Free tier's 7 days is fine for school. |
| **Uptime monitoring** | UptimeRobot / Better Stack free tier, ping `/api/health` (which we'd add). | One-time setup, do at deploy time. |
| **Lawyer / template-service legal review** | Either pay for Termly / iubenda (~$10-30/mo, generates compliant policies that auto-update) or have a lawyer (school legal clinic?) review the draft. | The 7E draft will be thorough and accurate to actual data flows, but it is NOT legally reviewed text. Must be reviewed before any non-test user signs up. Marked DRAFT in footer until then. |
| **Bug bounty / responsible disclosure program** | HackerOne or self-hosted policy. | Premature. `security.txt` (7G) is enough until there's a real attack surface. |
| **Cyber / E&O insurance** | Business decision. | Premature. |
| **SOC2 prep** | Audit cycle. | Roadmap already marks "(if pursuing)". Not pursuing. |

## Out of scope (forever, not deferred)

- **Weekly email digest** — already deferred indefinitely in Phase 5 plan; not revived.
- **Write operations on bank accounts** — `CLAUDE.md` hard rule. Read-only forever.

## File plan

### 7A. Security headers
- `next.config.ts` — add `async headers()` returning the header set. CSP nonces not needed for now (no inline scripts beyond Next's framework code, which Next handles).
- Manual verification: `curl -I http://localhost:3000` shows the headers.

### 7B. Audit log
- `prisma/schema.prisma` — `AuditLog` model.
- `lib/audit.ts` — `logAudit({ userId, action, targetType?, targetId?, metadata?, req? })`. Helper extracts IP and UA from request.
- Thread `logAudit` calls into existing routes (no logic changes, just instrumentation).
- `app/(app)/settings/data/page.tsx` — append a "Recent activity" section reading the last 50 entries for the current user.

### 7C. Rate limiting
- `pnpm add @upstash/ratelimit @upstash/redis`
- `lib/ratelimit.ts` — exports named limiters: `authLimit` (5/min by IP), `plaidLimit` (10/min by user), `chatLimit` (30/min by user), `insightsGenLimit` (3/hour by user), `exportLimit` (3/day by user).
- Each route imports its limiter and calls `await limit.limit(key)`; on 429 returns a JSON error the client renders as a toast.
- Existing routes touched (no behavior change beyond the check).

### 7D. Sentry
- `pnpm add @sentry/nextjs`
- `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts` (Next 16 pattern).
- `next.config.ts` — wrap export in `withSentryConfig`.
- `lib/sentry-scrub.ts` — `beforeSend` hook that drops `email`, `accessToken`, account numbers, raw Plaid response bodies.
- `lib/auth.ts` — set `Sentry.setUser({ id })` on session callback.
- Test: throw deliberate error from a `/sentry-test` route in dev, confirm it shows up, then delete the route.

### 7E. Legal
- `prisma/schema.prisma` — `User.acceptedTermsAt`, `User.acceptedTermsVersion`.
- `lib/terms.ts` — `TERMS_VERSION = '2026-06-04'` constant.
- `app/(public)/privacy/page.tsx`, `app/(public)/terms/page.tsx` — server-rendered TSX with the full text. DRAFT footer.
- `app/signin/page.tsx` — required checkbox + persistence on submit. Re-prompt on stale version.
- `components/CookieBanner.tsx` — dismissable banner, gated on `localStorage` flag.
- `components/Footer.tsx` — Privacy · Terms · Contact, added to the authed layout and signin/welcome.

### 7F. Prod polish
- `lib/env.ts` — zod schema, called once from `instrumentation.ts` (Next 16 boot hook). Required: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM`, `PLAID_CLIENT_ID`, `PLAID_SECRET`, `ENCRYPTION_KEY` (validated as 64 hex), `ANTHROPIC_API_KEY`, `CRON_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_DSN`.
- `lib/logger.ts` — `log.info` / `log.warn` / `log.error` wrappers. Structured JSON in prod, pretty in dev, no-op in test.
- `app/api/cron/insights/route.ts` — check `req.headers.get('authorization') === \`Bearer \${process.env.CRON_SECRET}\`` first.
- Replace `console.*` (6 sites) with `log.*`.
- `pnpm build` + `tsc --noEmit` must pass.

### 7G. security.txt
- `public/.well-known/security.txt` — `Contact:`, `Expires:`, `Preferred-Languages: en`.

## Per-sub-milestone notes

### 7A notes
CSP built from a structured directives object so additions stay readable. Dev relaxations: `'unsafe-eval'` in `script-src` (Turbopack HMR) and `ws://localhost:*` / `http://localhost:*` in `connect-src`. `upgrade-insecure-requests` disabled in dev (would block HTTP localhost). Sentry ingest hosts (`*.ingest.sentry.io`, `*.ingest.us.sentry.io`) and Plaid (`cdn.plaid.com`, `*.plaid.com`) pre-allowed so 7C/7D don't churn this file. Verified headers on `/welcome`, `/signin`, `/api/me` redirect. **In-browser smoke test still owed** — CSP can silently break things curl won't catch (Plaid Link popup is the highest risk).

### 7B notes
_(empty)_

### 7C notes
_(empty)_

### 7D notes
_(empty)_

### 7E notes
_(empty)_

### 7F notes
_(empty)_

### 7G notes
_(empty)_
