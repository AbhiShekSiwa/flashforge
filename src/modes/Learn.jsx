import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSets } from '../hooks/useSets.js'
import ProgressBar from '../components/ProgressBar.jsx'
import { shuffle } from '../utils/shuffle.js'
import { similarity } from '../utils/levenshtein.js'

export default function Learn() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { sets, markStudied } = useSets()
  const set = sets.find(s => s.id === id)

  // BUG 3: Settings screen state
  const [showSettings, setShowSettings] = useState(true)
  const [selectedQuestionType, setSelectedQuestionType] = useState('mixed')
  const [selectedDirection, setSelectedDirection] = useState('term')

  const [sessionState, setSessionState] = useState(() => {
    if (!set || set.cards.length === 0) return null

    const totalCards = set.cards.length
    const cardIndices = Array.from({ length: totalCards }, (_, i) => i)
    const queue = shuffle(cardIndices)
    const cardStats = {}
    for (let i = 0; i < totalCards; i++) {
      cardStats[i] = { streak: 0, timesShown: 0, learned: false }
    }

    return {
      queue,
      cardStats,
      learnedCount: 0,
      totalCards,
      currentQueuePos: 0,
      sessionComplete: false,
      completedByEndButton: false,
      originalTotalCards: totalCards,
    }
  })

  const [isShowingAnswer, setIsShowingAnswer] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
  const [userInput, setUserInput] = useState('')
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [feedbackIsCorrect, setFeedbackIsCorrect] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [cardDirections, setCardDirections] = useState({})
  // BUG 1: Store generated options per card to prevent reshuffling
  const [cardOptions, setCardOptions] = useState({})

  const {
    queue = [],
    cardStats = {},
    learnedCount = 0,
    totalCards = 0,
    currentQueuePos = 0,
    sessionComplete = false,
    completedByEndButton = false,
    originalTotalCards = 0,
  } = sessionState || {}

  // Generate card direction once per card index
  useEffect(() => {
    if (!sessionState || queue.length === 0 || currentQueuePos >= queue.length) return
    const idx = queue[currentQueuePos]
    if (!cardDirections.hasOwnProperty(idx)) {
      setCardDirections(prev => ({ ...prev, [idx]: getRandomDirection() }))
    }
  }, [currentQueuePos, queue, sessionState])

  // BUG 3: Settings screen UI
  if (showSettings) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-8"
        >
          ← Back
        </button>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">🧠 Learn — Settings</h1>
          <p className="text-zinc-400 text-sm mb-8">Customize your learning session</p>
        </div>

        <div className="bg-zinc-800 rounded-lg p-6 space-y-8 mb-8">
          {/* Question Type Selector */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Question Type</h2>
            <div className="space-y-3">
              {[
                { value: 'mc', label: 'Multiple Choice only' },
                { value: 'tta', label: 'Type the Answer only' },
                { value: 'mixed', label: 'Mixed (alternating)', default: true },
              ].map(option => (
                <label key={option.value} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="questionType"
                    value={option.value}
                    checked={selectedQuestionType === option.value}
                    onChange={e => setSelectedQuestionType(e.target.value)}
                    className="w-4 h-4 accent-indigo-500"
                  />
                  <span className="ml-3 text-zinc-200">
                    {option.label}
                    {option.default && <span className="text-zinc-400 text-sm ml-1">(default)</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Direction Selector */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Direction</h2>
            <div className="space-y-3">
              {[
                { value: 'term', label: 'Term → Definition', default: true },
                { value: 'definition', label: 'Definition → Term' },
                { value: 'mixed', label: 'Mixed' },
              ].map(option => (
                <label key={option.value} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="direction"
                    value={option.value}
                    checked={selectedDirection === option.value}
                    onChange={e => setSelectedDirection(e.target.value)}
                    className="w-4 h-4 accent-indigo-500"
                  />
                  <span className="ml-3 text-zinc-200">
                    {option.label}
                    {option.default && <span className="text-zinc-400 text-sm ml-1">(default)</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            if (!sessionState && set && set.cards.length > 0) {
              const totalCards = set.cards.length
              const cardIndices = Array.from({ length: totalCards }, (_, i) => i)
              const newCardStats = {}
              for (let i = 0; i < totalCards; i++) {
                newCardStats[i] = { streak: 0, timesShown: 0, learned: false }
              }
              setSessionState({
                queue: shuffle(cardIndices),
                cardStats: newCardStats,
                learnedCount: 0,
                totalCards,
                currentQueuePos: 0,
                sessionComplete: false,
                completedByEndButton: false,
                originalTotalCards: totalCards,
              })
            }
            setShowSettings(false)
          }}
          className="w-full h-12 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-medium text-base"
        >
          Start Learning
        </button>
      </main>
    )
  }

  if (!set || !set.cards || set.cards.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400 mb-4">
          {!set ? 'Set not found.' : 'This set has no cards.'}
        </p>
        <button
          onClick={() => navigate('/')}
          className="h-10 px-4 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors font-medium text-sm"
        >
          Back to My Sets
        </button>
      </main>
    )
  }

  if (!sessionState) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400 mb-4">Loading session...</p>
      </main>
    )
  }

  function getQuestionType(cardIndex) {
    // BUG 1 & 3: Respect user settings instead of adaptive logic
    if (selectedQuestionType === 'mc') return 'mc'
    if (selectedQuestionType === 'tta') return 'tta'

    // Mixed mode: alternate based on timesShown
    const stats = cardStats[cardIndex]
    if (stats.timesShown === 0) return 'mc'
    if (stats.timesShown % 2 === 1) return 'tta'
    return 'mc'
  }

  function getRandomDirection() {
    // BUG 3: Respect user settings
    if (selectedDirection === 'term') return true
    if (selectedDirection === 'definition') return false
    return Math.random() < 0.5 // mixed
  }

  function generateOptions(correctCard, cardIndex, isTermFirst) {
    const correctValue = isTermFirst ? correctCard.definition : correctCard.term
    const options = [{ value: correctValue, isCorrect: true }]

    const otherCards = set.cards.filter((_, i) => i !== cardIndex)
    const selectedOthers = shuffle(otherCards).slice(0, 3)
    for (const card of selectedOthers) {
      const distractorValue = isTermFirst ? card.definition : card.term
      options.push({ value: distractorValue, isCorrect: false })
    }

    return shuffle(options)
  }

  // BUG 1: Generate options once per card and store in state to prevent reshuffling
  useEffect(() => {
    if (!set || queue.length === 0 || currentQueuePos >= queue.length) return
    const idx = queue[currentQueuePos]
    if (!cardOptions.hasOwnProperty(idx)) {
      const card = set.cards[idx]
      const isTermFirst = cardDirections[idx]
      if (isTermFirst !== undefined) {
        const options = generateOptions(card, idx, isTermFirst)
        setCardOptions(prev => ({ ...prev, [idx]: options }))
      }
    }
  }, [currentQueuePos, queue, cardDirections])

  function handleMCSelection(option) {
    if (isProcessing) return
    setIsProcessing(true)
    setSelectedOption(option)
    setIsShowingAnswer(true)

    const delay = option.isCorrect ? 1200 : 1500
    setTimeout(() => {
      handleAnswer(option.isCorrect)
      setIsProcessing(false)
    }, delay)
  }

  function handleTypeAnswer() {
    if (isProcessing || !userInput.trim()) return
    setIsProcessing(true)

    const currentCardIndex = queue[currentQueuePos]
    const currentCard = set.cards[currentCardIndex]
    const isTermFirst = cardDirections[currentCardIndex]

    const correctAnswer = isTermFirst ? currentCard.definition : currentCard.term
    const sim = similarity(userInput, correctAnswer)

    let isCorrect = false
    let message = ''

    if (sim >= 0.8) {
      isCorrect = true
      message = '✅ Correct!'
    } else if (sim >= 0.6) {
      isCorrect = true
      message = `✅ Close enough! The exact answer: ${correctAnswer}`
    } else {
      isCorrect = false
      message = `❌ Correct answer: ${correctAnswer}`
    }

    setFeedbackMsg(message)
    setFeedbackIsCorrect(isCorrect)
    // BUG 2: Set timeout for both correct and incorrect answers to ensure consistent advancement
    setTimeout(() => {
      handleAnswer(isCorrect)
      setIsProcessing(false)
    }, isCorrect ? 1200 : 1500)
  }

  function handleAnswer(isCorrect) {
    const currentCardIndex = queue[currentQueuePos]
    const newStats = { ...cardStats }

    // BUG 2: Ensure state is reset immediately for proper card advancement
    setIsShowingAnswer(false)
    setSelectedOption(null)
    setUserInput('')
    setFeedbackMsg('')
    setFeedbackIsCorrect(false)

    if (isCorrect) {
      newStats[currentCardIndex].streak++
      newStats[currentCardIndex].timesShown++

      if (newStats[currentCardIndex].streak >= 2) {
        newStats[currentCardIndex].learned = true
        const newLearnedCount = learnedCount + 1

        if (newLearnedCount === totalCards) {
          setSessionState(prev => ({ ...prev, cardStats: newStats, learnedCount: newLearnedCount, sessionComplete: true }))
        } else {
          const newQueue = queue.filter((_, i) => i !== currentQueuePos)
          setSessionState(prev => ({ ...prev, queue: newQueue, cardStats: newStats, learnedCount: newLearnedCount, currentQueuePos: 0 }))
        }
      } else {
        const newQueue = [...queue]
        newQueue.push(newQueue.splice(currentQueuePos, 1)[0])
        setSessionState(prev => ({ ...prev, queue: newQueue, cardStats: newStats }))
      }
    } else {
      newStats[currentCardIndex].streak = 0
      newStats[currentCardIndex].timesShown++

      const newQueue = [...queue]
      const card = newQueue.splice(currentQueuePos, 1)[0]
      const insertPos = Math.min(currentQueuePos + 4, newQueue.length)
      newQueue.splice(insertPos, 0, card)

      setSessionState(prev => ({ ...prev, queue: newQueue, cardStats: newStats }))
    }
  }

  function handleEndSession() {
    setSessionState(prev => ({ ...prev, sessionComplete: true, completedByEndButton: true }))
  }

  function handleRestart() {
    const cardIndices = Array.from({ length: set.cards.length }, (_, i) => i)
    const newCardStats = {}
    for (let i = 0; i < set.cards.length; i++) {
      newCardStats[i] = { streak: 0, timesShown: 0, learned: false }
    }

    setSessionState({
      queue: shuffle(cardIndices),
      cardStats: newCardStats,
      learnedCount: 0,
      totalCards: set.cards.length,
      currentQueuePos: 0,
      sessionComplete: false,
      completedByEndButton: false,
      originalTotalCards: set.cards.length,
    })
  }

  function handleStudyMissedOnly() {
    const unlearned = Object.entries(cardStats)
      .filter(([_, stats]) => !stats.learned)
      .map(([idx]) => parseInt(idx))

    if (unlearned.length === 0) {
      handleRestart()
      return
    }

    const newCardStats = {}
    for (let i = 0; i < totalCards; i++) {
      if (unlearned.includes(i)) {
        newCardStats[i] = { streak: 0, timesShown: 0, learned: false }
      } else {
        newCardStats[i] = cardStats[i]
      }
    }

    setSessionState({
      queue: shuffle(unlearned),
      cardStats: newCardStats,
      learnedCount: 0,
      totalCards: unlearned.length,
      currentQueuePos: 0,
      sessionComplete: false,
      completedByEndButton: false,
      originalTotalCards: set.cards.length,
    })
  }

  useEffect(() => {
    if (sessionComplete) {
      markStudied(id)
    }
  }, [sessionComplete, id, markStudied])

  if (sessionComplete) {
    const learnedCards = Object.entries(cardStats)
      .filter(([_, stats]) => stats.learned)
      .map(([idx]) => parseInt(idx))
    const unlearnedCards = Object.entries(cardStats)
      .filter(([_, stats]) => !stats.learned)
      .map(([idx]) => parseInt(idx))

    const isMissedOnly = originalTotalCards !== set.cards.length
    const allCardsLearned = Object.values(cardStats).every(stats => stats.learned)
    const allLearned = allCardsLearned && !completedByEndButton
    const completionMsg = allLearned
      ? `🎉 You've mastered all ${originalTotalCards} cards!`
      : `Session ended — ${learnedCount} of ${totalCards} learned`

    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-6"
        >
          ← Back
        </button>

        <div className="text-center mb-8">
          {!isMissedOnly && <p className="text-5xl mb-4">🎉</p>}
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">{completionMsg}</h1>
        </div>

        <div className="bg-zinc-800 rounded-lg overflow-hidden mb-8">
          <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-700 font-medium text-sm text-zinc-200">
            <div>Card</div>
            <div>Status</div>
          </div>
          <div className="divide-y divide-zinc-700">
            {set.cards.map((card, i) => {
              if (isMissedOnly && !unlearnedCards.includes(i)) return null
              const isLearned = cardStats[i]?.learned

              return (
                <div key={i} className="grid grid-cols-2 gap-4 p-4 text-sm hover:bg-zinc-750 transition-colors">
                  <div className="text-zinc-300 truncate">{card.term}</div>
                  <div className={isLearned ? 'text-green-400' : 'text-red-400'}>
                    {isLearned ? '✅ Learned' : '❌ Not yet'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={handleRestart}
            className="h-10 px-5 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors font-medium text-sm"
          >
            Restart
          </button>
          {unlearnedCards.length > 0 && (
            <button
              onClick={handleStudyMissedOnly}
              className="h-10 px-5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-medium text-sm"
            >
              Study Missed Only
            </button>
          )}
        </div>
      </main>
    )
  }

  if (queue.length === 0 || currentQueuePos >= queue.length) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400 mb-4">Loading next card...</p>
      </main>
    )
  }

  const currentCardIndex = queue[currentQueuePos]
  const currentCard = set.cards[currentCardIndex]
  const currentStats = cardStats[currentCardIndex]
  const questionType = getQuestionType(currentCardIndex)
  const isTermFirst = cardDirections[currentCardIndex]

  if (isTermFirst === undefined || !cardOptions[currentCardIndex]) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400 mb-4">Preparing question...</p>
      </main>
    )
  }

  const question = isTermFirst ? currentCard.term : currentCard.definition
  const prompt = isTermFirst ? 'Select the correct definition:' : 'Select the correct term:'

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ← Back
        </button>
        <span className="text-sm font-medium text-zinc-300">
          {currentQueuePos + 1} / {queue.length}
        </span>
        <button
          onClick={handleEndSession}
          className="text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          End Session
        </button>
      </div>

      <ProgressBar value={learnedCount / totalCards} label={`${learnedCount} of ${totalCards} learned`} color="green" />

      <div className="mt-8 text-center">
        {questionType === 'mc' ? (
          <>
            <p className="text-zinc-400 text-sm mb-4">{prompt}</p>
            <div className="text-3xl font-bold text-zinc-100 mb-8">{question}</div>

            <div className="grid grid-cols-2 gap-4">
              {cardOptions[currentCardIndex] && cardOptions[currentCardIndex].map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleMCSelection(option)}
                  disabled={isShowingAnswer || isProcessing}
                  className={`p-4 rounded-lg font-medium text-sm transition-all ${
                    selectedOption === option
                      ? option.isCorrect
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                      : isShowingAnswer && option.isCorrect
                        ? 'bg-green-500 text-white'
                        : isShowingAnswer
                          ? 'bg-zinc-600 text-zinc-400'
                          : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
                  } ${isShowingAnswer || isProcessing ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {option.value}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="text-xl font-semibold text-zinc-400 mb-2">{isTermFirst ? 'Definition' : 'Term'}</div>
            <div className="text-3xl font-bold text-zinc-100 mb-8">{question}</div>

            {feedbackMsg && (
              <div className="bg-zinc-700 rounded-lg p-4 mb-6 text-center">
                <p className="text-zinc-200">{feedbackMsg}</p>
              </div>
            )}

            {!feedbackMsg ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTypeAnswer()}
                  placeholder="Type your answer..."
                  autoFocus
                  disabled={isProcessing}
                  className="w-full h-12 px-4 rounded-lg bg-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
                <button
                  onClick={handleTypeAnswer}
                  disabled={!userInput.trim() || isProcessing}
                  className="w-full h-10 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Check Answer
                </button>
              </div>
            ) : feedbackMsg && !feedbackIsCorrect ? (
              <button
                onClick={() => {
                  handleAnswer(false)
                }}
                className="h-10 px-6 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors font-medium text-sm"
              >
                Got it
              </button>
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}
