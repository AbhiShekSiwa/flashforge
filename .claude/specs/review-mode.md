# Spec: Review Mode (Spaced Repetition)

Route: `/sets/:id/review`
File: `src/modes/Review.jsx`
Depends on: `src/utils/spacedRepetition.js`

## Purpose
Show only cards that are due for spaced repetition review today.
User self-rates difficulty, which updates the next review interval.

## Session Initialization
- Load set from useSets()
- Call getCardsForReview(set) → array of { card, cardIndex }
- If array is empty → show "All caught up" screen immediately
- Shuffle the due cards for this session

## All Caught Up Screen
Shown when no cards are due.
Content:
- "✅ You're all caught up!"
- "Next card due: [date of earliest nextReview across all cards]"
  Format: "Tomorrow" / "in 3 days" / specific date if > 7 days away
- "Back to Set" button

## Card Review Flow
For each due card:
1. Show the card term using FlipCard component (front face only initially)
2. User clicks/taps to flip and see definition
3. After flip: four rating buttons appear below the card
4. User selects a rating → update SR data → advance to next card

## Rating Buttons
| Button | Color | Key |
|---|---|---|
| Again 🔴 | red-500 | 1 |
| Hard 🟡 | yellow-500 | 2 |
| Good 🟢 | green-500 | 3 |
| Easy 🔵 | blue-500 | 4 |

Keyboard shortcuts 1-4 work after card is flipped.
Rating buttons only visible after card is flipped (not before).

## On Rating
1. Call updateCardAfterReview(set.srData, cardIndex, rating) from spacedRepetition.js
2. Call updateSrData(setId, newSrData) to persist
3. Show brief feedback (flash the card border the rating color, 400ms)
4. Advance to next card

## Progress
- ProgressBar at top: (reviewed / total due) 
- "X cards remaining" text
- No skip button — must rate every card

## Completion Screen
Shown after all due cards are rated.
Content:
- "Session complete! Reviewed [N] cards."
- Summary table: card term | rating given | next review date
- "Back to Set" button
- Call markStudied(id) when this screen mounts

## spacedRepetition.js Functions Required
See .claude/context/database.md for srData schema.

getCardsForReview(set):
- Returns cards where nextReview <= today OR no srData entry
- Returns array of { card: {term, definition}, cardIndex: number }

updateCardAfterReview(srData, cardIndex, rating):
- Pure function — does not mutate input srData
- Returns new srData object with updated entry for cardIndex
- Rating logic:
  - "again": interval=1, repetitions=0, easeFactor = max(1.3, ef - 0.2)
  - "hard":  interval = ceil(interval * 1.2), easeFactor = max(1.3, ef - 0.15)
  - "good":  interval = ceil(interval * easeFactor), repetitions++
  - "easy":  interval = ceil(interval * easeFactor * 1.3), easeFactor = ef + 0.15, repetitions++
- nextReview = format(today + interval days, "YYYY-MM-DD")
- lastRating = the rating string

getSetProgress(set):
- Returns { new, learning, due, mastered }
- new: card index has no srData entry
- due: nextReview <= today (and has srData entry)
- mastered: repetitions >= 4
- learning: has srData, not due, not mastered