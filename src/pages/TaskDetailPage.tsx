import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ESTIMATE_PRESETS,
  TASK_STATE_COPY,
  type EstimatePreset,
  isEstimatePreset,
} from '../constants/tasks'
import {
  deleteTask,
  getTask,
  markDone,
  restoreTask,
  upsertTask,
} from '../data/db'
import type { Task } from '../types'
import { useDurationFormat } from '../state/DurationFormatContext'

function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<Task | null>(null)
  const [title, setTitle] = useState('')
  const [estimate, setEstimate] = useState<number | null>(null)
  const [customEstimate, setCustomEstimate] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const { formatMinutes } = useDurationFormat()

  const warmSubtitle = useMemo(() => {
    if (!task) return null
    if (task.state !== 'warm') {
      return null
    }
    if (task.last_finish_note) {
      return task.last_finish_note
    }
    if (task.last_session_end_at) {
      return `上次进行：${new Date(task.last_session_end_at).toLocaleString()}`
    }
    return '上次进行：尚无记录'
  }, [task])

  const progressInfo = useMemo(() => {
    if (!task) return null
    if (typeof task.estimate_minutes === 'number' && task.estimate_minutes > 0) {
      const ratio = task.spent_minutes / task.estimate_minutes
      return {
        type: 'estimate' as const,
        ratio,
        text: `${formatMinutes(task.spent_minutes)} / ${formatMinutes(
          task.estimate_minutes,
        )}`,
      }
    }
    return {
      type: 'spent' as const,
      text: `累计 ${formatMinutes(task.spent_minutes)}`,
    }
  }, [task, formatMinutes])

  useEffect(() => {
    const load = async () => {
      if (!taskId) {
        setError('缺少任务 ID')
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      setError(null)
      try {
        const found = await getTask(taskId)
        if (!found) {
          setError('未找到该任务，可能已删除')
          setTask(null)
        } else {
          setTask(found)
          setTitle(found.title)
          setEstimate(found.estimate_minutes)
          setCustomEstimate(
            found.estimate_minutes && !isEstimatePreset(found.estimate_minutes)
              ? String(found.estimate_minutes)
              : '',
          )
        }
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [taskId])

  const handlePresetSelect = (value: EstimatePreset) => {
    setEstimate(value)
    setCustomEstimate('')
    setSuccess(null)
  }

  const handleCustomChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setCustomEstimate(value)
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) {
      setEstimate(parsed)
    } else {
      setEstimate(null)
    }
    setSuccess(null)
  }

  const handleClearEstimate = () => {
    setEstimate(null)
    setCustomEstimate('')
    setSuccess(null)
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!task) {
      setError('无可保存的任务')
      return
    }
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('任务标题不能为空')
      return
    }
    if (
      estimate !== null &&
      (Number.isNaN(estimate) || estimate < 1 || estimate > 9999)
    ) {
      setError('自定义估时需在 1-9999 分钟之间')
      return
    }
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const updatedTask = await upsertTask({
        ...task,
        title: trimmedTitle,
        estimate_minutes: estimate,
      })
      setTask(updatedTask)
      setSuccess('保存成功')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!task || isDeleting) return
    const confirmed = window.confirm('确认删除该任务？该操作不可恢复。')
    if (!confirmed) return
    setIsDeleting(true)
    setError(null)
    try {
      await deleteTask(task.id)
      navigate('/')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleMarkDone = async () => {
    if (!task || task.state === 'done') return
    setIsTransitioning(true)
    setError(null)
    setSuccess(null)
    try {
      const next = await markDone(task.id)
      setTask(next)
      setSuccess('任务已归档')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsTransitioning(false)
    }
  }

  const handleRestore = async () => {
    if (!task || task.state !== 'done') return
    setIsTransitioning(true)
    setError(null)
    setSuccess(null)
    try {
      const next = await restoreTask(task.id)
      setTask(next)
      setSuccess('任务已恢复到任务池')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsTransitioning(false)
    }
  }

  const estimateDisplay = useMemo(() => {
    if (estimate === null) return '未设置'
    return formatMinutes(estimate)
  }, [estimate, formatMinutes])

  const stateLabel = task ? TASK_STATE_COPY[task.state] : ''

  return (
    <section className="page task-page">
      <p className="page-kicker">Task Detail</p>
      <h1>任务详情</h1>
      {isLoading ? (
        <p>读取中…</p>
      ) : task ? (
        <>
          <p className="page-lead">
            任务 ID：<strong>{task.id}</strong>
          </p>
          <div className="page-card">
            <h2>基础信息</h2>
            <p>当前状态：{stateLabel}</p>
            <p>估计时长：{estimateDisplay}</p>
            {progressInfo ? (
              <>
                <p>
                  {progressInfo.type === 'estimate'
                    ? `进度：${progressInfo.text}`
                    : progressInfo.text}
                </p>
                {progressInfo.type === 'estimate' ? (
                  <div className="progress-meter">
                    <div
                      className="progress-meter__fill"
                      style={{ width: `${Math.min(progressInfo.ratio, 1) * 100}%` }}
                    />
                    <span className="progress-meter__overflow">
                      {Math.round(progressInfo.ratio * 100)}%
                    </span>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          {warmSubtitle ? (
            <div className="page-card">
              <h2>秒入线索</h2>
              <p>{warmSubtitle}</p>
            </div>
          ) : null}

          <div className="page-card">
            <h2>编辑任务</h2>
            <form className="stacked-form" onSubmit={handleSave}>
              <label className="form-field">
                <span>标题</span>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value)
                    setSuccess(null)
                  }}
                />
              </label>

              <div className="form-field">
                <span>估计时长</span>
                <div className="estimate-options">
                  {ESTIMATE_PRESETS.map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => handlePresetSelect(minutes)}
                      className={
                        estimate === minutes ? 'chip-button is-active' : 'chip-button'
                      }
                    >
                      {minutes} 分
                    </button>
                  ))}
                </div>
                <label className="form-field">
                  <span>自定义（1-9999）</span>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={customEstimate}
                    onChange={handleCustomChange}
                    placeholder="输入分钟数"
                  />
                </label>
                <button
                  className="link-button"
                  type="button"
                  onClick={handleClearEstimate}
                >
                  清空 estimate
                </button>
              </div>

              <button className="primary-button" type="submit" disabled={isSaving}>
                {isSaving ? '保存中…' : '保存更新'}
              </button>
              {success ? <p className="success-text">{success}</p> : null}
              {error ? <p className="error-text">{error}</p> : null}
            </form>
          </div>

          <div className="page-card">
            <h2>状态流转</h2>
            <p>Done 任务不会参与推荐，可随时恢复。</p>
            {task.state === 'done' ? (
              <button
                className="secondary-button"
                type="button"
                onClick={handleRestore}
                disabled={isTransitioning}
              >
                {isTransitioning ? '处理中…' : 'Restore 到任务池'}
              </button>
            ) : (
              <button
                className="secondary-button"
                type="button"
                onClick={handleMarkDone}
                disabled={isTransitioning}
              >
                {isTransitioning ? '处理中…' : '标记 Done / 归档'}
              </button>
            )}
          </div>

          <div className="page-card danger-zone">
            <h2>删除任务</h2>
            <p>删除后无法恢复，未来可在此处新增归档操作。</p>
            <button
              className="danger-button"
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? '删除中…' : '删除任务'}
            </button>
          </div>
        </>
      ) : (
        <p className="error-text">{error ?? '无法读取任务详情'}</p>
      )}

      <Link className="secondary-button" to="/">
        返回 Home
      </Link>
    </section>
  )
}

export default TaskDetailPage
