import { useEffect, useMemo, useState } from 'react'
import {
  ESTIMATE_PRESETS,
  TASK_STATE_COPY,
  type TaskWithRemaining,
} from '../constants/tasks'
import type { RecommendationResult } from '../utils/recommendation'
import { useDurationFormat } from '../state/DurationFormatContext'

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

const getPillClass = (state: TaskWithRemaining['state']) => {
  const classes = ['state-pill', 'state-pill--outline']
  if (state === 'warm') {
    classes.push('state-pill--warm')
  }
  return classes.join(' ')
}

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
  const [isPreferenceMode, setPreferenceMode] = useState(false)
  const [isSavingPreference, setIsSavingPreference] = useState(false)
  const { formatMinutes } = useDurationFormat()

  useEffect(() => {
    if (!isOpen) return
    const usesPreset = ESTIMATE_PRESETS.includes(
      initialMinutes as (typeof ESTIMATE_PRESETS)[number],
    )
    setSelectedMinutes(initialMinutes)
    setIsCustom(!usesPreset)
    setCustomValue(lastCustomMinutes)
    setError(null)
    setPreferenceMode(false)
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

  const handleSavePreference = async () => {
    if (!isCustom && !selectedMinutes) {
      setError('请选择时间偏好')
      return
    }
    if (!isValidCustom) {
      setError('自定义时间需在 1-9999 之间')
      return
    }
    setIsSavingPreference(true)
    try {
      await onConfirm(displayMinutes, isCustom ? customValue : undefined)
      setPreferenceMode(false)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSavingPreference(false)
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
              ? `预计剩余 ${formatMinutes(recommendation.top.remaining_minutes)}`
              : '未设置估时'}
          </p>
          <div className="recommend-card__chips">
            <span className={getPillClass(recommendation.top.state)}>
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
                  ? `剩余 ${formatMinutes(task.remaining_minutes)}`
                  : '未设置估时'}
              </p>
              <div className="recommend-card__chips">
                <span className={getPillClass(task.state)}>
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
              >
                Start
              </button>
            </div>
          ))}
        </div>
        {recommendation.message ? (
          <p className="hint-text">{recommendation.message}</p>
        ) : null}
        <div className="modal-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setPreferenceMode(true)
              setError(null)
            }}
          >
            调整时间偏好
          </button>
          <button className="link-button" type="button" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card recommend-modal">
        <h3>一键进行</h3>
        {isPreferenceMode ? (
          <>
            <p>调整时间偏好（系统会记住最近一次选择）。</p>
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
                  />
                </label>
              </div>
            </div>
            {error ? <p className="error-text">{error}</p> : null}
            <div className="modal-actions">
              <button
                className="primary-button"
                type="button"
                onClick={handleSavePreference}
                disabled={isSavingPreference}
              >
                {isSavingPreference
                  ? '保存中…'
                  : `保存（${displayMinutes} 分钟）`}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setPreferenceMode(false)
                  setError(null)
                }}
              >
                返回推荐
              </button>
            </div>
          </>
        ) : (
          renderRecommendation()
        )}
      </div>
    </div>
  )
}

export default RecommendModal
