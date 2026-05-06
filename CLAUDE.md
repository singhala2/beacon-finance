# Claude Code — Project Instructions

You are helping build **Beacon**, an AI-native personal finance copilot, from a complete prototype.

## Read these first, every session

1. `handoff/SPEC.md` — what we're building
2. `handoff/DESIGN_SYSTEM.md` — visual tokens and voice
3. `handoff/FLOWS.md` — user flows
4. `handoff/COMPONENTS.md` — component inventory
5. `handoff/API.md` — backend contracts
6. `handoff/ROADMAP.md` — phased plan
7. `handoff/STACK.md` — tech stack
8. `Beacon Prototype.html` — runnable visual source of truth

## Source of truth precedence

1. **The prototype HTML** (`Beacon Prototype.html`) — for exact visual fidelity, animations, copy
2. **Design system tokens** (`tokens.js`) — for any color/spacing/type values
3. **The handoff docs** — for intent, flows, API contracts
4. **Your own judgment** — only when above three are silent

When in doubt, match the prototype pixel-for-pixel.

## Hard rules (do not violate)

- **No em dashes (—) anywhere in user-visible copy.** Use periods, commas, or colons.
- **No semicolons in copy.** Break into separate sentences.
- **No exclamation marks** unless genuinely celebratory (rare).
- **No emoji** in UI unless explicitly requested.
- **No new colors.** Use only tokens from `tokens.js`. Extend the token set if you must, never inline new oklch values.
- **No new font families.** Geist + Geist Mono only.
- **TypeScript strict mode**, no `any` without justification.
- **No mock data in production code paths.** If a backend isn't ready, gate behind `if (env.NODE_ENV === 'development')`.
- **Read-only access** to financial data. No write operations to bank accounts.

## Voice

Beacon talks like a smart friend who is also a CFA. Conversational, precise, calm. Second person. Numbers are quoted exactly when relevant.

Examples:
- ✅ "Your portfolio is up 1.2% this month. Here is what changed."
- ❌ "Your portfolio is up — let's dig in!"

## When implementing

1. State the phase + task you are working on (from `ROADMAP.md`)
2. List the files you will create or change
3. Implement
4. Add a brief test or manual-verification note

## When unsure

Ask. Especially about:
- Whether to use real Plaid Sandbox or mock data
- Whether a behavior in the prototype is intentional or a holdover
- Where a new component belongs in the folder structure

Do not silently invent shape, copy, or visual treatment. Match the prototype, or ask.
