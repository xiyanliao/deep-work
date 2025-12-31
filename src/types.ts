export type TaskState = 'cold' | 'focusing' | 'warm' | 'done'

export type TimestampString = string

export interface Task {
  id: string
  title: string
  estimate_minutes: number | null
  spent_minutes: number
  state: TaskState
  last_finish_note: string | null
  last_session_end_at: TimestampString | null
  session_count: number
  created_at: TimestampString
  updated_at: TimestampString
}

export interface Session {
  id: string
  task_id: string
  start_at: TimestampString
  end_at: TimestampString
  minutes: number
  note_snapshot: string | null
}

export type SettingKey = 'timePreferenceMinutes' | 'lastCustomMinutes'

export interface SettingValueMap {
  timePreferenceMinutes: number
  lastCustomMinutes: number
}

export interface SettingRecord<K extends SettingKey = SettingKey> {
  id: K
  value: SettingValueMap[K]
  updated_at: TimestampString
}
