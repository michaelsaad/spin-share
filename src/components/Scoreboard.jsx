const MEDALS = ['🥇', '🥈', '🥉']

function ranked(players, scores) {
  const all = [...new Set([...players, ...Object.keys(scores)])]
  return all.map((n) => ({ name: n, score: scores[n] || 0 })).sort((a, b) => b.score - a.score)
}

// Always-visible compact board under the spin button.
export function MiniScoreboard({ players, scores, current, limit = 6 }) {
  const rows = ranked(players, scores)
  const shown = rows.slice(0, limit)
  const cur = rows.findIndex((r) => r.name === current)
  if (cur >= limit) shown.push(rows[cur])
  return (
    <ol className="mini-board">
      {shown.map((r) => {
        const rank = rows.indexOf(r)
        return (
          <li key={r.name} className={r.name === current ? 'current' : ''}>
            <span className="board-rank">{r.score > 0 && rank < 3 ? MEDALS[rank] : rank + 1}</span>
            <span className="board-name">{r.name}</span>
            <span className="board-score">{r.score}</span>
          </li>
        )
      })}
    </ol>
  )
}

export default function Scoreboard({
  players,
  scores,
  canUndo,
  bankStats,
  onChange,
  onUndo,
  onResetScores,
  onResetBanks,
  onResetAll,
  onClose,
}) {
  const rows = ranked(players, scores)
  const confirmThen = (msg, fn) => () => window.confirm(msg) && fn()

  return (
    <div className="board-backdrop" onClick={onClose}>
      <aside className="board" onClick={(e) => e.stopPropagation()}>
        <header className="board-head">
          <h2>🏆 النقط</h2>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </header>
        <ol className="board-list">
          {rows.map((r, i) => (
            <li key={r.name} className={r.score > 0 && i < 3 ? 'top' : ''}>
              <span className="board-rank">{r.score > 0 && i < 3 ? MEDALS[i] : i + 1}</span>
              <span className="board-name">{r.name}</span>
              <button className="mini" onClick={() => onChange(r.name, -1)} disabled={r.score <= 0}>
                −
              </button>
              <span className="board-score">{r.score}</span>
              <button className="mini" onClick={() => onChange(r.name, 1)}>
                +
              </button>
            </li>
          ))}
        </ol>

        <div className="bank-stats">
          {bankStats.map((b) => (
            <span key={b.title}>
              {b.emoji} {b.title}: باقي {b.left} من {b.total}
            </span>
          ))}
        </div>

        <div className="board-controls">
          <button className="btn" onClick={onUndo} disabled={!canUndo}>
            ↶ تراجع عن آخر نقطة
          </button>
          <button className="btn" onClick={confirmThen('تصفير كل النقط؟', onResetScores)}>
            صفّر النقط
          </button>
          <button className="btn" onClick={confirmThen('ترجيع كل الأسئلة للكروت؟', onResetBanks)}>
            رجّع الأسئلة
          </button>
          <button
            className="btn danger"
            onClick={confirmThen(
              'تبدأ جلسة جديدة؟ الجلسة دي هتفضل محفوظة في السجل، والنقط والأسئلة هيبدأوا من الأول',
              onResetAll,
            )}
          >
            🆕 جلسة جديدة
          </button>
        </div>
      </aside>
    </div>
  )
}
