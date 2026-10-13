import { useMemo, useState } from 'react'
import Wheel from './Wheel'
import Brand, { Credit } from './Brand'
import EmojiPicker from './EmojiPicker'
import { SEGMENT_TYPES, bankToText, newSegment, textColorFor, textToBank, withQuestionIds } from '../lib/gameData'

const toLines = (text) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

const TIMER_OPTIONS = [0, 15, 30, 45, 60]

// Editable copy of a slice: banks are edited as text until the game starts.
const toDraft = (s) => (s.type === 'bank' ? { ...s, qText: bankToText(s.questions) } : { ...s })

function fromDraft({ qText, ...s }) {
  const seg = { ...s, textColor: textColorFor(s.color) }
  if (seg.type === 'bank') seg.questions = withQuestionIds(seg.id, textToBank(qText || ''))
  else delete seg.questions
  return seg
}

const fmtDate = (t) =>
  new Date(t).toLocaleString('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  })

export default function SetupScreen({ data, onStart, onSaveProfile, onHome }) {
  const [profileName, setProfileName] = useState(data.profileName || 'الافتراضي')
  const [playersText, setPlayersText] = useState(data.players.join('\n'))
  const [removeNames, setRemoveNames] = useState(data.removeNames)
  const [duration, setDuration] = useState(data.duration)
  const [timer, setTimer] = useState(data.timer)
  const [slices, setSlices] = useState(() => data.segments.map(toDraft))

  const players = toLines(playersText)
  const ready = players.length > 1 && slices.length > 1

  const edit = (i, patch) => setSlices((list) => list.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const move = (i, step) =>
    setSlices((list) => {
      const j = i + step
      if (j < 0 || j >= list.length) return list
      const next = list.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  const remove = (i) => setSlices((list) => list.filter((_, j) => j !== i))
  const duplicate = (i) =>
    setSlices((list) => {
      const copy = { ...list[i], id: newSegment(list[i].type, i).id, title: `${list[i].title} ٢` }
      return [...list.slice(0, i + 1), copy, ...list.slice(i + 1)]
    })
  const add = (type) => setSlices((list) => [...list, toDraft(newSegment(type, list.length))])
  const changeType = (i, type) => {
    const fresh = newSegment(type, i)
    edit(i, {
      type,
      text: fresh.text,
      emoji: slices[i].emoji || fresh.emoji,
      points: fresh.points,
      timer: 0,
      qText: type === 'bank' ? slices[i].qText || '' : undefined,
    })
  }

  const previewLabels = useMemo(() => slices.map((s) => `${s.emoji} ${s.title}`.trim()), [slices])
  const previewColors = useMemo(() => slices.map((s) => [s.color, textColorFor(s.color)]), [slices])

  const config = () => ({
    profileName: profileName.trim() || 'بدون اسم',
    players,
    segments: slices.map(fromDraft),
    removeNames,
    duration,
    timer,
  })
  const start = (secondScreen) => onStart(config(), secondScreen)
  const continuing = !!data.session
  const turns = data.session?.events.filter((e) => e.type === 'turn').length || 0

  return (
    <div className="setup">
      <header className="setup-head">
        <Brand as="h1" />
        <button className="btn" onClick={onHome}>
          🏠 الرئيسية
        </button>
      </header>

      <div className="profile-bar">
        <label className="profile-name">
          👥 البروفايل:
          <input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="اسم البروفايل" />
        </label>
        <button className="btn small" onClick={() => onSaveProfile(config())}>
          💾 احفظ البروفايل
        </button>
        <span className="profile-context">
          {continuing
            ? `↩ بتكمّل جلسة بدأت ${fmtDate(data.session.startedAt)} (${turns} دور). التعديلات هتتطبق عليها من غير ما النقط تضيع.`
            : '🆕 جلسة جديدة هتبدأ لما تدوس "ابدأ".'}
        </span>
      </div>

      <div className="setup-layout">
        <div className="side-col">
          <section className="setup-box players-box">
            <h2>
              اللاعبين <span className="count">{players.length}</span>
            </h2>
            <textarea
              value={playersText}
              onChange={(e) => setPlayersText(e.target.value)}
              placeholder="اكتب كل اسم في سطر"
              spellCheck={false}
            />
            <label className="check">
              <input type="checkbox" checked={removeNames} onChange={(e) => setRemoveNames(e.target.checked)} />
              شيل الاسم من العجلة بعد دوره
            </label>
          </section>
        </div>

        <section className="setup-box slices-box">
          <div className="slices-head">
            <h2>
              🎡 عجلة الاختيار <span className="count">{slices.length}</span>
            </h2>
            <div className="wheel-preview">
              <Wheel items={previewLabels} colors={previewColors} palette={previewColors} winnerIndex={null} />
            </div>
          </div>

          <div className="slice-list">
            {slices.map((s, i) => {
              const kind = SEGMENT_TYPES[s.type]
              const qCount = s.type === 'bank' ? textToBank(s.qText || '').length : 0
              return (
                <div
                  key={s.id}
                  className="slice-card"
                  style={{ '--seg': s.color, '--seg-text': textColorFor(s.color) }}
                >
                  <div className="slice-row">
                    <input
                      type="color"
                      className="slice-color"
                      value={s.color}
                      onChange={(e) => edit(i, { color: e.target.value })}
                      title="اللون"
                    />
                    <EmojiPicker value={s.emoji} onChange={(emoji) => edit(i, { emoji })} />
                    <input
                      className="slice-title"
                      value={s.title}
                      onChange={(e) => edit(i, { title: e.target.value })}
                      placeholder="اسم الخانة"
                    />
                    <select className="slice-type" value={s.type} onChange={(e) => changeType(i, e.target.value)}>
                      {Object.entries(SEGMENT_TYPES).map(([key, t]) => (
                        <option key={key} value={key}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    {kind.timer && (
                      <label className="slice-num" title="تايمر بالثواني (0 = من غير)">
                        ⏱
                        <input
                          type="number"
                          min="0"
                          max="300"
                          value={s.timer || 0}
                          onChange={(e) => edit(i, { timer: Math.max(0, +e.target.value || 0) })}
                        />
                      </label>
                    )}
                    {kind.points && (
                      <label className="slice-num" title="النقط">
                        ⭐
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={s.points ?? 1}
                          onChange={(e) => edit(i, { points: Math.max(0, +e.target.value || 0) })}
                        />
                      </label>
                    )}
                    <span className="slice-tools">
                      <button className="mini" onClick={() => move(i, -1)} disabled={i === 0} title="لفوق">
                        ↑
                      </button>
                      <button
                        className="mini"
                        onClick={() => move(i, 1)}
                        disabled={i === slices.length - 1}
                        title="لتحت"
                      >
                        ↓
                      </button>
                      <button className="mini" onClick={() => duplicate(i)} title="نسخة">
                        ⧉
                      </button>
                      <button
                        className="mini danger"
                        onClick={() => remove(i)}
                        disabled={slices.length <= 2}
                        title="امسح"
                      >
                        ✕
                      </button>
                    </span>
                  </div>

                  {s.type !== 'bank' && (
                    <input
                      className="slice-text"
                      value={s.text}
                      onChange={(e) => edit(i, { text: e.target.value })}
                      placeholder="النص اللي بيظهر لما العجلة تقف هنا"
                    />
                  )}

                  {s.type === 'bank' && (
                    <div className="slice-bank">
                      <textarea
                        value={s.qText || ''}
                        onChange={(e) => edit(i, { qText: e.target.value })}
                        placeholder={'كل سؤال في سطر\n- والإجابة تحته (لو فيه)'}
                        spellCheck={false}
                      />
                      <span className="format-help">
                        {qCount} سؤال · الإجابة في السطر اللي تحت السؤال تبدأ بـ <code>-</code>
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="add-slices">
            <span>ضيف خانة:</span>
            {Object.entries(SEGMENT_TYPES).map(([key, t]) => (
              <button key={key} className="btn small" onClick={() => add(key)}>
                + {t.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="setup-foot">
        <div className="settings">
          <label className="duration">
            مدة اللفّة: <b>{duration}</b> ثواني
            <input type="range" min="2" max="10" value={duration} onChange={(e) => setDuration(+e.target.value)} />
          </label>
          <label className="duration">
            ⏱ تايمر أسئلة الكروت:
            <select value={timer} onChange={(e) => setTimer(+e.target.value)}>
              {TIMER_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t ? `${t} ثانية` : 'من غير تايمر'}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="start-buttons">
          <button className="btn primary" disabled={!ready} onClick={() => start(true)}>
            {continuing ? 'كمّل على الشاشة التانية' : 'ابدأ على الشاشة التانية'} ⛶
          </button>
          <button className="btn" disabled={!ready} onClick={() => start(false)}>
            {continuing ? 'كمّل هنا' : 'ابدأ هنا'}
          </button>
        </div>
        {!ready && <p className="hint">لازم يبقى فيه لاعبين اتنين وخانتين على الأقل</p>}
      </div>
      <Credit />
    </div>
  )
}
