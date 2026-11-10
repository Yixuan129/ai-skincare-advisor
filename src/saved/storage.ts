import type { PresentedProduct } from '../rules/present.ts'

export const RULE_VERSION = 'v2'
export const SAVED_PLANS_KEY = 'baola.savedPlans.v1'

export type SavedProduct = {
  id: string
  displayName: string
  spec: string | null
  rsp: number | null
  rspLabel: string
  sourceFile: string
  page: number
  verification: string
  reason: string
}

export type SavedPlan = {
  id: string
  savedAt: string
  productIds: string[]
  summary: string
  products: SavedProduct[]
  dataVersion: string
  ruleVersion: string
}

export type PlanStore = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type LoadResult = {
  plans: SavedPlan[]
  dropped: number
  error: string | null
}

const planKeys = ['id', 'savedAt', 'productIds', 'summary', 'products', 'dataVersion', 'ruleVersion'] as const
const productKeys = ['id', 'displayName', 'spec', 'rsp', 'rspLabel', 'sourceFile', 'page', 'verification', 'reason'] as const

export function buildSavedPlan(summary: string, products: PresentedProduct[], dataVersion: string, now = new Date()): SavedPlan {
  const savedProducts = products.map((product) => ({
    id: product.id,
    displayName: product.displayName,
    spec: product.spec,
    rsp: product.rsp,
    rspLabel: product.rspLabel,
    sourceFile: product.sourceFile,
    page: product.page,
    verification: product.verification,
    reason: product.storageReason,
  }))
  return {
    id: createId(now),
    savedAt: now.toISOString(),
    productIds: savedProducts.map((product) => product.id),
    summary,
    products: savedProducts,
    dataVersion,
    ruleVersion: RULE_VERSION,
  }
}

export function loadSavedPlans(store: PlanStore): LoadResult {
  let raw: string | null
  try {
    raw = store.getItem(SAVED_PLANS_KEY)
  } catch {
    return { plans: [], dropped: 0, error: '浏览器存储暂时读不出来。当前结果不受影响。' }
  }
  if (raw === null || raw.trim() === '') return { plans: [], dropped: 0, error: null }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { plans: [], dropped: 0, error: '已保存的记录损坏了，没有按它重新推荐。可以清空后重新保存。' }
  }
  if (!Array.isArray(parsed)) {
    return { plans: [], dropped: 0, error: '已保存的记录格式无法识别，没有按它重新推荐。' }
  }
  const plans: SavedPlan[] = []
  let dropped = 0
  for (const item of parsed) {
    const plan = coercePlan(item)
    if (plan) plans.push(plan)
    else dropped += 1
  }
  return { plans, dropped, error: null }
}

export function savePlan(store: PlanStore, plan: SavedPlan): { ok: true } | { ok: false; message: string } {
  const existing = loadSavedPlans(store)
  if (existing.error) {
    return { ok: false, message: `${existing.error}这次没有写入。` }
  }
  try {
    store.setItem(SAVED_PLANS_KEY, JSON.stringify([...existing.plans, sanitizePlan(plan)]))
    return { ok: true }
  } catch {
    return { ok: false, message: '浏览器没有保存成功。当前结果还在，可以稍后再试。' }
  }
}

export function deletePlan(store: PlanStore, id: string): { ok: true } | { ok: false; message: string } {
  const existing = loadSavedPlans(store)
  if (existing.error) return { ok: false, message: existing.error }
  try {
    store.setItem(SAVED_PLANS_KEY, JSON.stringify(existing.plans.filter((plan) => plan.id !== id)))
    return { ok: true }
  } catch {
    return { ok: false, message: '这条记录没有删除成功。' }
  }
}

export function clearPlans(store: PlanStore): { ok: true } | { ok: false; message: string } {
  try {
    store.setItem(SAVED_PLANS_KEY, '[]')
    return { ok: true }
  } catch {
    return { ok: false, message: '没有清空成功。已保存的记录还在。' }
  }
}

function sanitizePlan(plan: SavedPlan): SavedPlan {
  return {
    id: plan.id,
    savedAt: plan.savedAt,
    productIds: [...plan.productIds],
    summary: plan.summary,
    products: plan.products.map((product) => ({
      id: product.id,
      displayName: product.displayName,
      spec: product.spec,
      rsp: product.rsp,
      rspLabel: product.rspLabel,
      sourceFile: product.sourceFile,
      page: product.page,
      verification: product.verification,
      reason: product.reason,
    })),
    dataVersion: plan.dataVersion,
    ruleVersion: plan.ruleVersion,
  }
}

function coercePlan(value: unknown): SavedPlan | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const id = asString(record.id)
  const savedAt = asString(record.savedAt)
  const products = Array.isArray(record.products)
    ? record.products.flatMap((item) => {
        const product = coerceProduct(item)
        return product ? [product] : []
      })
    : []
  if (!id || !savedAt || products.length === 0) return null
  const productIds = Array.isArray(record.productIds)
    ? record.productIds.filter((item): item is string => typeof item === 'string')
    : products.map((product) => product.id)
  return {
    id,
    savedAt,
    productIds: productIds.length > 0 ? productIds : products.map((product) => product.id),
    summary: asString(record.summary) ?? '这是较早保存的方案。',
    products,
    dataVersion: asString(record.dataVersion) ?? '',
    ruleVersion: asString(record.ruleVersion) ?? '',
  }
}

function coerceProduct(value: unknown): SavedProduct | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const id = asString(record.id)
  const displayName = asString(record.displayName) ?? asString(record.name)
  if (!id || !displayName) return null
  const page = typeof record.page === 'number' ? record.page : null
  if (page === null) return null
  return {
    id,
    displayName,
    spec: asString(record.spec),
    rsp: typeof record.rsp === 'number' ? record.rsp : null,
    rspLabel: asString(record.rspLabel) ?? '资料RSP',
    sourceFile: asString(record.sourceFile) ?? '',
    page,
    verification: asString(record.verification) ?? '待核验资料',
    reason: asString(record.reason) ?? '这是当时保存的资料，不是新的推荐结论。',
  }
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function createId(now: Date) {
  const cryptoId = globalThis.crypto?.randomUUID?.()
  if (cryptoId) return cryptoId
  return `plan-${now.getTime()}`
}

export function browserStore(): PlanStore | null {
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

export function savedPlanKeys() {
  return { planKeys, productKeys }
}
