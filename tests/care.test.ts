import test from 'node:test'
import assert from 'node:assert/strict'
import { clearCareRecords, writeCare } from '../src/membership/care-storage.ts'
import type { PlanStore } from '../src/saved/storage.ts'

class Store implements PlanStore {
  values = new Map<string, string>()
  blockedKey = ''
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { if (key === this.blockedKey) throw Error('quota'); this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

test('不同方案和产品的护理记录相互独立', () => {
  const store = new Store()
  writeCare(store, 'baola.care.v1:plan-a:eye', { start: '2026-11-07' })
  writeCare(store, 'baola.care.v1:plan-a:bha', { start: '2026-11-09' })
  assert.equal(JSON.parse(store.getItem('baola.care.v1:plan-a:eye')!).start, '2026-11-07')
  assert.equal(JSON.parse(store.getItem('baola.care.v1:plan-a:bha')!).start, '2026-11-09')
})

test('清除使用档案保留保存方案和其他应用记录', () => {
  const store = new Store()
  store.setItem('baola.savedPlans.v1', '["keep"]')
  store.setItem('another-app', 'keep')
  writeCare(store, 'baola.care.v1:a:b', { entries: [] })
  clearCareRecords(store)
  assert.equal(store.getItem('baola.care.v1:a:b'), null)
  assert.equal(store.getItem('baola.savedPlans.v1'), '["keep"]')
  assert.equal(store.getItem('another-app'), 'keep')
})

test('写入失败保留原使用记录，并可以重试', () => {
  const store = new Store(), key = 'baola.care.v1:a:b'
  writeCare(store, key, { start: '2026-11-07' })
  store.blockedKey = key
  assert.throws(() => writeCare(store, key, { start: '2026-11-09' }))
  assert.equal(JSON.parse(store.getItem(key)!).start, '2026-11-07')
  store.blockedKey = ''
  writeCare(store, key, { start: '2026-11-09' })
  assert.equal(JSON.parse(store.getItem(key)!).start, '2026-11-09')
})

test('记录索引不能用于删除其他应用的数据', () => {
  const store = new Store()
  store.setItem('other', 'keep')
  store.setItem('baola.care.keys.v1', '["other",7,null]')
  clearCareRecords(store)
  assert.equal(store.getItem('other'), 'keep')
})
