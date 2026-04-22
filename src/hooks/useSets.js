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

  return { sets, addSet, deleteSet, updateSrData, markStudied }
}
