# Frontend Context — FlashForge

## Tech Stack
- React 18 + Vite 5
- Tailwind CSS v3 (dark mode via `class` strategy)
- React Router v6
- No state management library — React useState/useReducer only
- No component libraries — all custom Tailwind components

## Color Palette (stick to these exactly)
- Background: `bg-zinc-900` (page), `bg-zinc-800` (cards/panels)
- Surface elevated: `bg-zinc-700` (modals, dropdowns)
- Primary accent: `indigo-500` (buttons, highlights, active states)
- Success: `green-500`
- Error/Danger: `red-500`
- Warning: `yellow-500`
- Text primary: `text-zinc-100`
- Text muted: `text-zinc-400`
- Borders: `border-zinc-700`

## Typography
- Font: Inter (loaded via Google Fonts in index.html)
- Headings: `font-bold`, sizes scale from `text-xl` to `text-4xl`
- Body: `text-base text-zinc-300`
- Muted/label text: `text-sm text-zinc-400`

## Routing Structure
/                        → pages/Home.jsx
/import                  → pages/Import.jsx
/sets/:id                → pages/SetDetail.jsx
/sets/:id/flashcards     → modes/Flashcards.jsx
/sets/:id/learn          → modes/Learn.jsx
/sets/:id/test           → modes/Test.jsx
/sets/:id/match          → modes/Match.jsx
/sets/:id/blast          → modes/Blast.jsx
/sets/:id/review         → modes/Review.jsx

## Component Tree
App.jsx (router)
├── NavBar.jsx (always visible)
├── pages/
│   ├── Home.jsx
│   │   └── SetCard.jsx (× many)
│   │       └── ConfirmModal.jsx
│   ├── Import.jsx
│   └── SetDetail.jsx
│       └── ModeGrid.jsx
└── modes/
├── Flashcards.jsx
│   └── FlipCard.jsx
│   └── ProgressBar.jsx
├── Learn.jsx
│   └── ProgressBar.jsx
├── Test.jsx
│   └── ProgressBar.jsx
├── Match.jsx
├── Blast.jsx
└── Review.jsx
└── FlipCard.jsx
└── ProgressBar.jsx

## Shared Components

### NavBar.jsx
- Full width, `bg-zinc-800 border-b border-zinc-700`
- Left: "FlashForge" logo text (indigo-400, font-bold)
- Right: "My Sets" link to /
- On set detail + mode pages: breadcrumb between logo and link
  Format: `My Sets > [Set Name] > [Mode Name]`
  "My Sets" is a link, set name links to /sets/:id, mode is plain text

### SetCard.jsx
- `bg-zinc-800 rounded-xl border border-zinc-700`
- Hover: `hover:border-indigo-500 hover:scale-[1.02] transition-all`
- Shows: set name (bold), card count, last studied date or "Never studied"
- Bottom right: delete icon button (trash, red on hover)
- Entire card (except delete button) is clickable → routes to /sets/:id

### FlipCard.jsx
- CSS 3D perspective flip — transform-style: preserve-3d
- Front face: term, Back face: definition
- Both faces: `bg-zinc-800 rounded-2xl p-8 text-center`
- Flip on click anywhere on card OR Space/Enter keypress
- Large text: `text-2xl font-semibold`
- Small "Click to flip" hint text at bottom in zinc-500

### ModeGrid.jsx
- 2×3 grid (2 cols on mobile, 3 on desktop)
- Each mode button: `bg-zinc-800 rounded-xl p-6 hover:bg-indigo-600 transition`
- Icon (emoji) large, label below, description text tiny in zinc-400

### ProgressBar.jsx
- Props: `value` (0 to 1), `label` (string), `color` (optional, default indigo)
- Animated fill with `transition-all duration-300`
- Label shown above or beside bar

### ConfirmModal.jsx
- Centered overlay with `bg-black/60 backdrop-blur`
- Modal panel: `bg-zinc-800 rounded-2xl p-6 max-w-sm`
- Props: `isOpen`, `onConfirm`, `onCancel`, `message`, `confirmLabel`
- Confirm button: red (for deletes), Cancel: zinc

## State Management Pattern
- Page-level state lives in the page/mode component via useState
- Session state (current card, score, etc.) is local to each mode component
- Shared persistent state is ONLY accessed via useSets.js hook
- No prop drilling beyond 2 levels — lift state to the nearest common parent

## UI Patterns to Always Follow
- Loading states: simple spinner (animate-spin border-indigo-500) centered
- Empty states: centered icon + message + CTA button (never just blank)
- Error states: red-tinted panel with message + recovery action
- All buttons: minimum h-10, px-4, rounded-lg, font-medium
- Destructive actions: always require ConfirmModal before executing
- Back navigation: always use navigate(-1) or explicit back button, never browser back assumption