import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import FinishModal from '../components/FinishModal'
import { useFocusSession } from '../state/FocusSessionContext'

function FocusPage() {
  const navigate = useNavigate()
  const { focusingTask, session, finishFocus, exitWithoutRecording, isBusy } =
    useFocusSession()
  const [now, setNow] = useState(Date.now())
  const [isModalOpen, setModalOpen] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    setNote('')
  }, [session?.taskId])

  const elapsedDisplay = useMemo(() => {
    if (!session) return '00:00'
    const elapsedSeconds = Math.max(
      0,
      Math.floor((now - new Date(session.startedAt).getTime()) / 1000),
    )
    const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')
    const seconds = String(elapsedSeconds % 60).padStart(2, '0')
    return `${minutes}:${seconds}`
  }, [now, session])

  const subtitle = useMemo(() => {
    if (!focusingTask) return ''
    if (focusingTask.last_finish_note) {
      return focusingTask.last_finish_note
    }
    if (focusingTask.last_session_end_at) {
      return `上次结束：${new Date(
        focusingTask.last_session_end_at,
      ).toLocaleString()}`
    }
    return '首次深度会话'
  }, [focusingTask])

  const handleFinish = async (noteValue: string | null) => {
    try {
      await finishFocus(noteValue)
      setModalOpen(false)
      navigate('/')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleExit = async () => {
    await exitWithoutRecording()
    navigate('/')
  }

  if (!session || !focusingTask) {
    return (
      <section className="page focus-page">
        <p className="page-kicker">Focus</p>
        <h1>暂无进行中的深度行动</h1>
        <p className="page-lead">请在 Home 页 Start 一个行动后再回来。</p>
        <Link className="primary-button" to="/">
          返回 Home
        </Link>
      </section>
    )
  }

  return (
    <section className="page focus-page">
      <p className="page-kicker">Focus</p>
      <h1>{focusingTask.title || '未命名任务'}</h1>
      <p className="page-lead">{subtitle}</p>

      <div className="focus-demo">
        <p className="focus-demo__task">深度进行中</p>
        <p className="focus-demo__timer">{elapsedDisplay}</p>
        {error ? <p className="error-text">{error}</p> : null}
        <button
          className="primary-button"
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={isBusy}
        >
          Finish
        </button>
        <button className="link-button" type="button" onClick={handleExit}>
          退出并不记录
        </button>
      </div>

      <FinishModal
        isOpen={isModalOpen}
        note={note}
        onNoteChange={setNote}
        onSave={() => handleFinish(note)}
        onSkip={() => handleFinish(null)}
        onCancel={() => setModalOpen(false)}
        isSubmitting={isBusy}
      />
    </section>
  )
}

export default FocusPage
