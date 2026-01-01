import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { createTask } from '../data/db'
import { useTimePreference } from '../hooks/useTimePreference'
import { ESTIMATE_PRESETS } from '../constants/tasks'

interface Props {
  onCreated?: () => void
}

function NewTaskForm({ onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPreferenceOpen, setPreferenceOpen] = useState(false)
  const [isCustom, setIsCustom] = useState(false)
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null)
  const [customValue, setCustomValue] = useState('')
  const [preferenceError, setPreferenceError] = useState<string | null>(null)
  const { timePreference, customMinutes } = useTimePreference()

  useEffect(() => {
    if (!isPreferenceOpen) return
    const usesPreset = ESTIMATE_PRESETS.includes(
      timePreference as (typeof ESTIMATE_PRESETS)[number],
    )
    setIsCustom(!usesPreset)
    setSelectedMinutes(timePreference)
    setCustomValue(
      !usesPreset
        ? String(timePreference)
        : customMinutes
        ? String(customMinutes)
        : '',
    )
  }, [isPreferenceOpen, timePreference, customMinutes])

  const pendingEstimate = useMemo(() => {
    if (!isPreferenceOpen) return null
    if (!isCustom) {
      return selectedMinutes
    }
    const parsed = Number(customValue)
    return Number.isFinite(parsed) ? parsed : NaN
  }, [isPreferenceOpen, isCustom, selectedMinutes, customValue])

  const togglePreferences = () => {
    setPreferenceOpen((prev) => !prev)
    setPreferenceError(null)
  }

  const handlePresetSelect = (minutes: number) => {
    setSelectedMinutes(minutes)
    setIsCustom(false)
    setPreferenceError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setError('请输入任务标题')
      return
    }
    if (isPreferenceOpen && (pendingEstimate === null || Number.isNaN(pendingEstimate))) {
      setPreferenceError('请设置有效的时间偏好')
      return
    }
    if (
      isPreferenceOpen &&
      pendingEstimate !== null &&
      (pendingEstimate < 1 || pendingEstimate > 9999)
    ) {
      setPreferenceError('时间偏好需在 1-9999 之间')
      return
    }
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)
    setPreferenceError(null)
    try {
      await createTask({
        title: trimmed,
        estimate_minutes: isPreferenceOpen ? pendingEstimate : null,
      })
      setTitle('')
      if (isPreferenceOpen) {
        setPreferenceOpen(false)
        setSelectedMinutes(null)
        setCustomValue('')
        setIsCustom(false)
      }
      setSuccess('创建成功！')
      onCreated?.()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="stacked-form" onSubmit={handleSubmit}>
      <label className="form-field">
        <span>任务标题</span>
        <input
          type="text"
          placeholder="例如：采访大纲·整理前半段"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
            setError(null)
            setSuccess(null)
          }}
          disabled={isSubmitting}
        />
      </label>
      <button
        className="secondary-button"
        type="button"
        onClick={togglePreferences}
        disabled={isSubmitting}
      >
        {isPreferenceOpen ? '使用默认时间偏好' : '设置时间偏好'}
      </button>
      {isPreferenceOpen ? (
        <div className="time-options-block">
          <p className="hint-text">
            默认为 {timePreference} 分钟，可按需调整（不会影响全局偏好）。
          </p>
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
                onClick={() => handlePresetSelect(minutes)}
              >
                {minutes} 分
              </button>
            ))}
            <div className="custom-time-input">
              <label>
                自定义（1-9999）
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={customValue}
                  onChange={(event) => {
                    setIsCustom(true)
                    setCustomValue(event.target.value)
                    setPreferenceError(null)
                  }}
                  onFocus={() => setIsCustom(true)}
                />
              </label>
            </div>
          </div>
          {preferenceError ? <p className="error-text">{preferenceError}</p> : null}
        </div>
      ) : null}
      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? '创建中…' : '添加任务'}
      </button>
      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}
    </form>
  )
}

export default NewTaskForm
