import type { Task } from '../types'
import { computeRemaining, type TaskWithRemaining } from '../constants/tasks'

export interface RecommendationResult {
  top: TaskWithRemaining | null
  alternatives: TaskWithRemaining[]
  message?: string
}

const MAX_RESULTS = 3

const sortTasks = (tasks: TaskWithRemaining[]) => {
  return tasks.sort((a, b) => {
    if (a.remaining_minutes !== null && b.remaining_minutes !== null) {
      if (a.remaining_minutes !== b.remaining_minutes) {
        return a.remaining_minutes - b.remaining_minutes
      }
    } else if (a.remaining_minutes !== null) {
      return -1
    } else if (b.remaining_minutes !== null) {
      return 1
    }

    const timeA = a.last_session_end_at
      ? new Date(a.last_session_end_at).getTime()
      : 0
    const timeB = b.last_session_end_at
      ? new Date(b.last_session_end_at).getTime()
      : 0
    if (timeA !== timeB) {
      return timeA - timeB
    }

    if (a.state === 'warm' && b.state === 'cold') {
      return -1
    }
    if (a.state === 'cold' && b.state === 'warm') {
      return 1
    }

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

export function recommendTasks(
  tasks: Task[],
  timeWindowMinutes: number,
): RecommendationResult {
  const candidates = tasks
    .filter((task) => task.state !== 'done' && task.category !== 'leisure')
    .map(computeRemaining)
  const matches = candidates.filter((task) => {
    if (task.remaining_minutes === null) {
      return false
    }
    return task.remaining_minutes <= timeWindowMinutes
  })
  sortTasks(matches)

  if (matches.length >= MAX_RESULTS) {
    return {
      top: matches[0],
      alternatives: matches.slice(1, MAX_RESULTS),
    }
  }

  const nonMatches = candidates.filter(
    (task) => task.remaining_minutes !== null,
  )
  sortTasks(nonMatches)
  const fallback = [...matches, ...nonMatches]

  if (!fallback.length) {
    const noEstimateTasks = candidates.filter(
      (task) => task.remaining_minutes === null,
    )
    if (!noEstimateTasks.length) {
      return { top: null, alternatives: [], message: '当前没有可推荐的任务' }
    }
    return {
      top: noEstimateTasks[0],
      alternatives: noEstimateTasks.slice(1, MAX_RESULTS),
      message: '任务暂无 estimate，建议补全以便推荐',
    }
  }

  let message: string | undefined
  if (!matches.length) {
    message = '可能做不完，但能推进'
  }

  return {
    top: fallback[0],
    alternatives: fallback.slice(1, MAX_RESULTS),
    message,
  }
}
