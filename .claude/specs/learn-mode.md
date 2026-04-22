# Spec: Learn Mode

Route: `/sets/:id/learn`
File: `src/modes/Learn.jsx`
Depends on: `src/utils/levenshtein.js`, `src/utils/shuffle.js`

## Purpose
Adaptive learning queue. Cards cycle through until each is answered
correctly twice in a row. Mix of question types keeps it engaging.

## Session State (local, not persisted)
```js{
queue: [],           // ordered array of cardIndex values
cardStats: {         // keyed by cardIndex
[index]: {
streak: 0,       // consecutive correct answers
timesShown: 0,   // total appearances
learned: false
}
},
learnedCount: 0,
totalCards: N,
currentQueuePos: 0,
sessionComplete: false
}

## Initialization
- Shuffle all card indices → initial queue
- All cardStats start at { streak: 0, timesShown: 0, learned: false }

## Queue Logic
- Current card = queue[currentQueuePos]
- On correct answer: streak++. If streak >= 2: mark learned, remove from future rotations
- On wrong answer: streak = 0, push cardIndex back into queue at currentQueuePos + 4
  (or at end if less than 4 remain)
- Session ends when learnedCount === totalCards

## Question Type Selection Per Card Appearance
- timesShown === 0 OR (streak > 0 and timesShown is even) → Multiple Choice
- timesShown > 0 AND (streak === 0 OR timesShown is odd) → Type the Answer
- After any wrong answer → always Type the Answer next appearance

## Multiple Choice Question
Layout:
- Question text large and centered: show term or definition (randomly chosen direction per question)
- Prompt above: "Select the correct [term / definition]:"
- 4 option buttons in a 2×2 grid

Options:
- 1 correct answer
- 3 distractors from other cards in the set (same field as correct answer)
- Shuffle the 4 options before displaying

On selection:
- Correct: button turns green, others dim, auto-advance after 1.2s
- Wrong: selected button turns red, correct button turns green, auto-advance after 1.5s

Scoring:
- Correct → call handleAnswer(true)
- Wrong → call handleAnswer(false)

## Type the Answer Question
Layout:
- Show the prompt (term or definition) large at top
- Text input below, focused on mount
- "Check Answer" button (or Enter key to submit)
- Direction consistent per card appearance (don't switch mid-card)

On submit:
- Normalize: userInput.toLowerCase().trim() vs correct.toLowerCase().trim()
- similarity = levenshtein similarity score
- If similarity >= 0.8: correct → call handleAnswer(true), show "✅ Correct!"
- If 0.6 <= similarity < 0.8: correct (lenient) → call handleAnswer(true), 
  show "✅ Close enough! The exact answer: [correct]"
- If similarity < 0.6: wrong → call handleAnswer(false),
  show "❌ Correct answer: [correct answer]", 
  "Got it" button to advance (don't auto-advance on wrong type answer)

## handleAnswer(isCorrect)if isCorrect:
cardStats[currentCard].streak++
cardStats[currentCard].timesShown++
if streak >= 2:
cardStats[currentCard].learned = true
learnedCount++
else:
cardStats[currentCard].streak = 0
cardStats[currentCard].timesShown++
push currentCard to queue at currentPos + 4

## Progress Bar
- At top of screen
- Value: learnedCount / totalCards
- Label: "X of Y learned"

## End Session Button
- Always visible top right
- Click → show summary screen immediately (don't wait for completion)

## Completion Screen (all cards learned OR end session clicked)
- If all learned: "🎉 You've mastered all [N] cards!"
- If ended early: "Session ended — [X] of [N] learned"
- Table: each card | ✅ learned or ❌ not yet
- Two buttons: "Restart" (full reset) and "Study missed only" (restart with only unlearned cards)
- Call markStudied(id) on mount of completion screen