# Phase 3 — Ask Beacon (working plan)

Reference document for the Phase 3 build. Status checkboxes get updated as we ship each sub-milestone.

**Source documents**:
- `../../beacon-design/handoff/ROADMAP.md` (acceptance criteria)
- `../../beacon-design/handoff/FLOWS.md` (chat flows + entry points)
- `../../beacon-design/handoff/COMPONENTS.md` (BChatBubble, AskBeaconPanel)
- `../../beacon-design/handoff/API.md` (POST /api/chat contract + system prompt template)
- `../../beacon-design/Beacon Prototype.html` (`ScreenChat` from line 749)

**Acceptance (from ROADMAP)**: a user can ask "What is my net worth?" and get an accurate streamed answer that quotes their real number, with the conversation saved to history and visible in the sidebar.

## Sub-milestones

Each is independently shippable. Commit and push after each.

| #  | Milestone | Acceptance | Status |
|----|-----------|------------|--------|
| 3A | Schema + system prompt builder + Anthropic client | `Conversation`/`Message` tables exist; `buildSystemPrompt(userId)` returns a string with the user's real numbers. | ✅ done |
| 3B | Streaming chat API endpoint | `curl POST /api/chat` streams a Claude response over SSE in under 1s. No persistence yet. | ✅ done |
| 3C | Chat UI (page + message list + composer) | `/chat` renders streamed responses live, message-by-message. No history yet. | ✅ done |
| 3D | Conversation persistence + sidebar history | Sidebar lists recent conversations, clicking one loads it, follow-up turns persist. | ✅ done |
| 3E | AskBar handoff + suggested prompts + polish | `/chat?q=…` auto-sends the prefilled question; empty state shows 4 suggested prompts; conversation gets an auto-title. | ✅ done |

## Database schema additions (`prisma/schema.prisma`)

| Model | Purpose | Added in |
|-------|---------|----------|
| `Conversation` | One per chat thread. `id`, `userId`, `title`, timestamps. Title auto-generated from first user message. | 3A |
| `Message` | One per turn. `conversationId`, `role` (user/assistant/system), `content`, `createdAt`. | 3A |
| `User.conversations` | Reverse relation. | 3A |

Out of scope for Phase 3:
- `Insight` table (Phase 5)
- Tool-call results (`MessageBlock` shape) — saved as plain text now, structured persistence comes with tool calling in Phase 3.5+

## File plan

### 3A. Schema + system prompt + Anthropic client

- `prisma/schema.prisma` — `Conversation` + `Message` models, `User.conversations` reverse relation. Push to Neon.
- `lib/anthropic.ts` — Lazy-init Anthropic SDK client (same shape as `lib/plaid.ts`). Reads `ANTHROPIC_API_KEY` env var.
- `lib/system-prompt.ts` — `buildSystemPrompt(userId): Promise<string>`. Pulls user's first name, accounts (institution + type + balance), holdings (symbol + value), goals (name + target + date), risk tolerance, and `onboardingContext` from the DB and renders the template from `API.md`.
- New dep: `@anthropic-ai/sdk`.
- New env var: `ANTHROPIC_API_KEY`.

### 3B. Streaming chat API endpoint

- `app/api/chat/route.ts` — POST. Body: `{ messages: { role, content }[], conversationId?: string }`. Builds the system prompt fresh per request, calls `anthropic.messages.stream(...)` with `claude-sonnet-4-6`, forwards delta events as Server-Sent Events. Returns `Response` with `text/event-stream` content type. No persistence yet — that lands in 3D.
- Client envelope: `{ type: 'delta'; text: string }` and `{ type: 'done' }` events. Errors as `{ type: 'error'; message: string }`.

### 3C. Chat UI

- `app/(app)/chat/page.tsx` — replace the stub. Reads `?q=` once on mount and seeds the composer (real auto-send lands in 3E).
- `components/chat/ChatMessageList.tsx` — vertical scroll, anchored to bottom on new messages.
- `components/chat/ChatMessage.tsx` — wraps existing `BChatBubble`. Beacon turn shows a streaming caret while the response is still arriving.
- `components/chat/ChatComposer.tsx` — input pill, mirrors `AskBar` shape but at the bottom of the chat view. Shift+Enter inserts newline; Enter sends.
- `components/chat/useChatStream.ts` — client hook. Manages `messages` state, sends to `/api/chat`, consumes SSE, appends streamed text to the in-flight assistant message.

### 3D. Conversation persistence + sidebar history

Backend:
- Update `app/api/chat/route.ts` to (a) `upsert` the conversation on first turn (creates with auto-title from first user message), (b) persist the user message before streaming, (c) persist the assistant message via the stream's `final_message` callback after streaming completes.
- `app/api/chat/conversations/route.ts` — GET list (most recent 20). POST creates an empty conversation (rarely needed; chat usually creates implicitly).
- `app/api/chat/conversations/[id]/route.ts` — GET single (with messages), DELETE.

Frontend:
- `app/(app)/chat/[id]/page.tsx` — loads a specific conversation's messages and renders the same UI as `/chat`.
- `components/chat/RecentChatsList.tsx` — async server component used inside `DSidebar`. Replaces the "Chat arrives in Phase 3" placeholder.
- Update `DSidebar.tsx` to render `<RecentChatsList />` in the recent-chats slot. Each item links to `/chat/[id]`.

### 3E. AskBar handoff + suggested prompts + polish

- Empty state: 4 suggested-prompt chips on `/chat` when there are no messages and no `?q=`. Examples: "What is my net worth?", "Where is my idle cash earning the least?", "Can I afford a $40k car?", "How am I tracking against my goals?". Click a chip → seeds the composer + auto-sends.
- `?q=` handoff: when `/chat` opens with the param, auto-send the question and clear the URL param so refresh doesn't re-send.
- Conversation auto-title: truncate first user message to ~40 chars on creation. (LLM-generated titles are a Phase 3.5 nicety.)
- Streaming UX polish: loading dots before the first delta arrives, error toast on stream failure.

## Decisions confirmed before starting

These are my best guesses. Flag any you want to change before we start 3A.

1. **Model**: `claude-sonnet-4-6`. Fast streaming, plenty smart for finance Q&A. Falling back to Opus would cost more without a meaningful quality bump for these prompts.
2. **Surface**: full `/chat` page inside the dashboard shell (sidebar + topbar visible), not a slide-in panel. Matches `FLOWS.md` "Direct nav".
3. **System prompt rebuild strategy**: rebuilt on every POST from live DB state. No caching. Account balances must reflect the latest sync, not a snapshot.
4. **Conversation history in context**: send the whole `messages` array on every turn (Anthropic stateless). For very long conversations we will trim or summarize, but Phase 3 stays simple.
5. **Tool calling / inline result cards** (charts, account lists rendered inside the assistant turn): deferred to Phase 3.5. Phase 3 ships plain text.
6. **Markdown rendering**: deferred to Phase 3.5. Phase 3 renders responses as plain text with `white-space: pre-wrap`.
7. **Auto-title**: truncated first user message in 3E. AI-generated titles deferred.
8. **Streaming protocol**: SSE with a tiny `{ type, text }` envelope, not raw Anthropic event passthrough. Easier client logic and decouples us from SDK event shape.
9. **Concurrency / rate limiting**: out of scope for Phase 3. Per-user limits land in Phase 7 production hardening.
10. **Conversation deletion / rename UI**: out of scope. The DELETE endpoint exists; the affordance is a Phase 5 polish item.

## Working notes

Append findings, deviations from plan, and decisions made during execution under each milestone heading.

### 3A notes
_(empty)_

### 3B notes
_(empty)_

### 3C notes
_(empty)_

### 3D notes
_(empty)_

### 3E notes
_(empty)_
