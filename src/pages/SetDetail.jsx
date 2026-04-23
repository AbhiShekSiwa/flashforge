import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSets } from '../hooks/useSets.js'
import ModeGrid from '../components/ModeGrid.jsx'

export default function SetDetail() {
  const { id } = useParams()
  const { sets, renameSet } = useSets()
  const navigate = useNavigate()

  const set = sets.find(s => s.id === id)

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [editingDesc, setEditingDesc] = useState(false)
  const [description, setDescription] = useState(() => {
    try { return localStorage.getItem(`flashforge_desc_${id}`) || '' } catch { return '' }
  })

  const titleInputRef = useRef(null)
  const descRef = useRef(null)

  // Auto-focus title input when entering edit mode
  // READ: editingTitle; SET: nothing (focus is a DOM side-effect, not state)
  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus()
  }, [editingTitle])

  // Auto-focus desc textarea when entering edit mode
  useEffect(() => {
    if (editingDesc) descRef.current?.focus()
  }, [editingDesc])

  if (!set) {
    return (
      <div className="bg-[#0a0f1e] min-h-screen">
        <main className="max-w-5xl mx-auto px-4 py-16 flex flex-col items-center text-center">
          <p className="text-zinc-400 text-lg mb-4">Set not found.</p>
          <button
            onClick={() => navigate('/')}
            className="h-10 px-4 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors font-medium"
          >
            Back to My Sets
          </button>
        </main>
      </div>
    )
  }

  const createdDate = new Date(set.createdAt).toLocaleDateString()

  function startEditTitle() {
    setTitleDraft(set.name)
    setEditingTitle(true)
  }

  function commitTitle() {
    const trimmed = titleDraft.trim()
    if (trimmed && trimmed !== set.name) renameSet(id, trimmed)
    setEditingTitle(false)
  }

  function handleTitleKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); commitTitle() }
    if (e.key === 'Escape') setEditingTitle(false)
  }

  function commitDesc(value) {
    const trimmed = value.trim()
    setDescription(trimmed)
    try { localStorage.setItem(`flashforge_desc_${id}`, trimmed) } catch {}
    setEditingDesc(false)
  }

  function handleDescKey(e) {
    if (e.key === 'Escape') { commitDesc(e.target.value); }
  }

  return (
    <div className="bg-[#0a0f1e] min-h-screen">
      <main className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/')}
          className="mb-6 text-sm text-[#60a5fa]/70 hover:text-[#60a5fa] transition-colors"
        >
          ← My Sets
        </button>

        {/* Inline-editable title */}
        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={handleTitleKey}
            className="text-4xl font-bold text-white mb-2 w-full bg-transparent border-b-2 border-blue-500/60 focus:outline-none ff-heading"
            style={{ fontFamily: "'Syne', sans-serif" }}
          />
        ) : (
          <h1
            className="text-4xl font-bold text-white mb-2 ff-heading cursor-text hover:text-[#60a5fa]/90 transition-colors group"
            style={{ fontFamily: "'Syne', sans-serif" }}
            onClick={startEditTitle}
            title="Click to edit title"
          >
            {set.name}
            <span className="ml-2 text-base text-[#60a5fa]/30 opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
          </h1>
        )}

        <div className="flex gap-4 text-sm text-[#60a5fa]/40 mb-3">
          <span>{set.cards.length} cards</span>
          <span>Created {createdDate}</span>
        </div>

        <button
          onClick={() => navigate(`/sets/${id}/edit-cards`)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-blue-500/20 text-blue-400/70 hover:text-blue-400 hover:border-blue-500/40 hover:bg-blue-900/10 transition-all mb-6"
        >
          ✏️ Edit Cards
        </button>

        {/* Inline-editable description */}
        {editingDesc ? (
          <textarea
            ref={descRef}
            defaultValue={description}
            onBlur={e => commitDesc(e.target.value)}
            onKeyDown={handleDescKey}
            rows={2}
            className="w-full mb-8 text-sm text-zinc-300 bg-transparent border border-blue-500/30 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500/60 resize-none"
            placeholder="Add a description..."
          />
        ) : (
          <p
            className="mb-8 text-sm cursor-text"
            onClick={() => setEditingDesc(true)}
          >
            {description
              ? <span className="text-zinc-300">{description}</span>
              : <span className="text-[#60a5fa]/30 hover:text-[#60a5fa]/50 transition-colors">Add a description...</span>
            }
          </p>
        )}

        <h2 className="text-xs uppercase tracking-widest text-[#60a5fa]/50 font-medium mb-4">Choose a study mode</h2>
        <ModeGrid />
      </main>
    </div>
  )
}
