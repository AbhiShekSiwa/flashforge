import { useState, useEffect } from 'react'

export default function FlipCard({ front, back, flipped: controlledFlipped, onFlip }) {
  const [internalFlipped, setInternalFlipped] = useState(false)

  const isControlled = controlledFlipped !== undefined
  const flipped = isControlled ? controlledFlipped : internalFlipped

  const doFlip = () => {
    if (isControlled) onFlip?.()
    else setInternalFlipped(f => !f)
  }

  // Only handle keyboard in uncontrolled mode — controlled mode parent manages keyboard
  useEffect(() => {
    if (isControlled) return
    function onKey(e) {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        setInternalFlipped(f => !f)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isControlled])

  return (
    <div
      className="relative w-full cursor-pointer select-none"
      style={{ perspective: '1200px', height: '300px' }}
      onClick={doFlip}
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
          style={{ backfaceVisibility: 'hidden', boxShadow: '0 0 60px rgba(37,99,235,0.2)' }}
        >
          <p className="text-2xl font-semibold text-white ff-heading" style={{ fontFamily: "'Syne', sans-serif" }}>{front}</p>
          <p className="absolute bottom-4 text-xs text-[#60a5fa]/40">Click to flip</p>
        </div>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl glass-card p-8 text-center"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', boxShadow: '0 0 60px rgba(37,99,235,0.2)' }}
        >
          <p className="text-2xl font-semibold text-white">{back}</p>
          <p className="absolute bottom-4 text-xs text-[#60a5fa]/40">Click to flip</p>
        </div>
      </div>
    </div>
  )
}
