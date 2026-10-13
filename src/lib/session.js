import { fullPools, normalizeSegment } from './gameData'
import { newId } from './cloud'

// A profile = players + slices/questions + settings (no scores).
// A session = one meeting played with a copy of a profile: scores, who left
// the names wheel, drawn cards, and a log of every turn. Sessions are saved
// live so a meeting can be continued later, from any device.

const STATE_KEYS = [
  'scores',
  'history',
  'namesPool',
  'bankPools',
  'turnNo',
  'lastAt',
  'lastOwner',
  'lastHelper',
  'lastSeg',
]

export function freshState(players, segments) {
  return {
    scores: {},
    history: [],
    namesPool: players,
    bankPools: fullPools(segments),
    turnNo: 0,
    lastAt: {},
    lastOwner: null,
    lastHelper: null,
    lastSeg: null,
  }
}

export function newSession(players) {
  const now = Date.now()
  return { id: newId('s'), startedAt: now, updatedAt: now, players, events: [] }
}

export function withEvent(d, event) {
  if (!d.session) return d
  const t = Date.now()
  return { ...d, session: { ...d.session, updatedAt: t, events: [...d.session.events, { t, ...event }] } }
}

// Offline fallback history kept in the browser.
export function archiveSession(d) {
  const past = d.sessions || []
  if (!d.session?.events.length) return past
  return [...past, { ...d.session, endedAt: Date.now(), scores: d.scores }]
}

const contentOf = (d) => ({
  players: d.players,
  segments: d.segments,
  settings: { duration: d.duration, timer: d.timer, removeNames: d.removeNames },
})

export function profileDoc(d) {
  return { id: d.profileId, name: d.profileName, ...contentOf(d), updatedAt: Date.now() }
}

export function sessionDoc(d) {
  return {
    id: d.session.id,
    profileId: d.profileId,
    profileName: d.profileName,
    startedAt: d.session.startedAt,
    updatedAt: Date.now(),
    content: contentOf(d),
    state: Object.fromEntries(STATE_KEYS.map((k) => [k, d[k]])),
    events: d.session.events,
  }
}

const settingsOf = (s = {}) => ({
  duration: s.duration ?? 5,
  timer: s.timer ?? 30,
  removeNames: s.removeNames ?? false,
})

// Open a profile: its content with a clean game state, no session yet.
export function dataFromProfile(base, p) {
  const segments = (p.segments || []).map((s, i) => normalizeSegment(s, i))
  return {
    ...base,
    profileId: p.id,
    profileName: p.name,
    players: p.players || [],
    segments,
    ...settingsOf(p.settings),
    ...freshState(p.players || [], segments),
    session: null,
  }
}

// Continue a session exactly where it stopped.
export function dataFromSession(base, s) {
  const { players, segments, settings } = s.content
  return {
    ...base,
    profileId: s.profileId,
    profileName: s.profileName,
    players,
    segments,
    ...settingsOf(settings),
    ...freshState(players, segments),
    ...s.state,
    session: { id: s.id, startedAt: s.startedAt, updatedAt: s.updatedAt, players, events: s.events || [] },
  }
}

// Editing names mid-session: people still on the wheel stay, newcomers are
// added, people already taken off stay off.
export function mergeNamesPool(oldPlayers, oldPool, newPlayers) {
  const left = new Set(oldPool)
  return newPlayers.filter((p) => left.has(p) || !oldPlayers.includes(p))
}

// Editing questions mid-session: questions already drawn (matched by text)
// don't come back; new questions join the pile.
export function mergeBankPools(oldSegments, oldPools, newSegments) {
  const before = Object.fromEntries(oldSegments.map((s) => [s.id, s]))
  const pools = {}
  for (const seg of newSegments) {
    if (seg.type !== 'bank') continue
    const old = before[seg.id]
    if (!old?.questions || !oldPools?.[seg.id]) {
      pools[seg.id] = seg.questions.map((q) => q.id)
      continue
    }
    const left = new Set(oldPools[seg.id])
    const drawn = new Set(old.questions.filter((q) => !left.has(q.id)).map((q) => q.question))
    pools[seg.id] = seg.questions.filter((q) => !drawn.has(q.question)).map((q) => q.id)
  }
  return pools
}
