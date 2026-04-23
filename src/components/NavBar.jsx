import { Link, useParams, useLocation } from 'react-router-dom'
import { useSets } from '../hooks/useSets.js'

const MODE_LABELS = {
  flashcards: 'Flashcards',
  learn: 'Learn',
  test: 'Test',
  match: 'Match',
  blast: 'Blast',
  review: 'Review',
}

export default function NavBar() {
  const { id } = useParams()
  const location = useLocation()
  const { sets } = useSets()

  // Determine if we're on a set or mode page
  const set = id ? sets.find(s => s.id === id) : null

  // Detect mode segment: /sets/:id/flashcards -> 'flashcards'
  const modeMatch = id
    ? location.pathname.match(new RegExp(`/sets/${id}/([^/]+)`))
    : null
  const modeSlug = modeMatch ? modeMatch[1] : null
  const modeLabel = modeSlug ? MODE_LABELS[modeSlug] ?? modeSlug : null

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#0a0f1e]/80 border-b border-[rgba(96,165,250,0.18)]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-xl tracking-tight text-white ff-heading" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}>
          FlashForge
        </Link>

        <div className="flex items-center gap-2 text-sm">
          {set ? (
            <>
              <Link to="/" className="text-[#60a5fa]/70 hover:text-[#60a5fa] transition-colors">
                My Sets
              </Link>
              <span className="text-[#60a5fa]/30">›</span>
              <Link
                to={`/sets/${id}`}
                className={`transition-colors ${modeLabel ? 'text-[#60a5fa]/70 hover:text-[#60a5fa]' : 'text-white'}`}
              >
                {set.name}
              </Link>
              {modeLabel && (
                <>
                  <span className="text-[#60a5fa]/30">›</span>
                  <span className="text-white">{modeLabel}</span>
                </>
              )}
            </>
          ) : (
            <Link
              to="/"
              className="text-[#60a5fa]/70 hover:text-[#60a5fa] transition-colors"
            >
              My Sets
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
