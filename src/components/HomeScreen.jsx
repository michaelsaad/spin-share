import Brand, { Credit } from './Brand'

const fmtDate = (t) =>
  t
    ? new Date(t).toLocaleString('ar-EG', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: 'numeric',
        minute: '2-digit',
      })
    : ''
const fmtAgo = (t) =>
  t ? new Date(t).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''

function topScorer(scores) {
  const best = Object.entries(scores || {}).sort((a, b) => b[1] - a[1])[0]
  return best && best[1] > 0 ? best : null
}

const STATUS = {
  loading: ['⏳', 'بيحمّل...'],
  online: ['🟢', 'أونلاين: البروفايلات والجلسات متزامنة'],
  offline: ['🟠', 'مفيش اتصال: هتشتغل من على الجهاز ده لحد ما النت يرجع'],
}

export default function HomeScreen({ library, local, actions }) {
  const [icon, label] = STATUS[library.status] || STATUS.loading
  const canUseLibrary = library.status === 'online'
  return (
    <div className="setup home">
      <header className="setup-head">
        <Brand as="h1" />
        <div className={`lib-status ${library.status}`}>
          {icon} {label}
          <button className="mini" onClick={actions.refresh} title="تحديث">
            ⟳
          </button>
        </div>
      </header>

      {local && (
        <section className="setup-box resume-box">
          <div>
            <h2>↩ آخر جلسة على الجهاز ده</h2>
            <p className="format-help">
              {local.profileName} · بدأت {fmtDate(local.startedAt)} · {local.turns} دور
            </p>
          </div>
          <button className="btn primary" onClick={actions.continueLocal}>
            كمّلها
          </button>
        </section>
      )}

      <div className="home-grid">
        <section className="setup-box">
          <div className="home-head">
            <h2>
              👥 البروفايلات <span className="count">{library.profiles.length}</span>
            </h2>
            <button className="btn small" onClick={actions.newProfile}>
              + بروفايل جديد
            </button>
          </div>
          {!canUseLibrary && (
            <button className="btn" onClick={actions.editLocal}>
              ✏ افتح الإعداد (اللي على الجهاز)
            </button>
          )}
          <div className="home-list">
            {library.profiles.map((p) => (
              <div key={p.id} className="home-card">
                <div className="home-card-main">
                  <b>{p.name}</b>
                  <span className="ev-muted">
                    {p.players} لاعب · {p.slices} خانة · {p.questions} سؤال
                  </span>
                </div>
                <div className="home-card-tools">
                  <button className="btn small primary" onClick={() => actions.openProfile(p)}>
                    ▶ افتح
                  </button>
                  <button className="mini" onClick={() => actions.duplicateProfile(p)} title="نسخة">
                    ⧉
                  </button>
                  <button className="mini danger" onClick={() => actions.deleteProfile(p)} title="امسح">
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {canUseLibrary && !library.profiles.length && <p className="ev-muted">مفيش بروفايلات لسه</p>}
          </div>
        </section>

        <section className="setup-box">
          <h2>
            🕘 الجلسات <span className="count">{library.sessions.length}</span>
          </h2>
          {!canUseLibrary && (
            <button className="btn" onClick={actions.showLocalHistory}>
              📜 سجل الجهاز ده
            </button>
          )}
          <div className="home-list">
            {library.sessions.map((s) => {
              const best = topScorer(s.scores)
              return (
                <div key={s.id} className="home-card">
                  <div className="home-card-main">
                    <b>{fmtDate(s.startedAt)}</b>
                    <span className="ev-muted">
                      {s.profileName} · {s.turns} دور · آخر تعديل {fmtAgo(s.updatedAt)}
                    </span>
                    {best && (
                      <span className="session-winner">
                        🏆 {best[0]} ({best[1]})
                      </span>
                    )}
                  </div>
                  <div className="home-card-tools">
                    <button className="btn small primary" onClick={() => actions.continueSession(s)}>
                      ↩ كمّل
                    </button>
                    <button className="mini" onClick={() => actions.viewSession(s)} title="السجل">
                      📜
                    </button>
                    <button className="mini danger" onClick={() => actions.deleteSession(s)} title="امسح">
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
            {canUseLibrary && !library.sessions.length && <p className="ev-muted">مفيش جلسات لسه</p>}
          </div>
        </section>
      </div>

      <div className="save-actions home-foot">
        <button className="btn small" onClick={actions.download}>
          ⬇ نزّل نسخة من الجلسة الحالية
        </button>
        <button className="btn small" onClick={actions.upload}>
          ⬆ استورد نسخة
        </button>
      </div>
      <Credit />
    </div>
  )
}
