# Database Context — FlashForge

## Storage Layer
No backend database. All persistence via browser localStorage.
Single key: `flashforge_sets`
Secondary key: `flashforge_highscores` (Blast mode only)

## ALL localStorage access goes through src/hooks/useSets.js
Never call localStorage.getItem / setItem directly in a component or mode.
The hook is the single write path. This is non-negotiable.

## Primary Schema — `flashforge_sets`

Value: JSON array of Set objects.

```json[
{
"id": "550e8400-e29b-41d4-a716-446655440000",
"name": "Bio 201 Midterm",
"cards": [
{ "term": "Mitochondria", "definition": "Powerhouse of the cell" },
{ "term": "Nucleus", "definition": "Control center of the cell" }
],
"createdAt": "2026-04-22T10:00:00.000Z",
"lastStudied": "2026-04-22T14:30:00.000Z",
"srData": {
"0": {
"interval": 4,
"easeFactor": 2.5,
"repetitions": 2,
"nextReview": "2026-04-26",
"lastRating": "good"
},
"1": {
"interval": 1,
"easeFactor": 2.3,
"repetitions": 0,
"nextReview": "2026-04-23",
"lastRating": "again"
}
}
}
]

## Field Definitions

### Set object
| Field | Type | Description |
|---|---|---|
| id | string (uuid) | Generated via crypto.randomUUID() at creation |
| name | string | User-provided set name |
| cards | Card[] | Ordered array of flashcard pairs |
| createdAt | ISO string | Set creation timestamp |
| lastStudied | ISO string or null | Updated by markStudied() after any mode session |
| srData | object | Spaced repetition data, keyed by card index as string |

### Card object
| Field | Type | Description |
|---|---|---|
| term | string | The prompt/question side |
| definition | string | The answer side |

### srData entry (keyed by card index string "0", "1", etc.)
| Field | Type | Description |
|---|---|---|
| interval | number | Days until next review |
| easeFactor | number | SM-2 multiplier, min 1.3 |
| repetitions | number | Consecutive correct reviews |
| nextReview | string | YYYY-MM-DD format date |
| lastRating | string or null | "again", "hard", "good", or "easy" |

## Secondary Schema — `flashforge_highscores`

```json{
"550e8400-e29b-41d4-a716-446655440000": {
"score": 340,
"date": "2026-04-22T14:30:00.000Z",
"difficulty": "medium"
}
}

Only written by Blast.jsx. Read in Blast.jsx to show current high score.

## useSets.js — Official API

```jsconst { sets, addSet, deleteSet, updateSrData, markStudied } = useSets()

| Function | Args | What it does |
|---|---|---|
| sets | — | Array of all set objects, live-updated |
| addSet | (name, cards) | Creates new set, saves to localStorage |
| deleteSet | (id) | Removes set by id |
| updateSrData | (id, srData) | Replaces srData for one set, saves |
| markStudied | (id) | Sets lastStudied = now, saves |

## Backward Compatibility Rules
- Never rename existing fields in the schema
- Never change the meaning of an existing field
- Adding new optional fields is fine
- srData keys are always string indices matching the card array position
- If a card has no srData entry, treat it as brand new (never reviewed)

## localStorage Limits
- Browser limit: ~5MB total
- A 500-card set with full text is roughly 50-100KB
- No enforcement needed in v1 — just a known constraint