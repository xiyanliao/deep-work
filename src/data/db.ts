import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  Session,
  SettingKey,
  SettingRecord,
  SettingValueMap,
  Task,
  TaskCategory,
} from '../types'

type StoredTask = Omit<Task, 'category'> & { category?: TaskCategory }

interface DeepWorkDBSchema extends DBSchema {
  tasks: {
    key: string
    value: StoredTask
    indexes: {
      'by-state': Task['state']
    }
  }
  sessions: {
    key: string
    value: Session
    indexes: {
      'by-task': Session['task_id']
      'by-end_at': Session['end_at']
    }
  }
  settings: {
    key: SettingKey
    value: SettingRecord
  }
}

const DB_NAME = 'deep-work-db'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<DeepWorkDBSchema>> | null = null

function createDatabase() {
  return openDB<DeepWorkDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('tasks')) {
        const taskStore = db.createObjectStore('tasks', { keyPath: 'id' })
        taskStore.createIndex('by-state', 'state')
      }

      if (!db.objectStoreNames.contains('sessions')) {
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' })
        sessionStore.createIndex('by-task', 'task_id')
        sessionStore.createIndex('by-end_at', 'end_at')
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' })
      }
    },
  })
}

export function getDB() {
  if (!dbPromise) {
    dbPromise = createDatabase()
  }
  return dbPromise
}

const nowISO = () => new Date().toISOString()

const defaultTaskFields = (): Pick<
  Task,
  | 'spent_minutes'
  | 'state'
  | 'last_finish_note'
  | 'last_session_end_at'
  | 'session_count'
  | 'created_at'
  | 'updated_at'
> => {
  const timestamp = nowISO()
  return {
    spent_minutes: 0,
    state: 'cold',
    last_finish_note: null,
    last_session_end_at: null,
    session_count: 0,
    created_at: timestamp,
    updated_at: timestamp,
  }
}

export interface TaskDraft {
  title: string
  estimate_minutes?: number | null
  category?: TaskCategory
}

function normalizeTask(task: StoredTask | undefined | null): Task | null {
  if (!task) return null
  const category = task.category ?? 'work'
  return { ...task, category }
}

export async function createTask(draft: TaskDraft) {
  const db = await getDB()
  const id = crypto.randomUUID()
  const title = draft.title.trim() || '未命名任务'
  const task: StoredTask = {
    id,
    title,
    estimate_minutes:
      typeof draft.estimate_minutes === 'number'
        ? draft.estimate_minutes
        : null,
    category: draft.category ?? 'work',
    ...defaultTaskFields(),
  }
  await db.add('tasks', task)
  return normalizeTask(task)!
}

export async function listTasks() {
  const db = await getDB()
  const records = await db.getAll('tasks')
  return records.map((task) => normalizeTask(task)!)
}

export async function getTask(id: string) {
  const db = await getDB()
  return normalizeTask(await db.get('tasks', id)) ?? undefined
}

export async function upsertTask(task: Task) {
  const db = await getDB()
  const mergedTask: StoredTask = {
    ...task,
    category: task.category ?? 'work',
    updated_at: nowISO(),
  }
  await db.put('tasks', mergedTask)
  return normalizeTask(mergedTask)!
}

export async function deleteTask(taskId: string) {
  const db = await getDB()
  await db.delete('tasks', taskId)
}

const ensureTaskExists = (task: Task | null | undefined): Task => {
  if (!task) {
    throw new Error('Task not found')
  }
  return task
}

export async function markDone(taskId: string) {
  const db = await getDB()
  const task = ensureTaskExists(normalizeTask(await db.get('tasks', taskId)))
  if (task.state === 'done') {
    return task
  }
  const nextTask: Task = {
    ...task,
    state: 'done',
    updated_at: nowISO(),
  }
  await db.put('tasks', nextTask)
  return nextTask
}

export async function restoreTask(taskId: string) {
  const db = await getDB()
  const task = ensureTaskExists(normalizeTask(await db.get('tasks', taskId)))
  if (task.state !== 'done') {
    return task
  }
  const nextState = task.session_count > 0 ? 'warm' : 'cold'
  const nextTask: Task = {
    ...task,
    state: nextState,
    updated_at: nowISO(),
  }
  await db.put('tasks', nextTask)
  return nextTask
}

export async function updateTaskState(taskId: string, state: Task['state']) {
  const db = await getDB()
  const task = ensureTaskExists(normalizeTask(await db.get('tasks', taskId)))
  const nextTask: Task = {
    ...task,
    state,
    updated_at: nowISO(),
  }
  await db.put('tasks', nextTask)
  return nextTask
}

export type SessionDraft = Omit<Session, 'id'>

export async function addSession(session: SessionDraft, id?: string) {
  const db = await getDB()
  const record: Session = {
    ...session,
    id: id ?? crypto.randomUUID(),
  }
  await db.add('sessions', record)
  return record
}

export async function listSessionsByTask(taskId: string) {
  const db = await getDB()
  return db.getAllFromIndex('sessions', 'by-task', taskId)
}

export async function listSessionsByRange(startISO: string, endISO: string) {
  const db = await getDB()
  const range = IDBKeyRange.bound(startISO, endISO, false, false)
  return db.getAllFromIndex('sessions', 'by-end_at', range)
}

export async function getFocusingTask() {
  const db = await getDB()
  const tx = db.transaction('tasks', 'readonly')
  const store = tx.store
  const index = store.index('by-state')
  const cursor = await index.openCursor('focusing')
  return normalizeTask(cursor?.value) ?? null
}

export async function getSetting<K extends SettingKey>(key: K) {
  const db = await getDB()
  const record = await db.get('settings', key)
  return record?.value as SettingValueMap[K] | undefined
}

export async function setSetting<K extends SettingKey>(
  key: K,
  value: SettingValueMap[K],
) {
  const db = await getDB()
  const record: SettingRecord<K> = {
    id: key,
    value,
    updated_at: nowISO(),
  }
  await db.put('settings', record)
  return record
}

interface FinishTaskOptions {
  taskId: string
  minutes: number
  note?: string | null
}

export async function finishTask({
  taskId,
  minutes,
  note,
  startAt,
}: FinishTaskOptions & { startAt: string }) {
  const db = await getDB()
  const task = ensureTaskExists(normalizeTask(await db.get('tasks', taskId)))
  if (task.state !== 'focusing') {
    throw new Error('当前任务不在 focusing 状态')
  }
  const safeMinutes = Number.isFinite(minutes) ? Math.max(1, Math.round(minutes)) : 1
  const now = nowISO()
  const trimmedNote = note?.trim()
  const nextTask: Task = {
    ...task,
    spent_minutes: task.spent_minutes + safeMinutes,
    session_count: task.session_count + 1,
    last_session_end_at: now,
    last_finish_note: trimmedNote ? trimmedNote : task.last_finish_note,
    state: 'warm',
    updated_at: now,
  }
  await db.put('tasks', nextTask)
  await addSession({
    task_id: taskId,
    start_at: startAt,
    end_at: now,
    minutes: safeMinutes,
    note_snapshot: trimmedNote ?? null,
  })
  return nextTask
}
