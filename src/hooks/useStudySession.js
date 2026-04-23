import { useState, useCallback, useMemo } from 'react'
import { shuffle as fisherYates } from '../utils/shuffle.js'

/**
 * useStudySession
 * @param {Array}  cards    - array of card objects { term, definition }
 * @param {Object} options  - { shuffle: bool }
 * @returns {{ currentCard, currentIndex, total, next, prev, restart, isComplete }}
 */
export function useStudySession(cards = [], { shuffle = false } = {}) {
  const orderedCards = useMemo(
    () => (shuffle ? fisherYates([...cards]) : cards),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // intentionally stable — computed once on mount
  )

  const total = orderedCards.length
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  const next = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev >= total - 1) {
        setIsComplete(true)
        return prev
      }
      return prev + 1
    })
  }, [total])

  const prev = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1))
  }, [])

  const restart = useCallback(() => {
    setCurrentIndex(0)
    setIsComplete(false)
  }, [])

  const currentCard = orderedCards[currentIndex] ?? null

  return { currentCard, currentIndex, total, next, prev, restart, isComplete }
}
