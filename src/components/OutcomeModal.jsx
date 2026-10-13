import CardPicker from './CardPicker'
import Timer from './Timer'

// What happens after the choice wheel stops. `outcome.stage` drives the view:
// challenge | pick | question | empty | joker | gift | again
export default function OutcomeModal({
  outcome,
  mirror,
  owner,
  helper,
  bankLeft,
  timerSeconds,
  timerPaused,
  onToggleTimer,
  onPickCard,
  onHoverCard,
  onReveal,
  onResolve,
  onContinue,
  onResetBank,
}) {
  const { seg, stage } = outcome
  const player = helper || owner
  const points = seg.points ?? 1
  const canScore = stage === 'challenge' || stage === 'question'
  const timer = stage === 'challenge' ? seg.timer : stage === 'question' ? timerSeconds : 0

  return (
    <div className="modal-backdrop">
      <div className={`modal stage-${stage}`}>
        <div className="modal-name">{player}</div>
        {helper && (
          <div className="modal-tag joker">
            🃏 {helper} بيلعب بدل {owner}، والنقطة لـ {owner}
          </div>
        )}

        <div className="seg-chip" style={{ background: seg.color, color: seg.textColor }}>
          {seg.emoji} {seg.title}
        </div>

        {stage === 'challenge' && <div className="modal-question">{seg.text}</div>}

        {stage === 'pick' && (
          <>
            <div className="modal-sub">
              اختار كارت <span className="count">باقي {bankLeft}</span>
            </div>
            <CardPicker
              count={outcome.order.length}
              cursor={outcome.cursor}
              picking={outcome.picking}
              flipped={outcome.flipped}
              emoji={seg.emoji}
              onPick={onPickCard}
              onHover={onHoverCard}
            />
          </>
        )}

        {stage === 'question' && (
          <div className="question-card">
            <div className="modal-question">{outcome.question.question}</div>
            {outcome.question.answer &&
              (outcome.revealed ? (
                <div className="answer">✔ {outcome.question.answer}</div>
              ) : (
                <button className="btn reveal" onClick={onReveal}>
                  اعرض الإجابة
                </button>
              ))}
          </div>
        )}

        {stage === 'empty' && (
          <div className="modal-question small">
            خلصت أسئلة "{seg.title}"! 😅
            <div className="modal-actions">
              <button className="btn primary" onClick={onResetBank}>
                رجّع الأسئلة
              </button>
              <button className="btn" onClick={() => onResolve(false)}>
                عدّي
              </button>
            </div>
          </div>
        )}

        {stage === 'joker' && <div className="modal-question">{seg.text}</div>}
        {stage === 'gift' && (
          <div className="modal-question">
            🎁 +{points} لـ {owner}
          </div>
        )}
        {stage === 'again' && <div className="modal-question">{seg.text}</div>}

        <div className="modal-actions">
          {timer > 0 && (
            <Timer
              key={`${seg.id}-${outcome.question?.id || ''}`}
              seconds={timer}
              paused={timerPaused}
              stopped={false}
              silent={mirror}
              onToggle={onToggleTimer}
            />
          )}
          {canScore && (
            <>
              <button className="btn yes" onClick={() => onResolve(true)}>
                ✅ +{points}
              </button>
              <button className="btn no" onClick={() => onResolve(false)}>
                ❌
              </button>
            </>
          )}
          {stage === 'joker' && (
            <button className="btn primary" onClick={onContinue}>
              لف الأسماء
            </button>
          )}
          {stage === 'again' && (
            <button className="btn primary" onClick={onContinue}>
              لف تاني 🔄
            </button>
          )}
          {stage === 'gift' && (
            <button className="btn primary" onClick={onContinue}>
              التالي
            </button>
          )}
        </div>

        <div className="key-hint">
          {canScore && 'Y ✅ · N ❌'}
          {stage === 'question' && outcome.question.answer && !outcome.revealed && ' · R اعرض الإجابة'}
          {timer > 0 && ' · T وقف التايمر'}
          {stage === 'pick' && '← → اختار · Space اقلب الكارت'}
          {['joker', 'again', 'gift'].includes(stage) && 'Space كمّل'}
        </div>
      </div>
    </div>
  )
}
