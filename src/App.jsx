import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Wheel from './components/Wheel'
import OutcomeModal from './components/OutcomeModal'
import SetupScreen from './components/SetupScreen'
import ReactionBar, { REACTIONS, fireReaction } from './components/ReactionBar'
import Scoreboard, { MiniScoreboard } from './components/Scoreboard'
import HomeScreen from './components/HomeScreen'
import SessionsPanel from './components/SessionsPanel'
import { fetchGameData, fullPools } from './lib/gameData'
import { weightedIndex } from './lib/spin'
import { playClip, preloadClips, setMuted, unlockAudio, winSound } from './lib/sound'
import { floatText, shake, shuffled } from './lib/effects'
import { load, save } from './lib/storage'
import { closeMirror, fireConfetti, openMirror, toggleFullscreen, warmScreens } from './lib/screens'
import { createWheelController } from './lib/wheelController'
import {
  archiveSession,
  dataFromProfile,
  dataFromSession,
  freshState,
  mergeBankPools,
  mergeNamesPool,
  newSession,
  profileDoc,
  sessionDoc,
  withEvent,
} from './lib/session'
import * as cloud from './lib/cloud'
import { downloadSave, uploadSave } from './lib/fileStore'
import Brand, { Credit } from './components/Brand'

// [slice, text] pairs in the app palette: navy, cream, gold.
const NAVY = '#112d4a'
const CREAM = '#f9f0e1'
const NAME_COLORS = [
  ['#17406b', CREAM],
  ['#e8ac3d', NAVY],
  [CREAM, NAVY],
  ['#2f6496', CREAM],
  ['#c98a2b', CREAM],
  ['#0e2540', '#e8ac3d'],
]

const SOUNDS = ['laugh', 'applause', 'drumroll', 'crickets', 'wrong', 'trombone', 'correct', 'timeup']
const VERSION = 4
const DEFAULT_PROFILE = 'الافتراضي'

const sameJSON = (a, b) => JSON.stringify(a) === JSON.stringify(b)

function fromFile(content, hash, prev) {
  return {
    version: VERSION,
    fileHash: hash,
    ...content,
    namesPool: content.players,
    bankPools: fullPools(content.segments),
    removeNames: prev?.removeNames ?? false,
    duration: prev?.duration ?? 5,
    timer: prev?.timer ?? 30,
    muted: prev?.muted ?? false,
    scores: prev?.scores ?? {},
    history: prev?.history ?? [],
  }
}

const NO_TURN = { owner: null, ownerIdx: null, helper: null, helperIdx: null }

export default function App() {
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [setupRev, setSetupRev] = useState(0)
  const [screen, setScreen] = useState('home') // home | setup | game
  const [phase, setPhase] = useState('names') // names | choice | helper | result
  const [spinning, setSpinning] = useState(false)
  const [turn, setTurn] = useState(NO_TURN)
  const [segWinner, setSegWinner] = useState(null)
  const [outcome, setOutcome] = useState(null)
  const [timerPaused, setTimerPaused] = useState(false)
  const [boardOpen, setBoardOpen] = useState(false)
  const [mirror, setMirror] = useState(null) // { win, root, full } — the second-screen display window
  const namesWheel = useMemo(() => createWheelController(), [])
  const choiceWheel = useMemo(() => createWheelController(), [])
  const busy = useRef(false)
  const [sessionsView, setSessionsView] = useState(null) // { title, sessions, active, onDelete } for the history panel
  // Profiles + sessions on the server (Cloudflare, or the local dev server).
  const [library, setLibrary] = useState({
    status: 'loading',
    profiles: [],
    sessions: [],
  })
  const [sync, setSync] = useState('idle') // idle | saving | saved | offline
  const dataRef = useRef(null)
  dataRef.current = data
  const defaultsRef = useRef(null) // public/game-data.json content (seed for new profiles)
  // The state as restored on page load: not a change, so it isn't uploaded
  // (otherwise a device could bring back a session deleted elsewhere).
  const loadedRef = useRef(null)

  // The data file wins whenever it changed since the last visit; otherwise
  // keep what was saved (including edits made on the setup screen).
  async function loadFile(force) {
    try {
      const { hash, content } = await fetchGameData()
      defaultsRef.current = content
      const saved = load()
      const current = saved?.version === VERSION
      const next =
        current && saved.fileHash === hash && !force
          ? saved
          : fromFile(content, hash, saved?.version >= 3 ? saved : null)
      const restored = { profileName: DEFAULT_PROFILE, ...next }
      loadedRef.current = restored
      setData(restored)
      setSetupRev((r) => r + 1)
      setLoadError(null)
    } catch (err) {
      setLoadError(String(err))
    }
  }

  async function refreshLibrary() {
    try {
      let [profiles, sessions] = await Promise.all([cloud.listProfiles(), cloud.listSessions()])
      // First run on a new server: seed it with the bundled default profile.
      if (!profiles.length && defaultsRef.current) {
        const c = defaultsRef.current
        // Fixed id, so two windows seeding at once write the same profile.
        await cloud.putProfile({
          id: 'default',
          name: DEFAULT_PROFILE,
          players: c.players,
          segments: c.segments,
          settings: { duration: 5, timer: 30, removeNames: false },
          updatedAt: Date.now(),
        })
        profiles = await cloud.listProfiles()
      }
      profiles.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))
      sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      setLibrary({ status: 'online', profiles, sessions })
    } catch {
      setLibrary((l) => ({ ...l, status: 'offline' }))
    }
  }

  useEffect(() => {
    loadFile(false).then(refreshLibrary)
    warmScreens()
  }, [])
  useEffect(() => {
    if (data) save(data)
  }, [data])

  // Every change to a running session is saved to the server (debounced).
  useEffect(() => {
    if (!data?.session || data === loadedRef.current) return
    setSync('saving')
    const timer = setTimeout(() => {
      cloud
        .putSession(sessionDoc(data))
        .then(() => setSync('saved'))
        .catch(() => setSync('offline'))
    }, 800)
    return () => clearTimeout(timer)
  }, [data])
  useEffect(() => setMuted(!!data?.muted), [data?.muted])

  const segments = data?.segments ?? []
  const helperList = useMemo(() => (data?.players ?? []).filter((p) => p !== turn.owner), [data?.players, turn.owner])
  const segLabels = useMemo(() => segments.map((s) => `${s.emoji} ${s.title}`.trim()), [segments])
  const segColors = useMemo(() => segments.map((s) => (s.color ? [s.color, s.textColor || CREAM] : null)), [segments])

  // ---------- scores ----------

  function changeScore(name, delta, { record = true } = {}) {
    setData((d) => ({
      ...d,
      scores: { ...d.scores, [name]: (d.scores[name] || 0) + delta },
      history: record ? [...d.history, { name, delta }].slice(-100) : d.history,
    }))
  }

  function logEvent(event) {
    setData((d) => withEvent(d, event))
  }

  function undo() {
    const last = data.history[data.history.length - 1]
    if (!last) return
    setData((d) =>
      withEvent(
        {
          ...d,
          scores: { ...d.scores, [last.name]: (d.scores[last.name] || 0) - last.delta },
          history: d.history.slice(0, -1),
        },
        { type: 'undo', name: last.name, delta: -last.delta },
      ),
    )
    floatText(`↶ ${last.name}`)
  }

  function resetBank(seg) {
    setData((d) => ({ ...d, bankPools: { ...d.bankPools, [seg.id]: seg.questions.map((q) => q.id) } }))
  }

  function resetAll() {
    setData((d) => ({
      ...d,
      sessions: library.status === 'online' ? d.sessions : archiveSession(d),
      session: newSession(d.players),
      ...freshState(d.players, d.segments),
    }))
    endTurn(false)
  }

  // ---------- home: profiles + sessions ----------

  async function guard(fn) {
    try {
      await fn()
    } catch (err) {
      window.alert(`حصلت مشكلة في الاتصال بالسيرفر: ${err.message || err}`)
      refreshLibrary()
    }
  }

  function openEditor(next) {
    setData(next)
    endTurn(false)
    setSetupRev((r) => r + 1)
    setScreen('setup')
  }

  const homeActions = {
    refresh: refreshLibrary,
    openProfile: (p) =>
      guard(async () => {
        const doc = await cloud.getProfile(p.id)
        if (doc) openEditor(dataFromProfile(dataRef.current, doc))
      }),
    newProfile: () => {
      const c = defaultsRef.current || dataRef.current
      openEditor(
        dataFromProfile(dataRef.current, {
          id: cloud.newId('p'),
          name: 'بروفايل جديد',
          players: c.players,
          segments: c.segments,
        }),
      )
    },
    duplicateProfile: (p) =>
      guard(async () => {
        const doc = await cloud.getProfile(p.id)
        if (!doc) return
        await cloud.putProfile({ ...doc, id: cloud.newId('p'), name: `${doc.name} (نسخة)`, updatedAt: Date.now() })
        await refreshLibrary()
      }),
    deleteProfile: (p) =>
      guard(async () => {
        if (!window.confirm(`تمسح البروفايل "${p.name}"؟ الجلسات اللي اتلعبت بيه هتفضل موجودة.`)) return
        await cloud.deleteProfile(p.id)
        await refreshLibrary()
      }),
    continueSession: (s) =>
      guard(async () => {
        const doc = await cloud.getSession(s.id)
        if (doc) openEditor(dataFromSession(dataRef.current, doc))
      }),
    viewSession: (s) =>
      guard(async () => {
        const doc = await cloud.getSession(s.id)
        if (!doc) return
        setSessionsView({
          title: `📜 ${doc.profileName}`,
          sessions: [
            {
              id: doc.id,
              startedAt: doc.startedAt,
              updatedAt: doc.updatedAt,
              events: doc.events || [],
              scores: doc.state?.scores,
            },
          ],
        })
      }),
    deleteSession: (s) =>
      guard(async () => {
        if (!window.confirm('تمسح الجلسة دي نهائي؟')) return
        await cloud.deleteSession(s.id)
        if (dataRef.current?.session?.id === s.id) setData((d) => ({ ...d, session: null }))
        await refreshLibrary()
      }),
    continueLocal: () => openEditor(dataRef.current),
    editLocal: () => openEditor(dataRef.current),
    showLocalHistory: () =>
      setSessionsView({
        sessions: dataRef.current.sessions || [],
        active: dataRef.current.session,
        local: true,
      }),
    download: () => downloadSave(dataRef.current),
    upload: async () => {
      try {
        const saved = await uploadSave()
        if (window.confirm('تفتح النسخة دي؟')) openEditor({ ...saved.state, version: VERSION })
      } catch (err) {
        window.alert(err.message || String(err))
      }
    },
  }

  function goHome() {
    if (document.fullscreenElement) document.exitFullscreen()
    stopMirror()
    endTurn(false)
    setScreen('home')
    refreshLibrary()
  }

  async function saveProfile(cfg) {
    const d = dataRef.current
    const next = { ...d, ...cfg, profileId: d.profileId || cloud.newId('p') }
    setData((cur) => ({ ...cur, profileId: next.profileId, profileName: cfg.profileName }))
    await guard(async () => {
      await cloud.putProfile(profileDoc(next))
      floatText(`💾 ${cfg.profileName}`)
    })
  }

  // ---------- setup ----------

  function startGame(cfg, secondScreen) {
    unlockAudio()
    preloadClips(SOUNDS)
    if (secondScreen) startMirror()
    const d = dataRef.current
    const next = {
      ...d,
      profileName: cfg.profileName,
      profileId: d.profileId || cloud.newId('p'),
      duration: cfg.duration,
      timer: cfg.timer,
      removeNames: cfg.removeNames,
      players: cfg.players,
      segments: cfg.segments,
      namesPool: mergeNamesPool(d.players || [], d.namesPool || [], cfg.players),
      bankPools: mergeBankPools(d.segments || [], d.bankPools, cfg.segments),
      session: d.session ? { ...d.session, players: cfg.players } : newSession(cfg.players),
    }
    setData(next)
    // The profile keeps the latest names/questions; the session saves itself.
    cloud.putProfile(profileDoc(next)).catch(() => {})
    endTurn(false)
    setScreen('game')
  }

  // ---------- second screen ----------

  function startMirror() {
    const win = openMirror()
    if (!win) {
      window.alert('المتصفح منع فتح شباك العرض. اسمح بالـ pop-ups للصفحة دي (من شريط العنوان) وجرّب تاني.')
      return
    }
    setMirror({ win, root: win.document.getElementById('root'), full: false })
  }

  function stopMirror() {
    closeMirror()
    setMirror(null)
  }

  // Notice when the display window is closed, and track its fullscreen state.
  useEffect(() => {
    if (!mirror) return
    const { win } = mirror
    const onFull = () => setMirror((m) => m && { ...m, full: !!win.document.fullscreenElement })
    const onDbl = () => toggleFullscreen(win.document)
    win.document.addEventListener('fullscreenchange', onFull)
    win.document.addEventListener('dblclick', onDbl)
    const poll = setInterval(() => win.closed && setMirror(null), 800)
    return () => {
      clearInterval(poll)
      if (!win.closed) {
        win.document.removeEventListener('fullscreenchange', onFull)
        win.document.removeEventListener('dblclick', onDbl)
      }
    }
  }, [mirror?.win])

  function backToSetup() {
    if (document.fullscreenElement) document.exitFullscreen()
    stopMirror()
    setSetupRev((r) => r + 1)
    setScreen('setup')
  }

  // ---------- turn flow ----------

  function endTurn(removeOwner = true) {
    if (removeOwner && data?.removeNames && turn.ownerIdx != null) {
      const idx = turn.ownerIdx
      setData((d) => ({ ...d, namesPool: d.namesPool.filter((_, i) => i !== idx) }))
    }
    setTurn(NO_TURN)
    setOutcome(null)
    setSegWinner(null)
    setPhase('names')
  }

  async function spin(wheel, idx, n) {
    busy.current = true
    setSpinning(true)
    await wheel.spin(idx, n, data.duration)
    setSpinning(false)
    busy.current = false
    winSound()
  }

  // Weighted random: never the same person twice in a row, and the longer
  // someone has waited since their last pick, the likelier they come up.
  function nameWeights(list, last) {
    const now = data.turnNo || 0
    const lastAt = data.lastAt || {}
    return list.map((name) =>
      name === last && list.length > 1 ? 0 : (now - (lastAt[name] ?? -data.players.length)) ** 2,
    )
  }

  async function spinNames(role) {
    // The joker draws from every player (even ones already taken off the
    // names wheel), except the player whose turn it is.
    const list = role === 'helper' ? helperList : data.namesPool
    if (!list.length) {
      if (role === 'helper') setPhase('choice') // nobody else: the owner plays it
      return
    }
    const idx = weightedIndex(nameWeights(list, role === 'helper' ? data.lastHelper : data.lastOwner))
    const name = list[idx]
    if (role === 'owner') setTurn(NO_TURN)
    await spin(namesWheel, idx, list.length)
    fireConfetti({ particleCount: 90, spread: 80, origin: { x: 0.8, y: 0.55 } })
    setData((d) => ({
      ...d,
      turnNo: (d.turnNo || 0) + 1,
      lastAt: { ...d.lastAt, [name]: d.turnNo || 0 },
      [role === 'owner' ? 'lastOwner' : 'lastHelper']: name,
    }))
    if (role === 'owner') setTurn({ ...NO_TURN, owner: name, ownerIdx: idx })
    else setTurn((t) => ({ ...t, helper: name, helperIdx: idx }))
    setPhase('choice')
  }

  async function spinChoice() {
    let candidates = segments.map((_, i) => i)
    // A helper is already standing in, so they can't pass it on again.
    if (turn.helper) candidates = candidates.filter((i) => segments[i].type !== 'joker')
    // Never the same slice twice in a row.
    const weights = candidates.map((i) => (segments[i].id === data.lastSeg && candidates.length > 1 ? 0 : 1))
    const idx = candidates[weightedIndex(weights)]
    setSegWinner(null)
    await spin(choiceWheel, idx, segments.length)
    setSegWinner(idx)
    setData((d) => ({ ...d, lastSeg: segments[idx].id }))
    openOutcome(segments[idx])
  }

  function openOutcome(seg) {
    setTimerPaused(false)
    let stage = 'challenge'
    let extra = {}
    if (seg.type === 'bank') {
      const left = data.bankPools[seg.id] || []
      stage = left.length ? 'pick' : 'empty'
      extra = { order: shuffled(left), cursor: null, picking: null, flipped: null }
    } else if (seg.type === 'joker') stage = 'joker'
    else if (seg.type === 'spin_again') stage = 'again'
    else if (seg.type === 'gift') {
      stage = 'gift'
      changeScore(turn.owner, seg.points ?? 2)
      logEvent({
        type: 'turn',
        owner: turn.owner,
        helper: turn.helper,
        slice: `${seg.emoji} ${seg.title}`,
        result: 'gift',
        points: seg.points ?? 2,
      })
      playClip('applause', { maxSec: 4 })
      floatText(`+${seg.points ?? 2} 🎁 ${turn.owner}`)
    }
    fireConfetti({ particleCount: 140, spread: 110, origin: { y: 0.6 }, zIndex: 300 })
    setOutcome({ seg, stage, ...extra })
    setPhase('result')
  }

  // Picking a card: its pinwheel spins up, then the card flips, then the question shows.
  function pickCard(i) {
    if (!outcome || outcome.stage !== 'pick' || outcome.picking != null || outcome.flipped != null) return
    const id = outcome.order[i]
    const seg = outcome.seg
    const question = seg.questions.find((q) => q.id === id)
    setData((d) => ({
      ...d,
      bankPools: { ...d.bankPools, [seg.id]: (d.bankPools[seg.id] || []).filter((x) => x !== id) },
    }))
    setOutcome((o) => ({ ...o, picking: i, cursor: i }))
    playClip('drumroll', { maxSec: 0.7, volume: 0.5 })
    setTimeout(() => {
      setOutcome((o) => o && { ...o, picking: null, flipped: i })
      playClip('correct', { volume: 0.5 })
    }, 650)
    setTimeout(() => setOutcome((o) => o && { ...o, stage: 'question', question, revealed: false }), 1550)
  }

  // null = no card selected (mouse left the cards).
  function hoverCard(i) {
    setOutcome((o) =>
      o && o.stage === 'pick' && o.picking == null && o.flipped == null && o.cursor !== i ? { ...o, cursor: i } : o,
    )
  }

  function moveCursor(step) {
    setOutcome((o) => {
      if (!o || o.stage !== 'pick' || o.picking != null || o.flipped != null) return o
      const n = o.order.length
      if (o.cursor == null) return { ...o, cursor: step > 0 ? 0 : n - 1 }
      return { ...o, cursor: (o.cursor + step + n) % n }
    })
  }

  function reveal() {
    if (outcome?.stage !== 'question' || !outcome.question.answer || outcome.revealed) return
    setOutcome((o) => ({ ...o, revealed: true }))
    playClip('drumroll', { maxSec: 1.2, volume: 0.6 })
  }

  function resolve(success) {
    if (!outcome) return
    const { seg, question } = outcome
    logEvent({
      type: 'turn',
      owner: turn.owner,
      helper: turn.helper,
      slice: `${seg.emoji} ${seg.title}`,
      question: question?.question || (seg.type === 'challenge' ? seg.text : undefined),
      answer: question?.answer,
      result: success ? 'yes' : 'no',
      points: success ? (seg.points ?? 1) : 0,
    })
    if (success) {
      const points = outcome.seg.points ?? 1
      changeScore(turn.owner, points)
      playClip('correct')
      fireConfetti({ particleCount: 160, spread: 120, origin: { y: 0.6 }, zIndex: 300 })
      floatText(`+${points} ⭐ ${turn.owner}`)
    } else {
      playClip('wrong')
      shake()
    }
    endTurn()
  }

  function continueOutcome() {
    if (!outcome) return
    if (outcome.stage === 'joker') {
      setOutcome(null)
      setPhase('helper')
    } else if (outcome.stage === 'again') {
      setOutcome(null)
      setSegWinner(null)
      setPhase('choice')
    } else if (outcome.stage === 'gift') {
      endTurn()
    }
  }

  async function press() {
    if (busy.current || !data) return
    unlockAudio()
    if (boardOpen) return setBoardOpen(false)
    if (phase === 'names') return spinNames('owner')
    if (phase === 'helper') return spinNames('helper')
    if (phase === 'choice') return spinChoice()
    if (!outcome) return
    // First press selects a card, the next one picks it.
    if (outcome.stage === 'pick') return outcome.cursor == null ? moveCursor(1) : pickCard(outcome.cursor)
    if (outcome.stage === 'question') return reveal()
    continueOutcome()
  }

  // Keyboard control so everything can be driven from the laptop (or a clicker)
  // while the wheels are on the second screen.
  const actions = useRef()
  actions.current = { press, resolve, reveal, moveCursor, undo, outcome }
  useEffect(() => {
    if (screen !== 'game') return
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select')) return
      const a = actions.current
      const code = e.code
      const picking = a.outcome?.stage === 'pick'
      const scoring = ['challenge', 'question'].includes(a.outcome?.stage)
      if (picking && (code === 'ArrowLeft' || code === 'ArrowRight')) {
        e.preventDefault()
        a.moveCursor(code === 'ArrowLeft' ? 1 : -1) // RTL: left = next
      } else if (['Space', 'Enter', 'NumpadEnter', 'PageDown', 'ArrowRight', 'ArrowLeft'].includes(code)) {
        e.preventDefault()
        a.press()
      } else if (/^(Digit|Numpad)[1-6]$/.test(code)) {
        fireReaction(REACTIONS[+code.slice(-1) - 1])
      } else if (scoring && (code === 'KeyY' || code === 'NumpadAdd' || code === 'Equal')) {
        a.resolve(true)
      } else if (scoring && (code === 'KeyN' || code === 'NumpadSubtract' || code === 'Minus')) {
        a.resolve(false)
      } else if (code === 'KeyR') {
        a.reveal()
      } else if (code === 'KeyT') {
        setTimerPaused((p) => !p)
      } else if (code === 'KeyS') {
        setBoardOpen((o) => !o)
      } else if (code === 'KeyZ') {
        a.undo()
      } else if (code === 'Escape') {
        setBoardOpen(false)
      }
    }
    // Keys work from the laptop and from the display window.
    const wins = [window, mirror?.win].filter((w) => w && !w.closed)
    wins.forEach((w) => w.addEventListener('keydown', onKey))
    return () => wins.forEach((w) => !w.closed && w.removeEventListener('keydown', onKey))
  }, [screen, mirror?.win])

  // ---------- render ----------

  if (!data) {
    return (
      <div className="loading">
        <div className="loading-brand">
          <Brand />
        </div>
        {loadError ? <p className="hint">مش قادر أقرا game-data.json: {loadError}</p> : <p>...</p>}
      </div>
    )
  }

  const historyPanel = sessionsView && (
    <SessionsPanel
      title={sessionsView.title}
      sessions={sessionsView.sessions}
      active={sessionsView.active}
      activeScores={data.scores}
      onDelete={
        sessionsView.local
          ? (id) => {
              setData((d) => ({ ...d, sessions: (d.sessions || []).filter((x) => x.id !== id) }))
              setSessionsView((v) => ({ ...v, sessions: v.sessions.filter((x) => x.id !== id) }))
            }
          : null
      }
      onClearAll={
        sessionsView.local
          ? () => {
              setData((d) => ({ ...d, sessions: [] }))
              setSessionsView((v) => ({ ...v, sessions: [] }))
            }
          : null
      }
      onClose={() => setSessionsView(null)}
    />
  )

  if (screen === 'home') {
    const s = data.session
    const turns = s?.events.filter((e) => e.type === 'turn').length || 0
    const local = s && turns ? { profileName: data.profileName, startedAt: s.startedAt, turns } : null
    return (
      <>
        <HomeScreen library={library} local={local} actions={homeActions} />
        {historyPanel}
      </>
    )
  }

  if (screen === 'setup') {
    return <SetupScreen key={setupRev} data={data} onStart={startGame} onSaveProfile={saveProfile} onHome={goHome} />
  }

  // While a joker is being played the names wheel shows everyone but the owner.
  const jokerMode = phase === 'helper' || !!turn.helper
  const names = jokerMode ? helperList : data.namesPool
  const namesEmpty = phase === 'names' && !names.length
  const buttonLabel = spinning
    ? '...'
    : phase === 'names'
      ? 'لفّ الأسماء'
      : phase === 'helper'
        ? '🃏 مين هيلعب بدلك؟'
        : phase === 'choice'
          ? 'لفّ عجلة الاختيار'
          : '...'
  const bankStats = segments
    .filter((s) => s.type === 'bank')
    .map((s) => ({
      emoji: s.emoji,
      title: s.title,
      left: data.bankPools[s.id]?.length ?? 0,
      total: s.questions.length,
    }))

  // The same view is rendered on the laptop and (without the host controls)
  // into the display window on the second screen.
  const gameView = (isMirror) => (
    <div className="game">
      <header className="game-head">
        <Brand small />
        {!isMirror && (
          <div className="toolbar">
            <button
              className={`icon-btn ${mirror ? 'on' : ''}`}
              onClick={() => (mirror ? stopMirror() : startMirror())}
              title={mirror ? 'اقفل شاشة العرض' : 'افتح شاشة العرض على الشاشة التانية'}
            >
              🖥
            </button>
            <button className="icon-btn" onClick={undo} disabled={!data.history.length} title="تراجع عن آخر نقطة (Z)">
              ↶
            </button>
            <span
              className={`save-dot ${sync === 'offline' ? 'needs-permission' : 'connected'}`}
              title={
                sync === 'offline'
                  ? 'مفيش اتصال بالسيرفر: متحفظ على الجهاز وهيترفع لما النت يرجع'
                  : sync === 'saving'
                    ? 'بيحفظ...'
                    : 'الجلسة متحفظة على السيرفر'
              }
            >
              💾
            </span>
            <button className="icon-btn" onClick={goHome} disabled={spinning} title="الرئيسية">
              🏠
            </button>
            <button className="icon-btn" onClick={() => setBoardOpen(true)} title="النقط (S)">
              🏆
            </button>
            <button className="icon-btn" onClick={() => setData((d) => ({ ...d, muted: !d.muted }))} title="الصوت">
              {data.muted ? '🔇' : '🔊'}
            </button>
            <button className="icon-btn" onClick={() => toggleFullscreen()} title="ملء الشاشة">
              ⛶
            </button>
            <button className="icon-btn" onClick={backToSetup} disabled={spinning} title="الإعداد">
              ⚙
            </button>
          </div>
        )}
      </header>

      <main className="stage">
        <section className={`wheel-col ${phase === 'names' || phase === 'helper' ? 'active' : ''}`}>
          <h2>
            الأسماء <span className="count">{names.length}</span>
          </h2>
          <Wheel
            controller={namesWheel}
            items={names}
            palette={NAME_COLORS}
            winnerIndex={jokerMode ? turn.helperIdx : turn.ownerIdx}
          />
        </section>

        <section className="center-col">
          <div className={`now-card ${turn.owner ? 'show' : ''}`}>
            <div className="now-label">الدور على</div>
            <div className="now-name">{turn.owner || '؟'}</div>
            {turn.helper && <div className="now-helper">🃏 {turn.helper} بيلعب بداله</div>}
          </div>
          <button className="spin-btn" onClick={press} disabled={spinning || namesEmpty || phase === 'result'}>
            {buttonLabel}
          </button>
          {namesEmpty && (
            <button className="btn" onClick={() => setData((d) => ({ ...d, namesPool: d.players, lastOwner: null }))}>
              خلصت الأسماء! رجّعهم
            </button>
          )}
          <MiniScoreboard players={data.players} scores={data.scores} current={turn.owner} />
        </section>

        <section className={`wheel-col ${phase === 'choice' ? 'active' : ''}`}>
          <h2>عجلة الاختيار</h2>
          <Wheel
            controller={choiceWheel}
            items={segLabels}
            colors={segColors}
            palette={NAME_COLORS}
            winnerIndex={segWinner}
          />
        </section>
      </main>

      {phase === 'result' && outcome && (
        <OutcomeModal
          outcome={outcome}
          mirror={isMirror}
          owner={turn.owner}
          helper={turn.helper}
          bankLeft={data.bankPools[outcome.seg.id]?.length ?? 0}
          timerSeconds={data.timer}
          timerPaused={timerPaused}
          onToggleTimer={() => setTimerPaused((p) => !p)}
          onPickCard={pickCard}
          onHoverCard={hoverCard}
          onReveal={reveal}
          onResolve={resolve}
          onContinue={continueOutcome}
          onResetBank={() => {
            const ids = outcome.seg.questions.map((q) => q.id)
            resetBank(outcome.seg)
            setOutcome((o) => ({
              ...o,
              stage: 'pick',
              order: shuffled(ids),
              cursor: null,
              picking: null,
              flipped: null,
            }))
          }}
        />
      )}

      {boardOpen && (
        <Scoreboard
          players={data.players}
          scores={data.scores}
          canUndo={data.history.length > 0}
          bankStats={bankStats}
          onChange={(name, delta) => {
            changeScore(name, delta)
            logEvent({ type: 'adjust', name, delta })
          }}
          onUndo={undo}
          onResetScores={() => setData((d) => ({ ...d, scores: {}, history: [] }))}
          onResetBanks={() => setData((d) => ({ ...d, bankPools: fullPools(d.segments) }))}
          onResetAll={resetAll}
          onClose={() => setBoardOpen(false)}
        />
      )}

      {!isMirror && <ReactionBar />}
      {isMirror && !mirror?.full && (
        <button className="mirror-full-hint" onClick={() => toggleFullscreen(mirror.win.document)}>
          ⛶ اضغط هنا لملء الشاشة
        </button>
      )}
      <Credit className="credit-corner" />
    </div>
  )

  return (
    <>
      {gameView(false)}
      {mirror && !mirror.win.closed && createPortal(gameView(true), mirror.root)}
    </>
  )
}
