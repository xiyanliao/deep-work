import { Link } from 'react-router-dom'
import { TASK_STATE_COPY } from '../constants/tasks'
import type { Task } from '../types'
import { useDurationFormat } from '../state/DurationFormatContext'

interface Props {
  tasks: Task[]
  isLoading: boolean
  onRefresh?: () => void
  onMarkDone?: (taskId: string) => void
  onStart?: (taskId: string) => void
  focusingTaskId?: string | null
  isStarting?: boolean
  emptyHint?: string
}

function getProgressInfo(task: Task, formatMinutes: (minutes: number) => string) {
  if (typeof task.estimate_minutes === 'number' && task.estimate_minutes > 0) {
    const ratio = task.estimate_minutes
      ? task.spent_minutes / task.estimate_minutes
      : 0
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
}

function getWarmSubtitle(task: Task) {
  if (task.state !== 'warm') return null
  if (task.last_finish_note) {
    return task.last_finish_note
  }
  if (task.last_session_end_at) {
    return `上次进行：${new Date(task.last_session_end_at).toLocaleString()}`
  }
  return '上次进行：尚无记录'
}

function getStatePillClass(state: Task['state']) {
  if (state === 'warm') {
    return 'state-pill state-pill--warm'
  }
  return 'state-pill'
}

function getTaskCardClass(state: Task['state']) {
  if (state === 'cold') return 'task-card task-card--cold'
  if (state === 'warm') return 'task-card task-card--warm'
  return 'task-card'
}

function TaskList({
  tasks,
  isLoading,
  onRefresh,
  onMarkDone,
  onStart,
  focusingTaskId,
  isStarting,
  emptyHint,
}: Props) {
  const { formatMinutes } = useDurationFormat()
  const activeTasks = tasks
    .filter((task) => task.state !== 'done')
    .sort(
      (a, b) =>
        new Date(b.updated_at ?? b.created_at).getTime() -
        new Date(a.updated_at ?? a.created_at).getTime(),
    )

  if (isLoading) {
    return <p>读取任务中…</p>
  }

  if (!activeTasks.length) {
    return (
      <div className="task-list__empty">
        <p>{emptyHint ?? '还没有未归档任务，创建一个来开启深度。'}</p>
        <button className="link-button" type="button" onClick={onRefresh}>
          重新读取
        </button>
      </div>
    )
  }

  return (
    <ul className="task-list">
      {activeTasks.map((task) => {
        const progressInfo = getProgressInfo(task, formatMinutes)
        return (
          <li key={task.id} className={getTaskCardClass(task.state)}>
            <div className="task-card__content">
              <div className="task-card__head">
                <Link to={`/task/${task.id}`} className="task-card__title-button">
                  {task.title || '未命名任务'}
                </Link>
                <div className="task-card__actions">
                  {onStart && ['cold', 'warm'].includes(task.state) ? (
                    <button
                      className="primary-button primary-button--small"
                      type="button"
                      disabled={isStarting || focusingTaskId === task.id}
                      onClick={() => onStart(task.id)}
                    >
                      Start
                    </button>
                  ) : null}
                  {onMarkDone && task.state !== 'focusing' ? (
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => onMarkDone(task.id)}
                    >
                      标记 Done
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="task-card__meta">
                <span className={getStatePillClass(task.state)}>
                  {TASK_STATE_COPY[task.state]}
                </span>
                <span>{progressInfo.text}</span>
              </p>
              {progressInfo.type === 'estimate' ? (
                <div className="progress-meter" role="img" aria-label="任务进度">
                  <div
                    className="progress-meter__fill"
                    style={{ width: `${Math.min(progressInfo.ratio, 1) * 100}%` }}
                  />
                  <span className="progress-meter__overflow">
                    {Math.round(progressInfo.ratio * 100)}%
                  </span>
                </div>
              ) : null}
              {getWarmSubtitle(task) ? (
                <p className="task-card__subtitle">{getWarmSubtitle(task)}</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default TaskList
