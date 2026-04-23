import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSets } from '../hooks/useSets.js'
import ConfirmModal from '../components/ConfirmModal.jsx'
import { shuffle } from '../utils/shuffle.js'
import { similarity } from '../utils/levenshtein.js'

// ── Question generation helpers ───────────────────────────────────────────────

function generateDistractors(card, allCards, direction) {
  const others = shuffle(allCards.filter(c => c !== card))
  const field = direction === 'term-to-def' ? 'definition' : 'term'
  const distractors = others.slice(0, 3).map(c => c[field])
  // If fewer than 3 unique distractors, pad by mutating copies
  while (distractors.length < 3) {
    distractors.push(distractors[0] + ' (alt)')
  }
  return distractors
}

function assignQuestionTypes(count, enabledTypes) {
  const types = []
  if (enabledTypes.length === 0) return types

  if (enabledTypes.length === 1) {
    for (let i = 0; i < count; i++) types.push(enabledTypes[0])
    return types
  }

  if (enabledTypes.length === 2) {
    // 60/40 split
    const [typeA, typeB] = enabledTypes
    for (let i = 0; i < count; i++) {
      types.push(Math.random() < 0.6 ? typeA : typeB)
    }
    return types
  }

  // All three: ~50% MC, ~30% T/F, ~20% Short Answer
  for (let i = 0; i < count; i++) {
    const r = Math.random()
    if (r < 0.5) types.push('mc')
    else if (r < 0.8) types.push('tf')
    else types.push('short')
  }
  return types
}

function pickDirection(globalDirection, index) {
  if (globalDirection === 'term-to-def') return 'term-to-def'
  if (globalDirection === 'def-to-term') return 'def-to-term'
  return index % 2 === 0 ? 'term-to-def' : 'def-to-term'
}

function buildQuestions(cards, settings) {
  const { questionCount, enabledTypes, direction } = settings
  const selectedCards = shuffle([...cards]).slice(0, questionCount)
  const types = assignQuestionTypes(questionCount, enabledTypes)

  const questions = selectedCards.map((card, idx) => {
    const dir = pickDirection(direction, idx)
    const type = types[idx]
    const prompt = dir === 'term-to-def' ? card.term : card.definition
    const correctAnswer = dir === 'term-to-def' ? card.definition : card.term

    if (type === 'mc') {
      const distractors = generateDistractors(card, cards, dir)
      const options = shuffle([
        { value: correctAnswer, isCorrect: true },
        ...distractors.map(d => ({ value: d, isCorrect: false })),
      ])
      return { type, card, dir, prompt, correctAnswer, options }
    }

    if (type === 'tf') {
      const isActuallyTrue = Math.random() < 0.5
      const otherCards = cards.filter(c => c !== card)
      const field = dir === 'term-to-def' ? 'definition' : 'term'
      const wrongValue = otherCards.length > 0
        ? shuffle(otherCards)[0][field]
        : correctAnswer
      const shownAnswer = isActuallyTrue ? correctAnswer : wrongValue
      return { type, card, dir, prompt, correctAnswer, shownAnswer, isActuallyTrue }
    }

    // short
    return { type, card, dir, prompt, correctAnswer }
  })

  return shuffle(questions)
}

function getLetterGrade(pct) {
  if (pct >= 90) return 'A'
  if (pct >= 80) return 'B'
  if (pct >= 70) return 'C'
  if (pct >= 60) return 'D'
  return 'F'
}

function getGradeColor(grade) {
  switch (grade) {
    case 'A': return 'text-green-400'
    case 'B': return 'text-blue-400'
    case 'C': return 'text-yellow-400'
    case 'D': return 'text-orange-400'
    default: return 'text-red-400'
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Test() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { sets, markStudied } = useSets()
  const set = sets.find(s => s.id === id)

  // ── Screen state: 'settings' | 'test' | 'results'
  const [screen, setScreen] = useState('settings')

  // ── Settings
  const totalCards = set?.cards?.length ?? 0
  const [settings, setSettings] = useState(() => ({
    questionCount: Math.min(20, totalCards),
    enabledTypes: ['mc', 'tf', 'short'],
    direction: 'term-to-def',
  }))

  // ── Test state
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({}) // index → answer value (string or 'True'/'False')

  // ── Results state
  const [results, setResults] = useState(null) // [{correct, userAnswer, correctAnswer, question}]

  // ── Modal
  const [showModal, setShowModal] = useState(false)

  // ── markStudied once on results screen mount ──────────────────────────────
  // screen is READ (in deps), markStudied/id are stable references — NOT set here.
  useEffect(() => {
    if (screen !== 'results') return
    markStudied(id)
  }, [screen]) // eslint-disable-line react-hooks/exhaustive-deps
  // markStudied and id are stable/primitive — safe to omit per useeffect-rules.md
  // (we read `screen`, we do NOT set it inside this effect)

  // ── Early guards ──────────────────────────────────────────────────────────

  if (!set || totalCards === 0) {
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

  // ── Actions ───────────────────────────────────────────────────────────────

  function startTest() {
    const qs = buildQuestions(set.cards, settings)
    setQuestions(qs)
    setAnswers({})
    setResults(null)
    setScreen('test')
  }

  function handleRetakeTest() {
    // Same settings, regenerate questions
    const qs = buildQuestions(set.cards, settings)
    setQuestions(qs)
    setAnswers({})
    setResults(null)
    setScreen('test')
  }

  function handleNewTest() {
    setScreen('settings')
  }

  function requestSubmit() {
    setShowModal(true)
  }

  function gradeAndShowResults() {
    setShowModal(false)
    const graded = questions.map((q, idx) => {
      const userAnswer = answers[idx] ?? ''
      let correct = false

      if (q.type === 'mc') {
        correct = userAnswer === q.correctAnswer
      } else if (q.type === 'tf') {
        const userSaidTrue = userAnswer === 'True'
        correct = userSaidTrue === q.isActuallyTrue
      } else {
        // short answer
        correct = similarity(userAnswer, q.correctAnswer) >= 0.8
      }

      return { correct, userAnswer, correctAnswer: q.correctAnswer, question: q }
    })
    setResults(graded)
    setScreen('results')
  }

  function setAnswer(idx, value) {
    setAnswers(prev => ({ ...prev, [idx]: value }))
  }

  // ── Computed values ───────────────────────────────────────────────────────

  const answeredCount = Object.keys(answers).length
  const allAnswered = questions.length > 0 && answeredCount === questions.length
  const noTypesEnabled = settings.enabledTypes.length === 0

  // ── Settings Screen ───────────────────────────────────────────────────────

  if (screen === 'settings') {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-8"
        >
          ← Back
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">📝 Test — Settings</h1>
          <p className="text-zinc-400 text-sm">Configure your exam before starting</p>
        </div>

        <div className="bg-[#0d1424] rounded-xl p-6 space-y-8 mb-8 border border-blue-500/10">
          {/* Number of questions slider + number input */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">Number of Questions</h2>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={totalCards}
                value={settings.questionCount}
                onChange={e =>
                  setSettings(prev => ({ ...prev, questionCount: Number(e.target.value) }))
                }
                className="flex-1 accent-blue-500"
              />
              <input
                type="number"
                min={1}
                max={totalCards}
                step={1}
                value={settings.questionCount}
                onChange={e => {
                  const val = Math.min(totalCards, Math.max(1, Number(e.target.value) || 1))
                  setSettings(prev => ({ ...prev, questionCount: val }))
                }}
                className="w-20 text-center bg-zinc-700 text-white border border-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-zinc-500 text-xs mt-2">{settings.questionCount} question{settings.questionCount !== 1 ? 's' : ''} · 1 – {totalCards}</p>
          </div>

          {/* Question types checkboxes */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">Question Types</h2>
            <div className="space-y-3">
              {[
                { value: 'mc', label: 'Multiple Choice' },
                { value: 'tf', label: 'True / False' },
                { value: 'short', label: 'Short Answer' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enabledTypes.includes(opt.value)}
                    onChange={e => {
                      setSettings(prev => ({
                        ...prev,
                        enabledTypes: e.target.checked
                          ? [...prev.enabledTypes, opt.value]
                          : prev.enabledTypes.filter(t => t !== opt.value),
                      }))
                    }}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <span className="text-zinc-200">{opt.label}</span>
                </label>
              ))}
            </div>
            {noTypesEnabled && (
              <p className="mt-2 text-sm text-red-400">Select at least one question type.</p>
            )}
          </div>

          {/* Direction radio */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">Direction</h2>
            <div className="space-y-3">
              {[
                { value: 'term-to-def', label: 'Term → Definition' },
                { value: 'def-to-term', label: 'Definition → Term' },
                { value: 'mixed', label: 'Mixed' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="direction"
                    value={opt.value}
                    checked={settings.direction === opt.value}
                    onChange={e =>
                      setSettings(prev => ({ ...prev, direction: e.target.value }))
                    }
                    className="w-4 h-4 accent-blue-500"
                  />
                  <span className="text-zinc-200">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <button
          id="start-test-btn"
          onClick={startTest}
          disabled={noTypesEnabled}
          className="w-full h-12 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Start Test
        </button>
      </main>
    )
  }

  // ── Test Screen ───────────────────────────────────────────────────────────

  if (screen === 'test') {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8 pb-32">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-lg font-semibold text-zinc-100">📝 Test</h1>
          <span className="text-sm text-zinc-500">{set.name}</span>
        </div>

        <div className="space-y-6">
          {questions.map((q, idx) => (
            <QuestionCard
              key={idx}
              index={idx}
              question={q}
              answer={answers[idx]}
              onAnswer={value => setAnswer(idx, value)}
            />
          ))}
        </div>

        {/* Sticky bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#0a0f1e]/95 backdrop-blur border-t border-blue-500/20 px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <span className="text-sm text-zinc-400 shrink-0">
              {answeredCount} / {questions.length} answered
            </span>
            <button
              id="submit-test-btn"
              onClick={requestSubmit}
              disabled={!allAnswered}
              className="flex-1 h-10 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Submit Test
            </button>
          </div>
        </div>

        <ConfirmModal
          isOpen={showModal}
          message="Submit your test? You can't change answers after this."
          confirmLabel="Submit"
          onConfirm={gradeAndShowResults}
          onCancel={() => setShowModal(false)}
        />
      </main>
    )
  }

  // ── Results Screen ────────────────────────────────────────────────────────

  if (screen === 'results' && results) {
    const correctCount = results.filter(r => r.correct).length
    const total = results.length
    const pct = Math.round((correctCount / total) * 100)
    const grade = getLetterGrade(pct)
    const gradeColor = getGradeColor(grade)

    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-8"
        >
          ← Back to Set
        </button>

        {/* Score header */}
        <div className="text-center mb-10">
          <p className={`text-7xl font-black mb-2 ${gradeColor}`}>{grade}</p>
          <h1 className="text-2xl font-bold text-zinc-100 mb-1">
            {correctCount} / {total} — {pct}%
          </h1>
          <p className="text-zinc-400 text-sm">
            {pct >= 90
              ? '🎉 Excellent work!'
              : pct >= 70
              ? '👍 Good effort!'
              : '📖 Keep studying!'}
          </p>
        </div>

        {/* Per-question review */}
        <div className="space-y-4 mb-10">
          {results.map((r, idx) => {
            const q = r.question
            const typeLabel = q.type === 'mc' ? 'MC' : q.type === 'tf' ? 'T/F' : 'Short'
            return (
              <div
                key={idx}
                className={`rounded-xl p-4 border ${
                  r.correct
                    ? 'border-green-500/30 bg-green-900/10'
                    : 'border-red-500/30 bg-red-900/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-base font-semibold text-zinc-100">
                    {r.correct ? '✅' : '❌'} Q{idx + 1}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400 shrink-0">
                    {typeLabel}
                  </span>
                </div>

                {/* Prompt */}
                <p className="text-zinc-300 text-sm mb-3">
                  {q.type === 'tf'
                    ? `${q.prompt} — ${q.shownAnswer}`
                    : q.prompt}
                </p>

                {/* User's answer */}
                <div className="text-sm mb-1">
                  <span className="text-zinc-500">Your answer: </span>
                  <span className={r.correct ? 'text-green-400' : 'text-red-400'}>
                    {r.userAnswer || <em className="text-zinc-500">No answer</em>}
                  </span>
                </div>

                {/* Correct answer */}
                {!r.correct && (
                  <div className="text-sm">
                    <span className="text-zinc-500">Correct answer: </span>
                    <span className="text-green-400">{r.correctAnswer}</span>
                  </div>
                )}
                {r.correct && q.type === 'tf' && (
                  <div className="text-sm text-zinc-500">
                    The statement was{' '}
                    <span className="text-green-400">
                      {q.isActuallyTrue ? 'True' : 'False'}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            id="retake-test-btn"
            onClick={handleRetakeTest}
            className="h-10 px-6 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-semibold text-sm"
          >
            Retake Test
          </button>
          <button
            id="new-test-btn"
            onClick={handleNewTest}
            className="h-10 px-6 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors font-semibold text-sm"
          >
            New Test
          </button>
          <button
            id="back-to-set-btn"
            onClick={() => navigate(-1)}
            className="h-10 px-6 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors font-semibold text-sm"
          >
            Back to Set
          </button>
        </div>
      </main>
    )
  }

  return null
}

// ── QuestionCard sub-component ────────────────────────────────────────────────

function QuestionCard({ index, question: q, answer, onAnswer }) {
  const typeLabel =
    q.type === 'mc' ? 'Multiple Choice' : q.type === 'tf' ? 'True / False' : 'Short Answer'
  const hasAnswer = answer !== undefined && answer !== ''

  return (
    <div
      id={`question-${index + 1}`}
      className={`bg-[#0d1424] rounded-xl p-5 border transition-colors ${
        hasAnswer ? 'border-blue-500/40' : 'border-zinc-700'
      }`}
    >
      {/* Question header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-zinc-100 font-semibold">{index + 1}.</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400">
          {typeLabel}
        </span>
      </div>

      {/* Prompt */}
      {q.type === 'tf' ? (
        <p className="text-zinc-200 mb-4 leading-relaxed">
          <span className="font-medium text-zinc-100">{q.prompt}</span>
          {' — '}
          <span className="text-zinc-300">{q.shownAnswer}</span>
        </p>
      ) : (
        <p className="text-zinc-100 font-medium text-lg mb-4">{q.prompt}</p>
      )}

      {/* Answer input */}
      {q.type === 'mc' && (
        <div className="space-y-2">
          {q.options.map((opt, i) => (
            <label
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                answer === opt.value
                  ? 'bg-blue-600/30 border border-blue-500/60'
                  : 'bg-zinc-700/50 hover:bg-zinc-700 border border-transparent'
              }`}
            >
              <input
                type="radio"
                name={`q-${index}`}
                value={opt.value}
                checked={answer === opt.value}
                onChange={() => onAnswer(opt.value)}
                className="w-4 h-4 accent-blue-500 shrink-0"
              />
              <span className="text-zinc-200 text-sm">{opt.value}</span>
            </label>
          ))}
        </div>
      )}

      {q.type === 'tf' && (
        <div className="flex gap-3">
          {['True', 'False'].map(val => (
            <button
              key={val}
              onClick={() => onAnswer(val)}
              className={`flex-1 h-10 rounded-lg font-semibold text-sm transition-colors ${
                answer === val
                  ? val === 'True'
                    ? 'bg-green-600 text-white'
                    : 'bg-red-600 text-white'
                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
              }`}
            >
              {val === 'True' ? 'True ✓' : 'False ✗'}
            </button>
          ))}
        </div>
      )}

      {q.type === 'short' && (
        <input
          type="text"
          value={answer ?? ''}
          onChange={e => onAnswer(e.target.value)}
          placeholder="Type your answer…"
          className="w-full h-11 px-4 rounded-lg bg-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      )}
    </div>
  )
}
