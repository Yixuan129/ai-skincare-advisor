import type { PlanStore } from '../saved/storage.ts'

const INDEX_KEY = 'baola.care.keys.v1'
const PREFIX = 'baola.care.v1:'

function readKeys(store: PlanStore): string[] {
  const keys: unknown = JSON.parse(store.getItem(INDEX_KEY) ?? '[]')
  if (!Array.isArray(keys)) throw new Error('无法读取使用记录索引')
  return keys.filter((key): key is string => typeof key === 'string' && key.startsWith(PREFIX))
}

export function writeCare(store: PlanStore, key: string, value: unknown) {
  if (!key.startsWith(PREFIX)) throw new Error('无效的使用记录位置')
  const keys = readKeys(store)
  // Index first: even an interrupted write remains discoverable for deletion.
  store.setItem(INDEX_KEY, JSON.stringify([...new Set([...keys, key])]))
  store.setItem(key, JSON.stringify(value))
}

export function clearCareRecords(store: PlanStore) {
  for (const key of readKeys(store)) store.removeItem(key)
  store.removeItem(INDEX_KEY)
}
