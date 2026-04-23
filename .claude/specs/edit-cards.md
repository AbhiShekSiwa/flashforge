# Edit Cards Mode — Spec

## Purpose
Allows users to add, edit, and delete individual cards within a set from a dedicated page.

## Route
`/sets/:id/edit-cards` → `src/pages/EditCardsPage.jsx`

## Entry Point
SetDetail page has an "✏️ Edit Cards" button below the metadata line that navigates to this route.

## File Locations
- Page component: `src/pages/EditCardsPage.jsx`
- Route registered in: `src/App.jsx`
- `updateCards()` function added to: `src/hooks/useSets.js`
- `.card-textarea` CSS utility added to: `src/index.css`

## State Managed
- `cards` — local copy of the set's cards array (initialized from `set.cards` on mount)
- `hasUnsavedChanges` — boolean tracking whether local state differs from persisted data

## Data Flow
1. On mount: copy `set.cards` into local `cards` state
2. Add / edit / delete mutate local `cards` only
3. "Save Changes" calls `useSets.updateCards(setId, cards)` then navigates back
4. Back without saving: `window.confirm()` guard if `hasUnsavedChanges`

## useSets.updateCards behavior
- Replaces the set's `cards` array with the new array
- Rebuilds `srData` by matching cards via exact `term + definition` string match to preserve SR progress
- New or unmatched cards get default srData: `{ interval:1, easeFactor:2.5, repetitions:0, nextReview: today, lastRating: null }`
- Updates `lastStudied` timestamp

## UI Notes
- Each card row: card number (muted) | term textarea | definition textarea | 🗑 delete button
- Textareas use `.card-textarea` (field-sizing: content auto-resize) with blue border on focus
- "＋ Add Card" top-right, "Save Changes" full-width bottom
- Empty state message: "No cards. Add one above ↑"
- Delete is single-click, no confirm modal (easy to re-add)

## Gotchas
- `key={i}` on card rows — index-based keys work here because we control all mutations explicitly in local state; no drag-to-reorder
- `updateCards` does NOT call `spacedRepetition.js` — it only preserves existing srData by index remapping
