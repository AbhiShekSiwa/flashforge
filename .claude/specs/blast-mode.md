# Spec: Blast Mode

Route: `/sets/:id/blast`
File: `src/modes/Blast.jsx`
Depends on: `src/utils/shuffle.js`

## Purpose
Fast-paced lives-based quiz game. Answer before time runs out. High score tracking.

## Settings Screen
- Title: "💥 Blast Mode"
- Show current high score for this set (from localStorage flashforge_highscores)
  If no high score: "No high score yet"
- Difficulty selector (three large buttons, one selectable):
  - 🟢 Easy — 8 seconds per card
  - 🟡 Medium — 5 seconds per card  
  - 🔴 Hard — 3 seconds per card
- "Start Blast" button (large, indigo)

## Game State
```js
{
  lives: 3,
  score: 0,
  cardQueue: [],       // shuffled card indices
  currentIndex: 0,
  timeLeft: N,         // seconds, counts down
  phase: "question" | "feedback" | "gameover",
  feedbackType: null,  // "correct" | "wrong" | "timeout"
  hasMarkedStudied: false
}
```

## Gameplay Loop

### Question Phase
- Show current card term large and centered
- 4 multiple choice buttons below (1 correct + 3 distractors, shuffled)
- Timer progress bar at top, shrinks from full to empty over N seconds
  - Color: green when > 50%, yellow when 25-50%, red when < 25%
- No keyboard shortcuts in Blast (must click buttons — intentional for game feel)

### On Answer Selected (before timeout)
- Correct:
  - score += 10
  - Speed bonus: if timeLeft > (N * 0.75): score += 5
  - feedbackType = "correct", phase = "feedback"
  - Flash screen/card border green briefly (400ms)
  - Auto-advance after 400ms

- Wrong:
  - lives -= 1
  - feedbackType = "wrong", phase = "feedback"
  - Flash screen/card border red
  - Show correct answer highlighted green for 1000ms
  - Auto-advance after 1000ms

### On Timeout (timer reaches 0)
- lives -= 1
- feedbackType = "timeout", phase = "feedback"
- Show "⏰ Time's up! Answer: [correct answer]" for 1000ms
- Auto-advance after 1000ms

### After Feedback Phase
- If lives <= 0: phase = "gameover"
- Else if currentIndex >= cardQueue.length: reshuffle queue, currentIndex = 0 (endless loop)
- Else: currentIndex++, reset timer, phase = "question"

## Lives Display
Top left: heart emojis based on lives remaining
- 3 lives: ❤️❤️❤️
- 2 lives: ❤️❤️🖤
- 1 life: ❤️🖤🖤
- 0 lives: game over immediately

## Score Display
Top right: score as large number, briefly animates +10 or +15 on correct answer

## Game Over Screen
Content:
- "💥 Game Over!"
- Final Score: [score] (large)
- Cards answered correctly: X
- Accuracy: X%
- High score section:
  - Check localStorage flashforge_highscores[setId]
  - If new high score: "🏆 New High Score!" in gold, save to localStorage
  - If not: "High Score: [existing score]"

Buttons:
- "Play Again" (same difficulty, full reset)
- "Change Difficulty" (back to settings)
- "Back to Set"

Call markStudied(setId) when game over screen mounts (once only).

## High Score Storage
Key: `flashforge_highscores`
Value: object keyed by setId:
```json
{
  "[setId]": {
    "score": 340,
    "date": "2026-04-22T14:30:00.000Z",
    "difficulty": "medium"
  }
}
```
Read/write this key DIRECTLY in Blast.jsx (not through useSets).
This is the ONE exception to the "all localStorage through useSets" rule.
It's excepted because high scores are game data, not set data.

## Visual Design Notes
- This should feel like a game, not a study tool
- Timer bar transitions should be smooth (CSS transition, not JS interval)
- Score increment should have a brief pop animation
- Use larger bolder text than other modes
- Wrong answer flash: briefly tint entire background red (bg-red-950 for 300ms)
- Correct answer flash: briefly tint entire background green (bg-green-950 for 300ms)