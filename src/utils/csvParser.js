const HEADER_TERMS = new Set(['term', 'front', 'word', 'question'])
const HEADER_DEFS = new Set(['definition', 'back', 'meaning', 'answer'])

function parseLine(line, delimiter) {
  const fields = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === delimiter && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current.trim())
  return fields
}

export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (!lines.length) return []

  const delimiter = lines[0].includes('\t') ? '\t' : ','
  const cards = []

  for (const line of lines) {
    const fields = parseLine(line, delimiter)
    if (fields.length < 2) continue
    const term = fields[0]
    const definition = fields[1]
    if (!term || !definition) continue

    if (cards.length === 0) {
      const isHeader =
        HEADER_TERMS.has(term.toLowerCase()) &&
        HEADER_DEFS.has(definition.toLowerCase())
      if (isHeader) continue
    }

    cards.push({ term, definition })
  }

  return cards
}
