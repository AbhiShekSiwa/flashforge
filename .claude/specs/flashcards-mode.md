# Spec: Flashcards Mode

Route: `/sets/:id/flashcards`
File: `src/modes/Flashcards.jsx`

## Purpose
Simplest mode. Browse all cards, flip to reveal, no scoring pressure.

## Session Initialization
- Load set from useSets() by :id
- Shuffle cards using shuffle() from utils/shuffle.js
- Store shuffled order in local state (not persisted)
- Start at index 0

## Card Display
- Use FlipCard component (front = term, back = definition)
- One card visible at a time, centered on screen
- Large comfortable size: min-h-64, max-w-2xl
- "Click to flip" hint shown on front face in small muted text
- Card number shown above card: "3 / 47" — current / total

## Controls
| Action | Trigger |
|---|---|
| Flip card | Click card OR Space OR Enter |
| Next card | Right arrow OR Next button |
| Prev card | Left arrow OR Prev button |
| Shuffle | Shuffle toggle button |
| Star card | Star icon button on card |

## Shuffle Toggle
- Button: 🔀 Shuffle (active state: `bg-violet-900/20`, outline `border border-[rgba(167,139,250,0.3)] text-[#a78bfa]`)
- When toggled ON: re-run shuffle(), reset to index 0, flip any flipped card back to front
- When toggled OFF: restore original order, reset to index 0

## Star / Flag
- Star icon (☆/★) on each card
- Toggles a starred flag in local session state (Map of cardIndex → boolean)
- Starred cards highlighted with yellow border
- No persistence — session only
- Future: could be used to study starred only (v2 feature, not in scope)

## Navigation
- Prev button disabled at index 0
- Next button disabled at last card (shows "Finish" instead)
- Clicking "Finish" on last card → completion screen

## Completion Screen
Shown when user clicks Finish on the last card.
Content:
- "🎉 You've reviewed all [N] cards!"
- Two buttons: "Study Again" (reset to card 1, same order) and "Shuffle & Restart" (re-shuffle, reset)
- "Back to Set" link

## What This Mode Does NOT Do
- No scoring
- No pass/fail
- No writing to srData
- Does call markStudied(id) when completion screen is shown