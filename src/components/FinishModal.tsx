interface FinishModalProps {
  isOpen: boolean
  note: string
  onNoteChange: (text: string) => void
  onSave: () => void
  onSkip: () => void
  onCancel: () => void
  isSubmitting: boolean
}

function FinishModal({
  isOpen,
  note,
  onNoteChange,
  onSave,
  onSkip,
  onCancel,
  isSubmitting,
}: FinishModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>Finish</h3>
        <p>下次开始的第一步具体动作是什么？（可跳过）</p>
        <textarea
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="下次开始的第一步具体动作是什么？"
          rows={4}
          disabled={isSubmitting}
        />
        <div className="modal-actions">
          <button
            className="primary-button"
            type="button"
            disabled={isSubmitting}
            onClick={onSave}
          >
            {isSubmitting ? '保存中…' : '保存并结束'}
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={isSubmitting}
            onClick={onSkip}
          >
            跳过并结束
          </button>
          <button className="link-button" type="button" onClick={onCancel}>
            继续专注
          </button>
        </div>
      </div>
    </div>
  )
}

export default FinishModal
