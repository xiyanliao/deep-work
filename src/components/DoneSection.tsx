import { TASK_STATE_COPY } from '../constants/tasks'
import type { Task } from '../types'
import { useDurationFormat } from '../state/DurationFormatContext'

interface Props {
  tasks: Task[]
  isLoading: boolean
  isOpen: boolean
  onToggle: () => void
  onRestore: (taskId: string) => void
  onDelete?: (taskId: string) => void
}

function DoneSection({
  tasks,
  isLoading,
  isOpen,
  onToggle,
  onRestore,
  onDelete,
}: Props) {
  const { formatMinutes } = useDurationFormat()
  const sorted = [...tasks].sort(
    (a, b) =>
      new Date(b.updated_at ?? b.created_at).getTime() -
      new Date(a.updated_at ?? a.created_at).getTime(),
  )

  return (
    <div className="done-section">
      <button className="collapse-toggle" type="button" onClick={onToggle}>
        Done 区（{tasks.length}）
        <span>{isOpen ? '收起' : '展开'}</span>
      </button>
      {isOpen ? (
        isLoading ? (
          <p>读取中…</p>
        ) : !sorted.length ? (
          <p className="hint-text">暂无 Done 任务，完成后会自动折叠在这里。</p>
        ) : (
          <ul className="done-list">
            {sorted.map((task) => (
              <li key={task.id} className="done-card">
                <div className="done-card__content">
                  <p className="done-card__title">{task.title || '未命名任务'}</p>
                  <p className="done-card__meta">
                    {`${TASK_STATE_COPY[task.state]} · 累计 ${formatMinutes(task.spent_minutes)}`}
                  </p>
                </div>
                <div className="done-card__actions">
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => onRestore(task.id)}
                  >
                    Restore
                  </button>
                  {onDelete ? (
                    <button
                      className="danger-button danger-button--compact"
                      type="button"
                      onClick={() => onDelete(task.id)}
                    >
                      删除
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  )
}

export default DoneSection
