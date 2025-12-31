import { getDB } from '../data/db'
import type { IDBPObjectStore } from 'idb'

export interface BackupPayload {
  version: string
  exported_at: string
  tasks: unknown[]
  sessions: unknown[]
  settings: unknown[]
}

const BACKUP_VERSION = '1.0.0'

export async function exportBackup(): Promise<BackupPayload> {
  const db = await getDB()
  const [tasks, sessions, settings] = await Promise.all([
    db.getAll('tasks'),
    db.getAll('sessions'),
    db.getAll('settings'),
  ])
  return {
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    tasks,
    sessions,
    settings,
  }
}

export async function importBackup(payload: BackupPayload) {
  if (!payload || payload.version !== BACKUP_VERSION) {
    throw new Error('备份版本不匹配')
  }
  const db = await getDB()
  const tx = db.transaction(['tasks', 'sessions', 'settings'], 'readwrite')
  await Promise.all([
    clearAndPut(tx.objectStore('tasks'), payload.tasks),
    clearAndPut(tx.objectStore('sessions'), payload.sessions),
    clearAndPut(tx.objectStore('settings'), payload.settings),
  ])
  await tx.done
}

async function clearAndPut(
  store:
    | IDBPObjectStore<any, any, any, 'readwrite'>
    | IDBPObjectStore<any, any, any, 'versionchange'>,
  records: unknown[],
) {
  await store.clear()
  for (const record of records) {
    await store.put(record as any)
  }
}
