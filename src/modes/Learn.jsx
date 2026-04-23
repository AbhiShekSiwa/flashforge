import { useState, useEffect } from 'react'
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

  const [showSettings, setShowSettings] = useState(true)
  const [settings, setSettings] = useState({ questionType: 'mixed', direction: 'term-to-def' })

  const [queue, setQueue] = useState([])
  const [currentPos, setCurrentPos] = useState(0)
  const [cardStats, setCardStats] = useState({})
  const [learnedCount, setLearnedCount] = useState(0)
  const [options, setOptions] = useState([])
  const [phase, setPhase] = useState('question')
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [isCorrect, setIsCorrect] = useState(null)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)

  // ONE useEffect — generates MC options for the current card
  useEffect(() => {
    if (showSettings) return
    if (queue.length === 0) return
    if (currentPos >= queue.length) return
    if (phase !== 'question') return
    if (!set) return
    const cardIndex = queue[currentPos]
    const card = set.cards[cardIndex]
    setOptions(generateOptions(card, set.cards, getDirection(currentPos)))
  }, [currentPos, phase, showSettings, queue.length])
  // NOTE: options is SET here — must NOT be in the dependency array
  // NOTE: set and cardStats are not in deps to avoid object identity loops

  // ── Helpers ──────────────────────────────────────────────────────────────

  function getDirection(pos) {
    if (settings.direction === 'term-to-def') return 'term-to-def'
    if (settings.direction === 'def-to-term') return 'def-to-term'
    return pos % 2 === 0 ? 'term-to-def' : 'def-to-term'
  }

  function generateOptions(card, allCards, direction) {
    const correctValue = direction === 'term-to-def' ? card.definition : card.term
    const distractors = shuffle(allCards.filter(c => c !== card))
      .slice(0, 3)
      .map(c => ({ value: direction === 'term-to-def' ? c.definition : c.term, isCorrect: false }))
    return shuffle([{ value: correctValue, isCorrect: true }, ...distractors])
  }

  function getQuestionType(cardIndex) {
    const stat = cardStats[cardIndex]
    if (!stat) return 'mc'
    if (settings.questionType === 'mc') return 'mc'
    if (settings.questionType === 'tta') return 'tta'
    // mixed: first show → mc; after wrong (streak=0, timesShown>0) or odd timesShown → tta
    if (stat.timesShown === 0) return 'mc'
    if (stat.streak === 0) return 'tta'
    return stat.timesShown % 2 === 1 ? 'tta' : 'mc'
  }

  // ── Session actions ───────────────────────────────────────────────────────

  const startSession = () => {
    if (!set || set.cards.length === 0) return
    const shuffled = shuffle([...Array(set.cards.length).keys()])
    const initialStats = {}
    shuffled.forEach(i => { initialStats[i] = { streak: 0, timesShown: 0, learned: false } })
    setQueue(shuffled)
    setCurrentPos(0)
    setCardStats(initialStats)
    setLearnedCount(0)
    setPhase('question')
    setOptions([])
    setShowSettings(false)
    // useEffect handles option generation after state settles
  }

  const handleAnswer = (correct) => {
    const cardIndex = queue[currentPos]
    setIsCorrect(correct)
    setPhase('feedback')

    setCardStats(prev => {
      const stat = prev[cardIndex]
      const newStreak = correct ? stat.streak + 1 : 0
      const learned = newStreak >= 2
      const newStats = { ...prev, [cardIndex]: { ...stat, streak: newStreak, timesShown: stat.timesShown + 1, learned } }
      return newStats
    })

    setLearnedCount(prevCount => {
      const stat = cardStats[cardIndex]
      if (!stat) return prevCount
      const newStreak = correct ? stat.streak + 1 : 0
      const learned = newStreak >= 2
      const newCount = (learned && !stat.learned) ? prevCount + 1 : prevCount
      console.log('handleAnswer: cardIndex=', cardIndex, 'correct=', correct, 'streak->', newStreak, 'learnedCount->', newCount)
      return newCount
    })

    if (!correct) {
      setQueue(prev => {
        const next = [...prev]
        const insertAt = Math.min(currentPos + 4, next.length)
        next.splice(insertAt, 0, cardIndex)
        return next
      })
    }

    const delay = correct ? 1200 : 1500
    setTimeout(() => {
      setSelectedAnswer(null)
      setIsCorrect(null)
      setTypedAnswer('')
      setShowAnswer(false)
      setPhase('question')
      setCurrentPos(prev => prev + 1)
    }, delay)
  }

  const handleTypeSubmit = () => {
    if (!set || queue.length === 0) return
    const cardIndex = queue[currentPos]
    const card = set.cards[cardIndex]
    const dir = getDirection(currentPos)
    const correctAnswer = dir === 'term-to-def' ? card.definition : card.term
    const sim = similarity(typedAnswer, correctAnswer)

    if (sim >= 0.8) {
      setShowAnswer(false)
      handleAnswer(true)
    } else if (sim >= 0.6) {
      setShowAnswer(true)
      setIsCorrect(true)
      setPhase('feedback')
      setTimeout(() => {
        setSelectedAnswer(null)
        setIsCorrect(null)
        setTypedAnswer('')
        setShowAnswer(false)
        setPhase('question')
        setCurrentPos(prev => prev + 1)
      }, 1200)
    } else {
      setShowAnswer(true)
      setIsCorrect(false)
      setPhase('feedback')
      // wrong TTA: wait for user to click "Got it" — no auto-advance
    }
  }

  const handleEndSession = () => {
    markStudied(id)
    setPhase('complete')
  }

  const handleRestart = () => {
    if (!set) return
    const shuffled = shuffle([...Array(set.cards.length).keys()])
    const initialStats = {}
    shuffled.forEach(i => { initialStats[i] = { streak: 0, timesShown: 0, learned: false } })
    setQueue(shuffled)
    setCurrentPos(0)
    setCardStats(initialStats)
    setLearnedCount(0)
    setPhase('question')
    setOptions([])
    setSelectedAnswer(null)
    setIsCorrect(null)
    setTypedAnswer('')
    setShowAnswer(false)
  }

  const handleStudyMissedOnly = () => {
    if (!set) return
    const unlearned = Object.entries(cardStats)
      .filter(([, s]) => !s.learned)
      .map(([i]) => parseInt(i))
    if (unlearned.length === 0) { handleRestart(); return }
    const shuffled = shuffle(unlearned)
    const newStats = {}
    unlearned.forEach(i => { newStats[i] = { streak: 0, timesShown: 0, learned: false } })
    setQueue(shuffled)
    setCurrentPos(0)
    setCardStats(newStats)
    setLearnedCount(0)
    setPhase('question')
    setOptions([])
    setSelectedAnswer(null)
    setIsCorrect(null)
    setTypedAnswer('')
    setShowAnswer(false)
  }

  // ── Settings screen ───────────────────────────────────────────────────────

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
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Question Type</h2>
            <div className="space-y-3">
              {[
                { value: 'mc', label: 'Multiple Choice only' },
                { value: 'tta', label: 'Type the Answer only' },
                { value: 'mixed', label: 'Mixed (alternating)', isDefault: true },
              ].map(option => (
                <label key={option.value} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="questionType"
                    value={option.value}
                    checked={settings.questionType === option.value}
                    onChange={e => setSettings(prev => ({ ...prev, questionType: e.target.value }))}
                    className="w-4 h-4 accent-indigo-500"
                  />
                  <span className="ml-3 text-zinc-200">
                    {option.label}
                    {option.isDefault && <span className="text-zinc-400 text-sm ml-1">(default)</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Direction</h2>
            <div className="space-y-3">
              {[
                { value: 'term-to-def', label: 'Term → Definition', isDefault: true },
                { value: 'def-to-term', label: 'Definition → Term' },
                { value: 'mixed', label: 'Mixed' },
              ].map(option => (
                <label key={option.value} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="direction"
                    value={option.value}
                    checked={settings.direction === option.value}
                    onChange={e => setSettings(prev => ({ ...prev, direction: e.target.value }))}
                    className="w-4 h-4 accent-indigo-500"
                  />
                  <span className="ml-3 text-zinc-200">
                    {option.label}
                    {option.isDefault && <span className="text-zinc-400 text-sm ml-1">(default)</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={startSession}
          className="w-full h-12 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-medium text-base"
        >
          Start Learning
        </button>
      </main>
    )
  }

  // ── Post-settings render guards ───────────────────────────────────────────

  if (!set || !set.cards || set.cards.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400 mb-4">{!set ? 'Set not found.' : 'This set has no cards.'}</p>
        <button
          onClick={() => navigate('/')}
          className="h-10 px-4 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors font-medium text-sm"
        >
          Back to My Sets
        </button>
      </main>
    )
  }

  // ── Completion screen ─────────────────────────────────────────────────────

  const isSessionDone = phase === 'complete' || (queue.length > 0 && currentPos >= queue.length)

  if (isSessionDone) {
    const allLearned = Object.values(cardStats).every(s => s.learned)
    const endedEarly = phase === 'complete' && !allLearned
    const totalCards = set.cards.length
    const completionMsg = allLearned
      ? `🎉 You've mastered all ${totalCards} cards!`
      : `Session ended — ${learnedCount} of ${totalCards} learned`
    const unlearnedIndices = Object.entries(cardStats)
      .filter(([, s]) => !s.learned)
      .map(([i]) => parseInt(i))

    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-6"
        >
          ← Back
        </button>

        <div className="text-center mb-8">
          {allLearned && <p className="text-5xl mb-4">🎉</p>}
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">{completionMsg}</h1>
        </div>

        <div className="bg-zinc-800 rounded-lg overflow-hidden mb-8">
          <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-700 font-medium text-sm text-zinc-200">
            <div>Card</div>
            <div>Status</div>
          </div>
          <div className="divide-y divide-zinc-700">
            {set.cards.map((card, i) => {
              const learned = cardStats[i]?.learned
              return (
                <div key={i} className="grid grid-cols-2 gap-4 p-4 text-sm">
                  <div className="text-zinc-300 truncate">{card.term}</div>
                  <div className={learned ? 'text-green-400' : 'text-red-400'}>
                    {learned ? '✅ Learned' : '❌ Not yet'}
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
          {unlearnedIndices.length > 0 && (
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

  // ── Loading guard ─────────────────────────────────────────────────────────

  if (queue.length === 0 || options.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400">Preparing your session…</p>
      </main>
    )
  }

  // ── Active session ────────────────────────────────────────────────────────

  const cardIndex = queue[currentPos]
  const currentCard = set.cards[cardIndex]

  if (!showSettings && queue.length > 0 && !currentCard) {
    return null
  }

  const card = currentCard
  const dir = getDirection(currentPos)
  const questionType = getQuestionType(cardIndex)
  const question = dir === 'term-to-def' ? card.term : card.definition
  const correctAnswer = dir === 'term-to-def' ? card.definition : card.term
  const prompt = dir === 'term-to-def' ? 'Select the correct definition:' : 'Select the correct term:'
  const totalCards = set.cards.length

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
          {currentPos + 1} / {queue.length}
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
              {options.map((option, idx) => {
                let bg = 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
                if (selectedAnswer === option) {
                  bg = option.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                } else if (phase === 'feedback' && option.isCorrect) {
                  bg = 'bg-green-500 text-white'
                } else if (phase === 'feedback') {
                  bg = 'bg-zinc-600 text-zinc-400'
                }
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (phase !== 'question') return
                      setSelectedAnswer(option)
                      handleAnswer(option.isCorrect)
                    }}
                    disabled={phase !== 'question'}
                    className={`p-4 rounded-lg font-medium text-sm transition-all ${bg} ${phase !== 'question' ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {option.value}
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <p className="text-zinc-400 text-sm mb-4">
              {dir === 'term-to-def' ? 'Type the definition:' : 'Type the term:'}
            </p>
            <div className="text-3xl font-bold text-zinc-100 mb-8">{question}</div>

            {showAnswer && (
              <div className={`rounded-lg p-4 mb-6 text-center ${isCorrect ? 'bg-green-900/40' : 'bg-red-900/40'}`}>
                <p className="text-zinc-200">
                  {isCorrect
                    ? `✅ Close enough! The exact answer: ${correctAnswer}`
                    : `❌ Correct answer: ${correctAnswer}`}
                </p>
              </div>
            )}

            {phase === 'question' && (
              <div className="space-y-4">
                <input
                  type="text"
                  value={typedAnswer}
                  onChange={e => setTypedAnswer(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTypeSubmit()}
                  placeholder="Type your answer…"
                  autoFocus
                  className="w-full h-12 px-4 rounded-lg bg-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleTypeSubmit}
                  disabled={!typedAnswer.trim()}
                  className="w-full h-10 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Check Answer
                </button>
              </div>
            )}

            {phase === 'feedback' && !isCorrect && (
              <button
                onClick={() => {
                  setCardStats(prev => {
                    const stat = prev[cardIndex]
                    return { ...prev, [cardIndex]: { ...stat, streak: 0, timesShown: stat.timesShown + 1 } }
                  })
                  setQueue(prev => {
                    const next = [...prev]
                    const insertAt = Math.min(currentPos + 4, next.length)
                    next.splice(insertAt, 0, cardIndex)
                    return next
                  })
                  setSelectedAnswer(null)
                  setIsCorrect(null)
                  setTypedAnswer('')
                  setShowAnswer(false)
                  setPhase('question')
                  setCurrentPos(prev => prev + 1)
                }}
                className="h-10 px-6 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors font-medium text-sm"
              >
                Got it
              </button>
            )}
          </>
        )}
      </div>
    </main>
  )
}
