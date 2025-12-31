import type { Task } from '../types'

export const TASK_STATE_COPY: Record<Task['state'], string> = {
  cold: '冷启动',
  focusing: '进行中',
  warm: '保温',
  done: '已归档',
}

export const ESTIMATE_PRESETS = [20, 40, 60, 120] as const

export type EstimatePreset = (typeof ESTIMATE_PRESETS)[number]

export function isEstimatePreset(value: number | null): value is EstimatePreset {
  return (
    typeof value === 'number' &&
    ESTIMATE_PRESETS.includes(value as EstimatePreset)
  )
}

export interface TaskWithRemaining extends Task {
  remaining_minutes: number | null
}

export function computeRemaining(task: Task): TaskWithRemaining {
  if (typeof task.estimate_minutes === 'number' && task.estimate_minutes > 0) {
    return {
      ...task,
      remaining_minutes: Math.max(task.estimate_minutes - task.spent_minutes, 0),
    }
  }
  return { ...task, remaining_minutes: null }
}
