import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import DoneSection from '../components/DoneSection'
import { deleteTask, listTasks, restoreTask } from '../data/db'
import type { DurationFormat, Task } from '../types'
import { useTimePreference } from '../hooks/useTimePreference'
import { exportBackup, importBackup } from '../utils/backup'
import { ESTIMATE_PRESETS } from '../constants/tasks'
import { useDurationFormat } from '../state/DurationFormatContext'
import { useTotalMinutes } from '../hooks/useTotalMinutes'
import { useTodayDeepMinutes } from '../hooks/useTodayDeepMinutes'

function SettingsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isTaskLoading, setIsTaskLoading] = useState(true)
  const [doneOpen, setDoneOpen] = useState(false)
  const [prefMessage, setPrefMessage] = useState<string | null>(null)
  const [prefError, setPrefError] = useState<string | null>(null)
  const [formatMessage, setFormatMessage] = useState<string | null>(null)
  const [formatError, setFormatError] = useState<string | null>(null)
  const [taskMessage, setTaskMessage] = useState<string | null>(null)
  const [taskError, setTaskError] = useState<string | null>(null)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const [backupError, setBackupError] = useState<string | null>(null)

  const { timePreference, customMinutes, savePreference } = useTimePreference()
  const [selectedMinutes, setSelectedMinutes] = useState(timePreference)
  const [isCustom, setIsCustom] = useState(false)
  const [customValue, setCustomValue] = useState(String(customMinutes))
  const { format, setFormatOption, formatMinutes } = useDurationFormat()
  const { minutes: todayWork } = useTodayDeepMinutes('work')
  const { minutes: todayLeisure } = useTodayDeepMinutes('leisure')
  const {
    minutes: totalWork,
    isLoading: isTotalWorkLoading,
    error: totalWorkError,
  } = useTotalMinutes('work')
  const {
    minutes: totalLeisure,
    isLoading: isTotalLeisureLoading,
    error: totalLeisureError,
  } = useTotalMinutes('leisure')

  useEffect(() => {
    const load = async () => {
      setIsTaskLoading(true)
      const result = await listTasks()
      setTasks(result)
      setIsTaskLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    setSelectedMinutes(timePreference)
    const usesPreset = ESTIMATE_PRESETS.includes(
      timePreference as (typeof ESTIMATE_PRESETS)[number],
    )
    setIsCustom(!usesPreset)
    setCustomValue(
      !usesPreset
        ? String(timePreference)
        : customMinutes
        ? String(customMinutes)
        : '',
    )
  }, [timePreference, customMinutes])

  const handlePresetSelect = (minutes: number) => {
    setSelectedMinutes(minutes)
    setIsCustom(false)
    setPrefError(null)
    setPrefMessage(null)
    setTaskError(null)
    setTaskMessage(null)
  }

  const handleCustomChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCustomValue(event.target.value)
    setIsCustom(true)
    setPrefError(null)
    setPrefMessage(null)
  }

  const pendingMinutes = useMemo(() => {
    if (!isCustom) {
      return selectedMinutes
    }
    const parsed = Number(customValue)
    return Number.isFinite(parsed) ? parsed : NaN
  }, [isCustom, customValue, selectedMinutes])

  const handleSavePreference = async () => {
    setPrefMessage(null)
    setPrefError(null)
    setFormatMessage(null)
    setFormatError(null)
    if (
      !Number.isFinite(pendingMinutes) ||
      pendingMinutes < 1 ||
      pendingMinutes > 9999
    ) {
      setPrefError('时间偏好需在 1-9999 之间')
      return
    }
    try {
      await savePreference(pendingMinutes, isCustom ? pendingMinutes : undefined)
      setPrefMessage('时间偏好已更新')
    } catch (err) {
      setPrefError((err as Error).message)
    }
  }

  const handleFormatSelect = async (nextFormat: DurationFormat) => {
    if (nextFormat === format) return
    setFormatError(null)
    setFormatMessage(null)
    try {
      await setFormatOption(nextFormat)
      setFormatMessage('时间展示方式已更新')
    } catch (err) {
      setFormatError((err as Error).message)
    }
  }

  const handleRestore = async (taskId: string) => {
    setTaskError(null)
    setTaskMessage(null)
    try {
      await restoreTask(taskId)
      const refreshed = await listTasks()
      setTasks(refreshed)
      setTaskMessage('任务已恢复到任务池')
    } catch (err) {
      setTaskError((err as Error).message)
    }
  }

  const handleDelete = async (taskId: string) => {
    const confirmed = window.confirm('确认删除该任务？该操作不可恢复。')
    if (!confirmed) return
    setTaskError(null)
    setTaskMessage(null)
    try {
      await deleteTask(taskId)
      const refreshed = await listTasks()
      setTasks(refreshed)
      setTaskMessage('任务已删除')
    } catch (err) {
      setTaskError((err as Error).message)
    }
  }

  const handleExport = async () => {
    setBackupError(null)
    setBackupMessage(null)
    try {
      const payload = await exportBackup()
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `deep-work-backup-${new Date().toISOString()}.json`
      a.click()
      URL.revokeObjectURL(url)
      setBackupMessage('备份已下载')
    } catch (err) {
      setBackupError((err as Error).message)
    }
  }

  const handleImport = async (file: File | null) => {
    if (!file) return
    setBackupError(null)
    setBackupMessage(null)
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      await importBackup(payload)
      const refreshed = await listTasks()
      setTasks(refreshed)
      setBackupMessage('导入成功，已覆盖本地数据')
    } catch (err) {
      setBackupError(`导入失败：${(err as Error).message}`)
    }
  }

  const doneTasks = tasks.filter((task) => task.state === 'done')

  return (
    <section className="page home-page">
      <p className="page-kicker">Settings</p>
      <h1>偏好与备份</h1>

      <div className="page-card">
        <h2>时间偏好</h2>
        <p>当前偏好：{timePreference} 分钟</p>
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
                onChange={handleCustomChange}
              />
            </label>
          </div>
        </div>
        <button className="primary-button" type="button" onClick={handleSavePreference}>
          保存偏好（{pendingMinutes || '…'} 分钟）
        </button>
        {prefMessage ? <p className="hint-text">{prefMessage}</p> : null}
        {prefError ? <p className="error-text">{prefError}</p> : null}
      </div>

      <div className="page-card">
        <h2>时间显示格式</h2>
        <p>控制任务、统计中用时的展示方式。当前示例：{formatMinutes(80)}</p>
        <div className="estimate-options">
          <button
            type="button"
            className={format === 'minutes' ? 'chip-button is-active' : 'chip-button'}
            onClick={() => handleFormatSelect('minutes')}
          >
            80min（仅分钟）
          </button>
          <button
            type="button"
            className={format === 'hm' ? 'chip-button is-active' : 'chip-button'}
            onClick={() => handleFormatSelect('hm')}
          >
            1h20m（小时+分钟）
          </button>
        </div>
        {formatMessage ? <p className="hint-text">{formatMessage}</p> : null}
        {formatError ? <p className="error-text">{formatError}</p> : null}
      </div>

      <div className="page-card">
        <h2>深度时间统计</h2>
        <ul className="stats-list">
          <li>
            <strong>今日任务累计：</strong>
            {formatMinutes(todayWork)}
          </li>
          <li>
            <strong>今日娱乐累计：</strong>
            {formatMinutes(todayLeisure)}
          </li>
          <li>
            <strong>总任务深度：</strong>
            {isTotalWorkLoading
              ? '统计中…'
              : totalWorkError
              ? `失败：${totalWorkError}`
              : formatMinutes(totalWork)}
          </li>
          <li>
            <strong>总娱乐深度：</strong>
            {isTotalLeisureLoading
              ? '统计中…'
              : totalLeisureError
              ? `失败：${totalLeisureError}`
              : formatMinutes(totalLeisure)}
          </li>
        </ul>
      </div>

      <div className="page-card">
        <h2>Done / Archive</h2>
        <DoneSection
          tasks={doneTasks}
          isLoading={isTaskLoading}
          isOpen={doneOpen}
          onToggle={() => setDoneOpen((prev) => !prev)}
          onRestore={handleRestore}
          onDelete={handleDelete}
        />
        {taskMessage ? <p className="hint-text">{taskMessage}</p> : null}
        {taskError ? <p className="error-text">{taskError}</p> : null}
      </div>

      <div className="page-card">
        <h2>数据备份 / 导入</h2>
        <div className="backup-section">
          <button className="secondary-button" type="button" onClick={handleExport}>
            导出 JSON 备份
          </button>
          <label>
            <span>导入备份文件（会覆盖当前数据）</span>
            <input
              type="file"
              accept="application/json"
              onChange={(event) => handleImport(event.target.files?.[0] ?? null)}
            />
          </label>
          {backupMessage ? <p className="hint-text">{backupMessage}</p> : null}
          {backupError ? <p className="error-text">{backupError}</p> : null}
        </div>
      </div>
    </section>
  )
}

export default SettingsPage
