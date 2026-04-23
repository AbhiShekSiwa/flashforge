# Spec: Test Mode

Route: `/sets/:id/test`
File: `src/modes/Test.jsx`
Depends on: `src/utils/levenshtein.js`, `src/utils/shuffle.js`

## Purpose
One-shot exam. Configurable. All questions on one page. Graded at end.

## Settings Screen (shown before test starts)
Controls:
- Number of questions: slider, min 5, max = total card count, default = min(20, total)
- Question types: three checkboxes: [x] Multiple Choice [x] True/False [x] Short Answer
  At least one must be checked (disable submit if all unchecked)
- Direction: radio buttons: "Term → Definition" | "Definition → Term" | "Mixed"
- "Start Test" button (large, `bg-violet-600 hover:bg-violet-500 text-white rounded-xl`)

## Test Generation
On "Start Test":
1. Randomly select N cards from the set (N = chosen question count)
2. For each selected card, assign a question type based on enabled types and ratios:
   - If all three enabled: ~50% MC, ~30% T/F, ~20% Short Answer
   - If only two enabled: ~60% / ~40% split
   - If only one enabled: 100% that type
3. Randomly assign direction per question if "Mixed", else use chosen direction
4. For T/F questions: 50% chance the shown pair is correct, 50% chance definition is swapped 
   with another random card's definition (creating a false statement)
5. Generate distractors for MC questions at generation time (not render time)
6. Shuffle question order

## Question Types

### Multiple Choice
- Show prompt (term or definition depending on direction)
- 4 radio button options (1 correct + 3 distractors)
- No feedback until test submitted

### True / False
- Show: "[Term] — [Definition]"
- Two buttons: "True ✓" and "False ✗" (styled as toggle, one selectable)
- No feedback until test submitted

### Short Answer
- Show prompt (term or definition)
- Text input field
- No feedback until test submitted

## Taking the Test UI
- All questions displayed in a single scrollable page
- Each question: numbered card (1., 2., 3...) using `.glass-card p-4`
- Question type label shown small above each question (MC / T/F / Short Answer)
- Sticky bottom bar: answered count "12 / 20 answered" + "Submit Test" button
- Submit button: disabled until all questions have an answer
- On Submit click: ConfirmModal "Submit your test? You can't change answers after this."

## Grading Logic
For each question:
- MC: correct if selected option matches correct answer exactly
- T/F: correct if user's True/False matches whether the shown pair was actually correct
- Short Answer: 
  - normalize both strings (lowercase, trim)
  - correct if similarity(user, correct) >= 0.8

Score = correct count / total count

Letter grade:
- A: >= 90%
- B: >= 80%
- C: >= 70%
- D: >= 60%
- F: < 60%

## Results Screen
Header: "Score: X / Y — Z% — Grade: [A/B/C/D/F]"
Grade displayed large with color:
- A: green-400, B: blue-400, C: yellow-400, D: orange-400, F: red-400

Each question shown with:
- ✅ or ❌ icon
- The original prompt
- User's answer (highlighted red if wrong)
- Correct answer (highlighted green, always shown)

Buttons at bottom:
- "Retake Test" — regenerate test with same settings
- "New Test" — go back to settings screen
- "Back to Set" — navigate(-1)

Call markStudied(id) when results screen mounts.