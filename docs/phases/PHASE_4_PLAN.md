# Phase 4 — Customization (working plan)

Reference document for the Phase 4 build. Status checkboxes get updated as we ship each sub-milestone.

**Source documents**:
- `../../beacon-design/handoff/ROADMAP.md` (acceptance criteria)
- `../../beacon-design/handoff/FLOWS.md` (customize / edit mode / Card Library / Hero Picker)
- `../../beacon-design/handoff/COMPONENTS.md` (`<HeroPickerModal />`, `<CardLibraryModal />`)
- `../../beacon-design/handoff/API.md` (`GET / PATCH /api/preferences`, `DashboardLayout` shape)
- `../../beacon-design/Beacon Prototype.html` lines 555–707 (`ScreenDashboard` editing variant), 912–981 (`ScreenHeroPicker`), 984+ (`ScreenCardLibrary`)

**Acceptance (from ROADMAP)**: a user can rearrange, add, and remove cards, change the hero metric, and the layout persists across reloads and devices.

## Sub-milestones

Each is independently shippable. Commit and push after each.

| #  | Milestone | Acceptance | Status |
|----|-----------|------------|--------|
| 4A | Schema + preferences API + edit-mode toggle | Customize button in topbar enters/exits edit mode; layout shape stored in DB with default seed; reload preserves the toggle on the URL. | ✅ done |
| 4B | Drag-to-reorder + remove (×) per card | User drags cards into new positions, hits × to remove, layout persists to `/api/preferences` on each change. | ✅ done |
| 4C | Card Library modal (add cards) | "+ Add card" button opens a modal grouped by category; click → appends to layout. Library lists only cards we have a real implementation for; placeholders for future cards are clearly labeled. | ✅ done |
| 4D | Hero picker modal | Hero card click in edit mode opens a picker; user can switch between 5 hero variants (net worth, cash, investable, debt, monthly cash flow); selection persists. | ✅ done |
| 4E | Polish + restore + empty state | Layout fully restores on reload; empty-grid state when all cards removed; saving spinner; default-reset affordance. | ✅ done |

## Database schema additions (`prisma/schema.prisma`)

| Field | Purpose | Added in |
|-------|---------|----------|
| `User.dashboardLayout Json?` | Stores the user's customized layout. `null` means use the default. | 4A |

Layout shape (TypeScript):

```ts
type DashboardLayout = {
  hero: 'networth' | 'cash' | 'investable' | 'debt' | 'cashflow';
  cards: { id: CardId; size: 3 | 4 | 6 | 12 }[];
};

type CardId =
  | 'cashflow' | 'spending' | 'activity'         // 2D
  | 'accounts' | 'goals' | 'investments'         // 2B
  | 'allocation' | 'debt'                        // 2B
  | 'brief';                                     // 2E
```

Out of scope for Phase 4:
- A separate `Preferences` table — too much abstraction for one JSON field. Extract later if we add notification or theme prefs.
- Server-side validation of card ids against existing components (we will validate at PATCH time but won't fail the dashboard render if a stale id sneaks through — the renderer just skips it).

## File plan

### 4A. Schema + preferences API + edit-mode toggle

- `prisma/schema.prisma` — add `dashboardLayout Json?` on `User`. Push to Neon.
- `lib/dashboard-layout.ts` — `DEFAULT_LAYOUT`, `DashboardLayout` type, `mergeLayout(custom)` helper that fills in missing fields with the default.
- `app/api/preferences/route.ts` — `GET` returns the user's layout (or default), `PATCH` writes a new layout after Zod validation.
- `app/(app)/page.tsx` — reads `user.dashboardLayout`, merges with default, drives the card grid order. The hero and card components stay the same; the page becomes a renderer over the layout.
- `components/dashboard/DTopbar.tsx` — wire the existing (currently disabled) Customize button to toggle `?edit=1` on the URL via `useRouter().push`.
- Edit mode is purely URL state for 4A. Visuals (mint borders, drag handles, × buttons) get added in 4B–4D under an `editing` boolean read from `useSearchParams`.
- Edit-mode banner from prototype line 595–617 ("Editing your home. Drag to reorder…") above the hero in 4A.

### 4B. Drag-to-reorder + remove

- New deps: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
- `components/dashboard/EditableGrid.tsx` — wraps the card grid in `<DndContext>` + `<SortableContext>`. Each child becomes a `<SortableCard />` with a drag handle that's only visible when editing.
- `components/dashboard/SortableCard.tsx` — wraps any card in a draggable container. Renders a × close button in the top-right when editing.
- `components/dashboard/useLayoutPersistence.ts` — debounced `PATCH /api/preferences` so rapid drag/remove operations don't spam the server. Optimistic UI: update local state immediately, server in the background.
- The hero card stays outside the `SortableContext` for now — it's a single anchor with its own picker (4D), not a draggable peer.

### 4C. Card Library modal

- `components/dashboard/CardLibraryModal.tsx` — full-screen modal with backdrop, grouped grid of available cards. Categories pulled from prototype lines 985–1004 ("Money in/out", "Wealth", "Goals & plan").
- Each library item shows: name, description, mini preview glyph (matches prototype). Click → appends card to layout, closes modal.
- Library only lists cards we actually have. The other prototype entries (`subs`, `paycheck`, `runway`, `savings_rate`, `milestones`, `scenarios`) appear in a "Coming later" section that's visually muted and not clickable — keeps the menu honest.
- Show "Already on your dashboard" badge on cards already in layout (still clickable to insert another instance? — phase 4 says no, single instance per id only).

### 4D. Hero picker modal

- 5 hero variants:
  - `networth` — what we have today
  - `cash` — sum of depository balances
  - `investable` — sum of holdings `currentValue`
  - `debt` — sum of credit balances (warn-colored)
  - `cashflow` — current-month income minus expenses
- `components/dashboard/HeroPickerModal.tsx` — visual picker with mini preview per option (matches prototype lines 939–976).
- Each hero variant gets its own component file: `NetWorthHero` (existing), `CashOnHandHero`, `InvestableAssetsHero`, `DebtTotalHero`, `MonthlyCashFlowHero`. All ≤80 LOC each since they reuse the same shell.
- `components/dashboard/Hero.tsx` — small switcher that renders the right variant based on `layout.hero`.
- In edit mode, clicking the hero opens the picker. Outside edit mode, click is a no-op.

### 4E. Polish + restore + empty state

- Empty layout state (`cards.length === 0`): centered "Your dashboard is empty" with a "+ Add card" CTA opening the library.
- Saving indicator on the topbar while a `/api/preferences` PATCH is in flight (small spinner pill next to "Synced").
- "Reset to default" affordance inside the edit-mode banner.
- Restoring across devices: confirm `mergeLayout` correctly handles a layout from a different device that references a card id we no longer have (we drop unknown ids silently rather than crash).
- Customize button label flips to "✓ Done" when in edit mode (matches prototype).
- Confirm sidebar / topbar don't shift when the editing banner appears.

## Decisions confirmed before starting

These are my best guesses. Flag any you want to change before we start 4A.

1. **Persistence**: a single `User.dashboardLayout` JSON column instead of a separate `Preferences` table. One row to migrate later if we add other prefs (theme, notifications). Saves a join.
2. **Edit mode lives in the URL** (`?edit=1`) so refreshes preserve it and deep links to "edit my dashboard" work. Internal state would be simpler but loses on refresh.
3. **Drag library**: `@dnd-kit` over `react-beautiful-rbd` because the latter is unmaintained and `dnd-kit` is the community's current choice. Smaller too.
4. **Single instance per card id** in the layout. No two CashFlow cards. Simplifies state and matches every dashboard product I've seen.
5. **Hero stays outside the sortable grid**. It's the anchor of the page; dragging it as a peer is awkward UX. This matches the prototype.
6. **5 hero variants in 4D**, not the 2 the prototype shows. ROADMAP names 5; we have the data for all of them today.
7. **Optimistic save**, debounced ~500ms. Drag → drop → instant local update, server PATCH happens shortly after. Failure shows a toast and re-fetches the persisted layout to recover.
8. **Cards we don't have yet** (`subs`, `paycheck`, `runway`, `savings_rate`, `milestones`, `scenarios`) are listed as "Coming later" in the library, not built in this phase. Each is its own future card.
9. **The Beacon's Brief row** above the grid is not customizable. It stays as-is. Customizing the brief is Phase 5 polish (or never).
10. **AskBar** stays above the grid as well — also not customizable. It is the entry point to chat, not a card.

## Working notes

Append findings, deviations from plan, and decisions made during execution under each milestone heading.

### 4A notes
_(empty)_

### 4B notes
_(empty)_

### 4C notes
_(empty)_

### 4D notes
_(empty)_

### 4E notes
_(empty)_
