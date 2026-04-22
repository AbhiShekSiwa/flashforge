import { Link } from 'react-router-dom'

export default function NavBar() {
  return (
    <nav className="sticky top-0 z-50 bg-zinc-800 border-b border-zinc-700">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-indigo-400 tracking-tight">
          FlashForge
        </Link>
        <Link
          to="/"
          className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          My Sets
        </Link>
      </div>
    </nav>
  )
}
