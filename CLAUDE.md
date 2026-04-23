# CLAUDE.md — FlashForge Navigation Map

> Navigation map only. Read the relevant context files before writing any code.

---

## 🗺️ WHERE TO FIND THINGS

| What you need to know         | Read this file                      |
|-------------------------------|-------------------------------------|
| Frontend components & routing | `.claude/context/frontend.md`       |
| localStorage schema & access  | `.claude/context/database.md`       |
| Study mode logic & rules      | `.claude/context/modes.md`          |
| Flashcards mode spec          | `.claude/specs/flashcards-mode.md`  |
| Learn mode spec               | `.claude/specs/learn-mode.md`       |
| Test mode spec                | `.claude/specs/test-mode.md`        |
| Match mode spec               | `.claude/specs/match-mode.md`       |
| Blast mode spec               | `.claude/specs/blast-mode.md`       |
| Spaced rep / Review spec      | `.claude/specs/review-mode.md`      |

---

## 🏗️ STACK

- **Frontend:** React 18 + Tailwind CSS + Vite
- **Backend / DB:** None — localStorage only
- **Auth:** None — private personal app
- **AI API:** None
- **Runtime:** Node v20 LTS via nvm
- **Deploy:** Vercel (static Vite build)
- **IDE:** Antigravity IDE with Claude Code

---

## 📐 ARCHITECTURE

[CSV paste / file upload]
│
▼
[csvParser.js]
│
▼
[localStorage]  ◄──── useSets.js hook (all reads/writes go through here)
│
▼
[SetDetail page]
│
┌────┴─────┬──────────┬──────────┬──────────┬──────────┐
▼          ▼          ▼          ▼          ▼          ▼
[Flashcards] [Learn]  [Test]    [Match]    [Blast]   [Review]
mode        mode     mode      mode       mode     (SR mode)

---

## 🗄️ LOCALSTORAGE SCHEMA — SINGLE SOURCE OF TRUTH

**All data lives in one localStorage key:** `flashforge_sets`

Value is a JSON array of Set objects:

```json
[
  {
    "id": "uuid-v4",
    "name": "Bio 201 Midterm",
    "cards": [
      { "term": "Mitochondria", "definition": "Powerhouse of the cell" }
    ],
    "createdAt": "2026-04-22T00:00:00.000Z",
    "lastStudied": "2026-04-22T00:00:00.000Z",
    "srData": {
      "0": {
        "interval": 1,
        "easeFactor": 2.5,
        "repetitions": 0,
        "nextReview": "2026-04-22",
        "lastRating": null
      }
    }
  }
]
```

### Key rules
- **ALL reads and writes go through `useSets.js`** — never call localStorage directly in a component
- **Never delete a set without user confirmation** — use `ConfirmModal`
- `srData` keys are card array indices as strings ("0", "1", "2"...)
- `lastStudied` is updated by `useSets.js` whenever any mode session completes


### Adding / editing sets
- Import screen calls `useSets.addSet(name, cards)`
- No editing of individual cards in v1 (out of scope)

### ⚠️ REACT USEEFFECT RULES — ALWAYS FOLLOW

Infinite loop bugs (React error #310) have been a repeated issue.
Claude must follow these rules for EVERY useEffect it writes:
Before writing ANY useEffect:** read `.claude/context/useeffect-rules.md`


---

## 🧠 CORE PRINCIPLES

### 1. All localStorage access through `useSets.js`
No component reads from or writes to localStorage directly.
`useSets.js` is the single write path — like a mini database layer.

### 2. No external libraries for core logic
- Fuzzy matching → inline Levenshtein in `utils/levenshtein.js`
- Shuffle → Fisher-Yates in `utils/shuffle.js`
- Spaced repetition → SM-2 variant in `utils/spacedRepetition.js`
- CSV parsing → custom parser in `utils/csvParser.js`
- Reason: keep the bundle tiny, no build surprises, no fuzzball-style hangs

### 3. Mode isolation
Each study mode in `src/modes/` is fully self-contained.
Modes read the set via `useSets.js` and manage their own session state locally.
Modes do NOT modify the set's card data — only `srData` and `lastStudied`.

### 4. No backend, ever (in v1)
No API calls, no auth, no server. If it can't be done in localStorage, it's out of scope for v1.

---

## ✍️ CODING RULES

- **Don't refactor what you didn't break.** Task is about mode X? Don't touch mode Y.
- **Smallest change that works.** Targeted edits over full rewrites.
- **No new npm packages without asking first.** The installed packages are sufficient.
- **Node v20 LTS only** — `nvm use 20` before running anything
- **Tailwind only** — no CSS modules, no styled-components, no inline style objects
- **Dark mode is the default** — bg-zinc-900/slate-900, text-white. No light mode toggle needed.
- `crypto.randomUUID()` for all IDs — no uuid package needed
- React Router v6 patterns only (`useParams`, `useNavigate`, `<Outlet>`)

---


## 🚫 NEVER TOUCH WITHOUT BEING TOLD

- `src/utils/spacedRepetition.js` — changing this breaks SR history for all cards
- `src/hooks/useSets.js` — the localStorage schema must stay backward-compatible
- `vercel.json` — SPA routing depends on the catch-all redirect rule
- `src/utils/csvParser.js` — changing column detection logic breaks existing imports

---

## 🐛 KNOWN ISSUES & WORKAROUNDS

- **Node version:** Vite 5 fails silently on Node v22+. Always `nvm use 20` first.
- **Vercel SPA routing:** Without `vercel.json` catch-all, refreshing any `/sets/:id` route returns 404. The vercel.json must have `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`.
- **localStorage quota:** Hitting ~5MB limit with very large sets is possible. No fix in v1, just a known constraint.
- **Tab-delimited CSV:** Quizlet exports use tabs not commas. `csvParser.js` must try tab first.

---

## 📋 ACTIVE FEATURES

| Feature | Spec file | Status |
|---------|-----------|--------|
| CSV Import + Set Management | *(inline in Prompt 1)* | 📋 Planned |
| Flashcards Mode | `.claude/specs/flashcards-mode.md` | 📋 Planned |
| Spaced Rep Engine + Review Mode | `.claude/specs/review-mode.md` | 📋 Planned |
| Learn Mode | `.claude/specs/learn-mode.md` | 📋 Planned |
| Test Mode | `.claude/specs/test-mode.md` | 📋 Planned |
| Match Mode | `.claude/specs/match-mode.md` | 📋 Planned |
| Blast Mode | `.claude/specs/blast-mode.md` | 📋 Planned |

---

*Last updated: April 2026*
*Stack: React 18, Vite 5, Tailwind CSS v3, React Router v6, Node 20 LTS*

