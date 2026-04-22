# Study Modes Context — FlashForge

## Overview
Six study modes, each a self-contained React component in src/modes/.
All modes:
- Load their set via useSets() hook using the :id route param
- Manage all session state locally (useState/useReducer)
- Only write back to localStorage via updateSrData() or markStudied()
- Never modify the cards array itself
- Have a "Back" button that calls navigate(-1)
- Call markStudied(id) when a session completes

## Mode Summary

### 🃏 Flashcards (`/sets/:id/flashcards`)
Simple card browser. Flip to reveal answer. No scoring. Pure review.
Key features: shuffle, keyboard nav, star/flag cards, completion screen.
See `.claude/specs/flashcards-mode.md` for full spec.

### 🧠 Learn (`/sets/:id/learn`)
Adaptive queue. Alternates between multiple choice and type-the-answer.
Cards promoted when answered correctly twice in a row.
Wrong answers pushed back into queue.
See `.claude/specs/learn-mode.md` for full spec.

### 📝 Test (`/sets/:id/test`)
One-shot exam. Configurable mix of MC, True/False, Short Answer.
All questions shown at once. Graded at the end. Letter grade shown.
See `.claude/specs/test-mode.md` for full spec.

### 🔗 Match (`/sets/:id/match`)
Click-to-match pairs. Term column left, definition column right.
Timer counts up. Tracks mistakes. Star rating at end.
See `.claude/specs/match-mode.md` for full spec.

### 💥 Blast (`/sets/:id/blast`)
Fast-paced lives-based game. Countdown timer per card. 3 lives.
High score saved to localStorage. Difficulty: Easy/Medium/Hard.
See `.claude/specs/blast-mode.md` for full spec.

### 🔄 Review (`/sets/:id/review`)
Spaced repetition review. Only shows cards due today.
User rates difficulty after each card: Again/Hard/Good/Easy.
Updates srData via spacedRepetition.js.
See `.claude/specs/review-mode.md` for full spec.

## Shared Logic

### Distractor generation (used by Learn, Test, Blast)
To generate 3 wrong answer options for a card:
1. Filter out the current card from the set
2. Shuffle the remaining cards
3. Take the first 3
4. Extract the same field as the correct answer (definition or term)
Always ensure 4 total options (1 correct + 3 distractors).
If set has fewer than 4 cards, duplicate/modify distractors as needed.

### Answer matching (used by Learn, Test)
Import from src/utils/levenshtein.js:
- similarity(userAnswer, correctAnswer) returns 0.0–1.0
- Normalize both strings: .toLowerCase().trim()
- Threshold for "correct": similarity >= 0.8
- Threshold for "close enough" (show hint): 0.6 <= similarity < 0.8

### Session completion
Every mode calls markStudied(setId) exactly once when the session ends
(on completion screen mount, not on every card answer).

## What Modes Must NOT Do
- Never call localStorage directly
- Never modify set.cards array
- Never navigate away without giving the user a chance to see results
- Never auto-navigate on completion — always show a completion/results screen first