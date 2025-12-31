import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DoneSection from '../components/DoneSection'
import NewTaskForm from '../components/NewTaskForm'
import RecommendModal from '../components/RecommendModal'
import TaskList from '../components/TaskList'
import { listTasks, markDone, restoreTask } from '../data/db'
import type { Task } from '../types'
import { useFocusSession } from '../state/FocusSessionContext'
import { useTimePreference } from '../hooks/useTimePreference'
import { recommendTasks } from '../utils/recommendation'
import { useTodayDeepMinutes } from '../hooks/useTodayDeepMinutes'
import { exportBackup, importBackup } from '../utils/backup'

function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusText, setStatusText] = useState<string | null>(null)
  const [doneOpen, setDoneOpen] = useState(false)
  const [isRecommendOpen, setRecommendOpen] = useState(false)
  const [recommendation, setRecommendation] = useState<ReturnType<typeof recommendTasks> | null>(null)
  const [preferenceMessage, setPreferenceMessage] = useState<string | null>(null)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const [backupError, setBackupError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { startFocus, session, focusingTask, isBusy } = useFocusSession()
  const {
    timePreference,
    customMinutes,
    isLoading: isPreferenceLoading,
    error: preferenceError,
    savePreference,
  } = useTimePreference()
  const {
    minutes: todayMinutes,
    isLoading: isTodayLoading,
    error: todayError,
    refresh: refreshTodayMinutes,
  } = useTodayDeepMinutes()

  const refreshTasks = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await listTasks()
      setTasks(result)
      refreshTodayMinutes()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [refreshTodayMinutes])

  useEffect(() => {
    refreshTasks()
  }, [refreshTasks])

  useEffect(() => {
    if (isRecommendOpen) {
      const result = recommendTasks(tasks, timePreference)
      setRecommendation(result)
    }
  }, [isRecommendOpen, tasks, timePreference])

  const handleMarkDone = async (taskId: string) => {
    try {
      await markDone(taskId)
      setStatusText('任务已归档到 Done 区')
      refreshTasks()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleRestore = async (taskId: string) => {
    try {
      await restoreTask(taskId)
      setStatusText('任务已恢复到任务池')
      refreshTasks()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleStart = async (taskId: string) => {
    try {
      await startFocus(taskId)
      navigate('/focus')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleRecommendOpen = () => {
    const result = recommendTasks(tasks, timePreference)
    setRecommendation(result)
    setRecommendOpen(true)
  }

  const handleExport = async () => {
    setBackupError(null)
    try {
      const payload = await exportBackup()
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `deep-list-backup-${new Date().toISOString()}.json`
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
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      await importBackup(payload)
      setBackupMessage('导入成功，已覆盖本地数据')
      refreshTasks()
    } catch (err) {
      setBackupError(`导入失败：${(err as Error).message}`)
    }
  }

  const doneTasks = tasks.filter((task) => task.state === 'done')
  const focusingId = focusingTask?.id ?? session?.taskId ?? null

  return (
    <section className="page home-page">
      <p className="page-kicker">Home</p>
      <h1>Deep Work · Journalist Mode</h1>
      <p className="page-lead">
        今日累计深度：
        {isTodayLoading ? '计算中…' : `${todayMinutes} 分钟`}
      </p>
      {todayError ? <p className="error-text">统计失败：{todayError}</p> : null}

      <div className="home-actions">
        <Link className="primary-button" to="/focus">
          演示 Focus Screen
        </Link>
        <Link className="secondary-button" to="/task/demo-task">
          查看任务详情壳
        </Link>
      </div>

      <div className="page-card">
        <h2>一键进行 · 时间偏好</h2>
        <p>选择时间窗口后，推荐系统会记住你的偏好，下次空档可秒入。</p>
        <button
          className="primary-button"
          type="button"
          onClick={handleRecommendOpen}
          disabled={isPreferenceLoading}
        >
          {isPreferenceLoading
            ? '读取偏好中…'
            : `当前偏好：${timePreference} 分钟 · 点击修改`}
        </button>
        {preferenceMessage ? <p className="hint-text">{preferenceMessage}</p> : null}
        {preferenceError ? <p className="error-text">{preferenceError}</p> : null}
      </div>

      <div className="page-card">
        <h2>创建新任务</h2>
        <p>仅需填写标题即可。估时稍后可在 Task Detail 中补充。</p>
        <NewTaskForm onCreated={refreshTasks} />
      </div>

      <div className="page-card">
        <h2>未归档任务列表</h2>
        <p>以下展示所有 cold/warm/focusing 任务，未来会在这里接入状态色与进度。</p>
        {error ? <p className="error-text">读取失败：{error}</p> : null}
        {statusText ? <p className="hint-text">{statusText}</p> : null}
        <TaskList
          tasks={tasks}
          isLoading={isLoading}
          onRefresh={refreshTasks}
          onMarkDone={handleMarkDone}
          onStart={handleStart}
          focusingTaskId={focusingId}
          isStarting={isBusy}
        />
      </div>

      <div className="page-card">
        <h2>Done / Archive</h2>
        <p>完成的任务会自动折叠到这里，默认不占据主列表。</p>
        <DoneSection
          tasks={doneTasks}
          isLoading={isLoading}
          isOpen={doneOpen}
          onToggle={() => setDoneOpen((prev) => !prev)}
          onRestore={handleRestore}
        />
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
      <RecommendModal
        isOpen={isRecommendOpen}
        onClose={() => setRecommendOpen(false)}
        initialMinutes={timePreference}
        lastCustomMinutes={customMinutes}
        recommendation={recommendation}
        onStartTask={async (taskId) => {
          await handleStart(taskId)
          setRecommendOpen(false)
        }}
        onConfirm={async (minutes, customValue) => {
          await savePreference(minutes, customValue)
          setPreferenceMessage(`时间偏好已更新为 ${minutes} 分钟`)
          const result = recommendTasks(tasks, minutes)
          setRecommendation(result)
        }}
      />
    </section>
  )
}

export default HomePage
