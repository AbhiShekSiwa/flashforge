# Spec: Match Mode

Route: `/sets/:id/match`
File: `src/modes/Match.jsx`
Depends on: `src/utils/shuffle.js`

## Purpose
Click-to-match pairs. Terms on left, definitions on right. Timed.

## Round Setup
- Pick min(8, totalCards) random cards for this round
- Create left column: shuffled terms (each as a tile)
- Create right column: separately shuffled definitions (each as a tile)
- Both columns same height, tiles aligned in rows but not paired visually
- Timer starts at 0:00 and counts up (format: "0:34")

## Tile States
Each tile has one of these states:
- default: `.glass-card text-white` (uses design system glass surface)
- selected: `.glass-card border-2 border-[#7c3aed] text-white` (violet accent border)
- matched: `bg-emerald-900/30 border border-emerald-500/20 text-emerald-400 opacity-50`
- wrong: `bg-red-900/40 border border-red-500 text-red-300` (for 600ms then back to default)

## Interaction Flow
1. User clicks a term tile → it becomes "selected" (left selection)
2. User clicks a definition tile → attempt match:
   a. If this definition belongs to the selected term:
      - Both tiles → "matched" state
      - matchedCount++
      - Slight success animation (scale up then down briefly)
      - Left and right selections cleared
   b. If wrong:
      - Both tiles → "wrong" state for 600ms
      - mistakeCount++
      - Both return to default state
      - Selections cleared
3. User can also click a term tile when another term is already selected
   → deselect old term, select new one (no mistake counted)
4. User can click an already-selected term to deselect it

## Matched Tiles
- Remain visible but greyed/faded — do not remove from layout
- This maintains column alignment

## Round Completion
All pairs matched → stop timer → show results overlay on top of board.

Results overlay content:
- "✅ Round Complete!"
- Time: "Completed in 1:23"
- Mistakes: "X mistakes"
- Star rating:
  - 3 stars ⭐⭐⭐: 0-1 mistakes
  - 2 stars ⭐⭐: 2-4 mistakes
  - 1 star ⭐: 5+ mistakes
- "Next Round" button (new random 8 cards, or +2 if difficulty earned)
- "Back to Set" button

## Difficulty Scaling
- Start: 8 cards per round
- After each round: if mistakes <= 1, next round uses min(totalCards, currentCount + 2) cards
- If mistakes > 1: keep same card count

## markStudied
Call markStudied(setId) after the FIRST round completes (not every round).
Track with a sessionRef: hasMarkedStudied = false → set to true after first completion.