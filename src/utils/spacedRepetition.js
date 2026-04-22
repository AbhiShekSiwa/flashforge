const DEFAULT_SR = { interval: 1, easeFactor: 2.5, repetitions: 0 }

function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDaysToToday(days) {
  const d = new Date()
  d.setDate(d.getDate() + Math.max(1, days))
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getCardsForReview(set) {
  const today = todayStr()
  const srData = set.srData ?? {}
  return set.cards
    .map((card, cardIndex) => ({ card, cardIndex }))
    .filter(({ cardIndex }) => {
      const entry = srData[String(cardIndex)]
      return !entry || entry.nextReview <= today
    })
}

export function updateCardAfterReview(srData, cardIndex, rating) {
  const key = String(cardIndex)
  const existing = srData[key] ?? { ...DEFAULT_SR }
  const { interval, easeFactor: ef, repetitions } = existing

  let newInterval, newEf, newRepetitions

  switch (rating) {
    case 'again':
      newInterval = 1
      newRepetitions = 0
      newEf = Math.max(1.3, ef - 0.2)
      break
    case 'hard':
      newInterval = Math.ceil(interval * 1.2)
      newRepetitions = repetitions
      newEf = Math.max(1.3, ef - 0.15)
      break
    case 'good':
      newInterval = Math.ceil(interval * ef)
      newRepetitions = repetitions + 1
      newEf = ef
      break
    case 'easy':
      newInterval = Math.ceil(interval * ef * 1.3)
      newRepetitions = repetitions + 1
      newEf = ef + 0.15
      break
    default:
      return srData
  }

  return {
    ...srData,
    [key]: {
      interval: Math.max(1, newInterval),
      easeFactor: newEf,
      repetitions: newRepetitions,
      nextReview: addDaysToToday(newInterval),
      lastRating: rating,
    },
  }
}

export function getSetProgress(set) {
  const today = todayStr()
  const srData = set.srData ?? {}
  let newCount = 0, learning = 0, due = 0, mastered = 0

  for (let i = 0; i < set.cards.length; i++) {
    const entry = srData[String(i)]
    if (!entry) {
      newCount++
    } else if (entry.repetitions >= 4) {
      mastered++
    } else if (entry.nextReview <= today) {
      due++
    } else {
      learning++
    }
  }

  return { new: newCount, learning, due, mastered }
}
