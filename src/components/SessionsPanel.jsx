const fmtDate = (t) =>
  new Date(t).toLocaleString('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  })
const fmtTime = (t) => new Date(t).toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })

const RESULT = { yes: '✅', no: '❌', gift: '🎁' }

function topScores(scores) {
  return Object.entries(scores || {})
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
}

function EventRow({ e }) {
  if (e.type === 'turn') {
    return (
      <li>
        <span className="ev-time">{fmtTime(e.t)}</span>
        <b>{e.owner}</b>
        {e.helper && <span className="ev-muted"> (🃏 {e.helper} لعب بداله)</span>}
        <span className="ev-slice">{e.slice}</span>
        {e.question && (
          <span className="ev-q">
            {e.question}
            {e.answer && <span className="ev-muted"> ← {e.answer}</span>}
          </span>
        )}
        <span className="ev-result">
          {RESULT[e.result] || ''} {e.points ? `+${e.points}` : ''}
        </span>
      </li>
    )
  }
  const label = e.type === 'undo' ? 'تراجع' : 'تعديل يدوي'
  return (
    <li className="ev-minor">
      <span className="ev-time">{fmtTime(e.t)}</span>
      {label}: {e.name} {e.delta > 0 ? `+${e.delta}` : e.delta}
    </li>
  )
}

function SessionCard({ s, scores, active, onDelete }) {
  const ranking = topScores(scores)
  const turns = s.events.filter((e) => e.type === 'turn').length
  const minutes = Math.max(1, Math.round(((s.endedAt || s.updatedAt) - s.startedAt) / 60000))
  return (
    <details className={`session ${active ? 'active' : ''}`} open={active}>
      <summary>
        <span className="session-date">{fmtDate(s.startedAt)}</span>
        {active && <span className="session-live">الجلسة الحالية</span>}
        <span className="session-meta">
          {turns} دور · {minutes} دقيقة
        </span>
        {ranking[0] && (
          <span className="session-winner">
            🏆 {ranking[0][0]} ({ranking[0][1]})
          </span>
        )}
      </summary>
      {ranking.length > 0 && (
        <div className="session-scores">
          {ranking.map(([name, score]) => (
            <span key={name}>
              {name}: <b>{score}</b>
            </span>
          ))}
        </div>
      )}
      <ol className="session-events">
        {s.events.length ? (
          s.events.map((e, i) => <EventRow key={i} e={e} />)
        ) : (
          <li className="ev-muted">لسه مفيش أدوار</li>
        )}
      </ol>
      {!active && onDelete && (
        <button
          className="btn small danger"
          onClick={() => window.confirm('تمسح الجلسة دي من السجل؟') && onDelete(s.id)}
        >
          امسح الجلسة دي
        </button>
      )}
    </details>
  )
}

export default function SessionsPanel({
  title = '📜 سجل الجلسات',
  sessions,
  active,
  activeScores,
  onDelete,
  onClearAll,
  onClose,
}) {
  const past = [...sessions].reverse()
  return (
    <div className="board-backdrop" onClick={onClose}>
      <aside className="board sessions-board" onClick={(e) => e.stopPropagation()}>
        <header className="board-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="sessions-list">
          {active && <SessionCard s={active} scores={activeScores} active />}
          {past.map((s) => (
            <SessionCard key={s.id} s={s} scores={s.scores} onDelete={onDelete} />
          ))}
          {!active && !past.length && <p className="ev-muted">السجل فاضي</p>}
        </div>
        {past.length > 0 && onClearAll && (
          <button
            className="btn danger"
            onClick={() => window.confirm('تمسح كل الجلسات القديمة من السجل؟') && onClearAll()}
          >
            امسح كل السجل القديم
          </button>
        )}
      </aside>
    </div>
  )
}
