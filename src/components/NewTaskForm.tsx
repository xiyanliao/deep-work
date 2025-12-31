import { useState } from 'react'
import type { FormEvent } from 'react'
import { createTask } from '../data/db'

interface Props {
  onCreated?: () => void
}

function NewTaskForm({ onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setError('请输入任务标题')
      return
    }
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      await createTask({ title: trimmed })
      setTitle('')
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
      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? '创建中…' : '添加任务'}
      </button>
      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}
    </form>
  )
}

export default NewTaskForm
