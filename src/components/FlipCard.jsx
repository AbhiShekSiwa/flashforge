import { useState, useEffect } from 'react'

export default function FlipCard({ front, back }) {
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    function onKey(e) {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        setFlipped(f => !f)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      className="relative w-full cursor-pointer select-none"
      style={{ perspective: '1200px', height: '300px' }}
      onClick={() => setFlipped(f => !f)}
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-zinc-800 border border-zinc-700 p-8 text-center"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <p className="text-2xl font-semibold text-zinc-100">{front}</p>
          <p className="absolute bottom-4 text-xs text-zinc-500">Click to flip</p>
        </div>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-zinc-800 border border-indigo-500/40 p-8 text-center"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <p className="text-2xl font-semibold text-zinc-100">{back}</p>
          <p className="absolute bottom-4 text-xs text-zinc-500">Click to flip</p>
        </div>
      </div>
    </div>
  )
}
