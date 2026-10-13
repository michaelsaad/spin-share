// Loads the editable game content from public/game-data.json and converts
// question banks to/from the setup screen's text format.
//
// Every slice of the choice wheel is fully described in `segments`. A slice
// of type "bank" carries its own `questions` list, so there can be any number
// of card banks (e.g. two Bible banks and a general one).

export const SEGMENT_TYPES = {
  challenge: { label: 'تحدي', timer: true, points: true },
  bank: { label: 'كروت أسئلة', timer: false, points: true },
  joker: { label: 'جوكر', timer: false, points: false },
  gift: { label: 'هدية نقط', timer: false, points: true },
  spin_again: { label: 'لف تاني', timer: false, points: false },
}

const DEFAULT_TEXT = {
  challenge: '',
  bank: 'اختار كارت',
  joker: 'لبّس حد من صحابك! عجلة الأسماء هتختار مين يلعب بدلك، والنقطة ليك',
  gift: 'مبروك! نقط هدية',
  spin_again: 'لف تاني!',
}

const DEFAULT_EMOJI = { challenge: '⭐', bank: '❓', joker: '🃏', gift: '🎁', spin_again: '🔄' }

const SLICE_COLORS = ['#17406b', '#e8ac3d', '#2f6496', '#f9f0e1', '#c98a2b', '#8c2f39', '#0e2540', '#7a5236', '#1f7a4d']

// Cream text on dark slices, navy text on light ones.
export function textColorFor(bg) {
  const hex = (bg || '#17406b').replace('#', '')
  const n = parseInt(hex.length === 3 ? hex.replace(/./g, '$&$&') : hex, 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#112d4a' : '#f9f0e1'
}

let idCounter = 0
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`

function hash(text) {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return String(h >>> 0)
}

export function withQuestionIds(segId, list) {
  return (Array.isArray(list) ? list : [])
    .filter((q) => q && String(q.question || '').trim())
    .map((q, i) => {
      const item = { id: `${segId}:${i + 1}`, question: String(q.question).trim() }
      if (q.answer != null && String(q.answer).trim()) item.answer = String(q.answer).trim()
      return item
    })
}

export function normalizeSegment(s, i = 0, legacyBanks = {}) {
  const type = SEGMENT_TYPES[s.type] ? s.type : 'challenge'
  const id = String(s.id || `seg${i + 1}`)
  const color = s.color || SLICE_COLORS[i % SLICE_COLORS.length]
  const seg = {
    id,
    emoji: s.emoji ?? DEFAULT_EMOJI[type],
    title: s.title || '',
    text: s.text ?? DEFAULT_TEXT[type],
    type,
    timer: +s.timer || 0,
    points: s.points ?? (type === 'gift' ? 2 : 1),
    color,
    textColor: s.textColor || textColorFor(color),
  }
  // Older files kept banks at the top level and pointed to them with `bank`.
  if (type === 'bank') seg.questions = withQuestionIds(id, s.questions ?? legacyBanks[s.bank])
  return seg
}

export function newSegment(type, index) {
  return normalizeSegment({ id: uid('seg'), type, title: SEGMENT_TYPES[type].label }, index)
}

function normalize(json) {
  return {
    players: (json.players || []).map((p) => String(p).trim()).filter(Boolean),
    segments: (json.segments || []).map((s, i) => normalizeSegment(s, i, json)),
  }
}

// Default content (seed for new profiles), served from public/.
export async function fetchGameData() {
  const res = await fetch('/game-data.json', { cache: 'no-store' })
  if (!res.ok) throw new Error(`game-data.json: ${res.status}`)
  const text = await res.text()
  return { hash: hash(text), content: normalize(JSON.parse(text)) }
}

// Card pools: the question ids not drawn yet, per bank slice.
export function fullPools(segments) {
  return Object.fromEntries(segments.filter((s) => s.type === 'bank').map((s) => [s.id, s.questions.map((q) => q.id)]))
}

// ---------- Setup screen text format ----------
// One question per line; an answer goes on the next line starting with "-".

export function bankToText(list) {
  return list.map((q) => (q.answer ? `${q.question}\n- ${q.answer}` : q.question)).join('\n')
}

export function textToBank(text) {
  const out = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const child = line.match(/^[-–•]\s*(.*)$/)
    if (child && out.length) {
      const answer = child[1].trim()
      if (answer) out[out.length - 1].answer = answer
      continue
    }
    out.push({ question: child ? child[1].trim() : line })
  }
  return out
}
