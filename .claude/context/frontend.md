# Frontend Context — FlashForge

## Tech Stack
- React 18 + Vite 5
- Tailwind CSS v4 + CSS custom properties (see Design System section below)
- React Router v6
- No state management library — React useState/useReducer only
- No component libraries — all custom components

## Design System

CSS variables are defined in `src/index.css` and consumed throughout the app. Do not bypass them with one-off hex values.

```css
--bg-base: #08070f          /* page background */
--bg-surface: #100f1a       /* elevated surfaces */
--bg-card: rgba(255,255,255,0.04)  /* glass card fill */
--accent: #7c3aed           /* primary violet */
--accent-light: #a78bfa     /* violet light (text, borders) */
--accent-dark: #4c1d95      /* violet dark */
--border-subtle: rgba(167,139,250,0.15)
--border-hover: rgba(167,139,250,0.4)
--glow: 0 0 40px rgba(124,58,237,0.15)
```

### Utility classes (defined in index.css)
- `.glass-card` — frosted glass panel: `var(--bg-card)` fill, `var(--border-subtle)` border, `backdrop-filter: blur(12px)`, `border-radius: 16px`. Hover adds `var(--border-hover)` border and `var(--glow)` box-shadow. Use for any card/panel surface.
- `.ff-heading` — applies `font-family: 'Syne', sans-serif`. Use for all headings and prominent labels.

## Color Palette (stick to these exactly)
- Page background: `bg-[#08070f]` (Tailwind arbitrary) or CSS var `--bg-base`
- Cards/panels: `.glass-card` utility class
- Primary accent: `bg-violet-600` / `hover:bg-violet-500` (buttons); `#7c3aed` for glow/borders
- Accent text/borders: `text-[#a78bfa]`, `border-[rgba(167,139,250,0.3)]`
- Muted accent: `text-[#a78bfa]/50`, `text-[#a78bfa]/40`, `text-[#a78bfa]/30`
- Success: `text-emerald-400`, `bg-emerald-900/30`, `border-emerald-500/20`
- Warning: `text-amber-400`, `bg-amber-900/30`, `border-amber-500/20`
- Error/Danger: `text-red-400`
- Text primary: `text-white`
- Text muted: `text-zinc-400`
- Borders (non-accent): `border-zinc-700` / `bg-zinc-800` only where glass-card isn't appropriate

## Typography
- Fonts: **Syne** (headings) + **DM Sans** (body) — loaded via Google Fonts `@import` at the top of `src/index.css`; do NOT add to index.html
- Headings: `.ff-heading` class (Syne) + `font-bold`, sizes `text-2xl` to `text-4xl`. Apply with `style={{ fontFamily: "'Syne', sans-serif" }}` when the class alone isn't picked up by Tailwind JIT.
- Body: `text-base` (DM Sans via body rule in index.css)
- Muted/label text: `text-sm text-[#a78bfa]/50` for UI labels; `text-sm text-zinc-400` for secondary content

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
- Full width, `backdrop-blur-md bg-[#08070f]/80 border-b border-[rgba(167,139,250,0.15)]`
- Left: "FlashForge" logo — `text-white ff-heading` with inline `fontFamily: 'Syne'`, `fontWeight: 800`
- Right: "My Sets" link: `text-[#a78bfa]/70 hover:text-[#a78bfa]`
- Breadcrumb separators: `text-[#a78bfa]/30`
- Active breadcrumb (current page): `text-white`
- Inactive breadcrumb links: `text-[#a78bfa]/70 hover:text-[#a78bfa]`

### SetCard.jsx
- Outer div: `.glass-card` + `border-l-2 border-l-[#7c3aed]` + `hover:scale-[1.02]`
- Set name: `text-white font-bold` with Syne font via inline style
- Card count: `text-[#a78bfa]/70 text-sm mt-1`
- Last studied: `text-[#a78bfa]/40 text-xs mt-0.5`
- Progress badges: emerald/violet/amber/zinc with `900/30` bg, colored text, subtle border (see file)
- Delete button: `text-[#a78bfa]/30 hover:text-red-400`

### FlipCard.jsx
- CSS 3D perspective flip — transform-style: preserve-3d (inline styles, not CSS classes)
- Both faces: `.glass-card` with `boxShadow: '0 0 60px rgba(124,58,237,0.2)'`
- Front face term: `text-2xl font-semibold text-white ff-heading` (Syne)
- Back face definition: `text-2xl font-semibold text-white`
- "Click to flip" hint: `text-xs text-[#a78bfa]/40`
- Flip on click OR Space/Enter keypress

### ModeGrid.jsx
- 2×3 grid (2 cols on mobile, 3 on desktop)
- Each mode button: `.glass-card` + `hover:scale-[1.03]`, left-aligned content
- Emoji wrapped in: `w-12 h-12 rounded-xl bg-violet-900/30 flex items-center justify-center text-2xl mb-3 border border-violet-500/20`
- Mode label: `text-sm font-semibold text-white` with Syne font
- Mode description: `text-xs text-[#a78bfa]/50`

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
- Page wrapper: always `bg-[#08070f] min-h-screen` as outermost div (not on `<main>`)
- Primary buttons: `bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-6 py-2.5 font-semibold shadow-lg shadow-violet-900/40`
- Secondary/outline buttons: `border border-[rgba(167,139,250,0.3)] text-[#a78bfa] hover:bg-violet-900/20 rounded-xl px-6 py-2.5`
- Card/panel surfaces: always use `.glass-card` — never bare `bg-zinc-800`
- Loading states: simple spinner (animate-spin border-violet-500) centered
- Empty states: centered icon + message + CTA button (never just blank)
- Error states: red-tinted panel with message + recovery action
- Destructive actions: always require ConfirmModal before executing
- Back navigation: always use navigate(-1) or explicit back button, never browser back assumption
- Section labels / eyebrow text: `text-xs uppercase tracking-widest text-[#a78bfa]/50 font-medium`