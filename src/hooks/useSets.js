import { useState, useEffect } from 'react'

const STORAGE_KEY = 'flashforge_sets'

function loadSets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveSets(sets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sets))
}

export function useSets() {
  const [sets, setSets] = useState(loadSets)

  useEffect(() => {
    saveSets(sets)
  }, [sets])

  function addSet(name, cards) {
    const newSet = {
      id: crypto.randomUUID(),
      name,
      cards,
      createdAt: new Date().toISOString(),
      lastStudied: null,
      srData: {},
    }
    setSets(prev => [...prev, newSet])
    return newSet.id
  }

  function deleteSet(id) {
    setSets(prev => prev.filter(s => s.id !== id))
  }

  function updateSrData(id, srData) {
    setSets(prev =>
      prev.map(s => (s.id === id ? { ...s, srData } : s))
    )
  }

  function markStudied(id) {
    setSets(prev =>
      prev.map(s => (s.id === id ? { ...s, lastStudied: new Date().toISOString() } : s))
    )
  }

  function renameSet(id, name) {
    setSets(prev => prev.map(s => (s.id === id ? { ...s, name } : s)))
  }

  function updateCards(setId, newCards) {
    const today = new Date().toISOString().slice(0, 10)
    setSets(prev =>
      prev.map(s => {
        if (s.id !== setId) return s
        const oldCards = s.cards
        const oldSrData = s.srData || {}
        const newSrData = {}
        newCards.forEach((card, newIdx) => {
          const oldIdx = oldCards.findIndex(
            c => c.term === card.term && c.definition === card.definition
          )
          if (oldIdx !== -1 && oldSrData[String(oldIdx)]) {
            newSrData[String(newIdx)] = oldSrData[String(oldIdx)]
          } else {
            newSrData[String(newIdx)] = {
              interval: 1,
              easeFactor: 2.5,
              repetitions: 0,
              nextReview: today,
              lastRating: null,
            }
          }
        })
        return { ...s, cards: newCards, srData: newSrData, lastStudied: new Date().toISOString() }
      })
    )
  }

  return { sets, addSet, deleteSet, updateSrData, markStudied, renameSet, updateCards }
}
