import { useEffect, useMemo, useState } from 'react'
import { ESTIMATE_PRESETS, TASK_STATE_COPY } from '../constants/tasks'
import type { RecommendationResult } from '../utils/recommendation'

interface RecommendModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (minutes: number, customMinutes?: number) => Promise<void> | void
  initialMinutes: number
  lastCustomMinutes: number
  recommendation: RecommendationResult | null
  onStartTask: (taskId: string) => Promise<void>
}

const MIN_CUSTOM = 1
const MAX_CUSTOM = 9999

function RecommendModal({
  isOpen,
  onClose,
  onConfirm,
  initialMinutes,
  lastCustomMinutes,
  recommendation,
  onStartTask,
}: RecommendModalProps) {
  const [selectedMinutes, setSelectedMinutes] = useState(initialMinutes)
  const [isCustom, setIsCustom] = useState(false)
  const [customValue, setCustomValue] = useState(lastCustomMinutes)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const usesPreset = ESTIMATE_PRESETS.includes(initialMinutes as (typeof ESTIMATE_PRESETS)[number])
    setSelectedMinutes(initialMinutes)
    setIsCustom(!usesPreset)
    setCustomValue(lastCustomMinutes)
    setError(null)
  }, [isOpen, initialMinutes, lastCustomMinutes])

  const isValidCustom = useMemo(() => {
    if (!isCustom) return true
    return (
      Number.isFinite(customValue) &&
      customValue >= MIN_CUSTOM &&
      customValue <= MAX_CUSTOM
    )
  }, [customValue, isCustom])

  const displayMinutes = isCustom ? customValue : selectedMinutes

  const handleConfirm = async () => {
    if (!isCustom && !selectedMinutes) {
      setError('请选择时间偏好')
      return
    }
    if (!isValidCustom) {
      setError('自定义时间需在 1-9999 之间')
      return
    }
    setIsSubmitting(true)
    try {
      await onConfirm(displayMinutes, isCustom ? customValue : undefined)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const renderRecommendation = () => {
    if (!recommendation) {
      return <p className="hint-text">暂无可推荐任务，请先添加或恢复任务。</p>
    }
    if (!recommendation.top) {
      return <p className="hint-text">{recommendation.message ?? '暂无推荐'}</p>
    }
    return (
      <div className="recommend-results">
        <div className="recommend-card recommend-card--primary">
          <p className="recommend-card__label">Top 1</p>
          <p className="recommend-card__title">
            {recommendation.top.title || '未命名任务'}
          </p>
          <p className="recommend-card__meta">
            {recommendation.top.remaining_minutes !== null
              ? `预计剩余 ${recommendation.top.remaining_minutes} 分钟`
              : '未设置估时'}
          </p>
          <div className="recommend-card__chips">
            <span className="state-pill state-pill--outline">
              {TASK_STATE_COPY[recommendation.top.state]}
            </span>
            {recommendation.top.last_finish_note ? (
              <span className="note-pill">
                {recommendation.top.last_finish_note.slice(0, 24)}
              </span>
            ) : null}
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => onStartTask(recommendation.top!.id)}
            disabled={isSubmitting}
          >
            Start
          </button>
        </div>
        <div className="recommend-card__grid">
          {recommendation.alternatives.map((task, index) => (
            <div key={task.id} className="recommend-card recommend-card--secondary">
              <p className="recommend-card__label">备选 {index + 1}</p>
              <p className="recommend-card__title">{task.title || '未命名任务'}</p>
              <p className="recommend-card__meta">
                {task.remaining_minutes !== null
                  ? `剩余 ${task.remaining_minutes} 分钟`
                  : '未设置估时'}
              </p>
              <div className="recommend-card__chips">
                <span className="state-pill state-pill--outline">
                  {TASK_STATE_COPY[task.state]}
                </span>
                {task.last_finish_note ? (
                  <span className="note-pill">{task.last_finish_note.slice(0, 24)}</span>
                ) : null}
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => onStartTask(task.id)}
                disabled={isSubmitting}
              >
                Start
              </button>
            </div>
          ))}
        </div>
        {recommendation.message ? (
          <p className="hint-text">{recommendation.message}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card recommend-modal">
        <h3>选择时间偏好</h3>
        <p>记住你最近一次的时间窗口，下一次一键进行时更快进入状态。</p>
        <div className="time-options">
          {ESTIMATE_PRESETS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={
                !isCustom && selectedMinutes === minutes
                  ? 'chip-button is-active'
                  : 'chip-button'
              }
              onClick={() => {
                setIsCustom(false)
                setSelectedMinutes(minutes)
                setError(null)
              }}
              disabled={isSubmitting}
            >
              {minutes} 分
            </button>
          ))}
          <div className="custom-time-input">
            <label>
              自定义（1-9999）
              <input
                type="number"
                min={MIN_CUSTOM}
                max={MAX_CUSTOM}
                value={customValue}
                onFocus={() => setIsCustom(true)}
                onChange={(event) => {
                  setIsCustom(true)
                  setCustomValue(Number(event.target.value))
                  setError(null)
                }}
                disabled={isSubmitting}
              />
            </label>
          </div>
        </div>
        <div className="modal-actions">
          <button
            className="primary-button"
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? '保存中…' : `确认（${displayMinutes} 分钟）`}
          </button>
          <button className="secondary-button" type="button" onClick={onClose}>
            关闭
          </button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        <hr />
        <h4>推荐结果</h4>
        {renderRecommendation()}
      </div>
    </div>
  )
}

export default RecommendModal
