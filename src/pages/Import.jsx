import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSets } from '../hooks/useSets.js'
import { parseCSV } from '../utils/csvParser.js'

export default function Import() {
  const { addSet } = useSets()
  const navigate = useNavigate()
  const [rawText, setRawText] = useState('')
  const [name, setName] = useState('')

  const cards = rawText.trim() ? parseCSV(rawText) : []
  const canSave = name.trim().length > 0 && cards.length > 0
  const preview = cards.slice(0, 5)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = evt => setRawText(evt.target.result)
    reader.readAsText(file)
  }

  function handleSave() {
    if (!canSave) return
    addSet(name.trim(), cards)
    navigate('/')
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-100 mb-8">Import Set</h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Set Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Spanish Vocab Chapter 3"
            className="w-full h-10 rounded-lg bg-zinc-800 border border-zinc-700 px-4 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Paste CSV / TSV
          </label>
          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            rows={8}
            placeholder={"term\tdefinition\napple\ta round fruit\ncat\ta small feline"}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3 text-zinc-100 placeholder-zinc-500 font-mono text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-y"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Or upload a file
          </label>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleFile}
            className="text-sm text-zinc-400 file:mr-4 file:h-9 file:px-4 file:rounded-lg file:border-0 file:bg-zinc-700 file:text-zinc-300 hover:file:bg-zinc-600 file:transition-colors file:cursor-pointer file:font-medium"
          />
        </div>

        {cards.length > 0 && (
          <div>
            <p className="text-sm text-zinc-400 mb-3">
              {cards.length} card{cards.length !== 1 ? 's' : ''} detected
              {cards.length > 5 ? ` — showing first ${preview.length}` : ''}
            </p>
            <div className="rounded-xl border border-zinc-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-800 border-b border-zinc-700">
                    <th className="px-4 py-2.5 text-left text-zinc-400 font-medium">Term</th>
                    <th className="px-4 py-2.5 text-left text-zinc-400 font-medium">Definition</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((card, i) => (
                    <tr key={i} className="border-t border-zinc-800">
                      <td className="px-4 py-2.5 text-zinc-300">{card.term}</td>
                      <td className="px-4 py-2.5 text-zinc-300">{card.definition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full h-11 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save Set
        </button>
      </div>
    </main>
  )
}
