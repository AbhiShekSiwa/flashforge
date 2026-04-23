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
          className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl glass-card p-8 text-center"
          style={{ backfaceVisibility: 'hidden', boxShadow: '0 0 60px rgba(124,58,237,0.2)' }}
        >
          <p className="text-2xl font-semibold text-white ff-heading" style={{ fontFamily: "'Syne', sans-serif" }}>{front}</p>
          <p className="absolute bottom-4 text-xs text-[#a78bfa]/40">Click to flip</p>
        </div>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl glass-card p-8 text-center"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', boxShadow: '0 0 60px rgba(124,58,237,0.2)' }}
        >
          <p className="text-2xl font-semibold text-white">{back}</p>
          <p className="absolute bottom-4 text-xs text-[#a78bfa]/40">Click to flip</p>
        </div>
      </div>
    </div>
  )
}
