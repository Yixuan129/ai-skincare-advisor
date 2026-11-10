import type { PlanStore } from '../saved/storage.ts'

export const MEMBER_KEY = 'baola.demoMember.v1'

export const followNodes = [
  { id: 'day3', when: '开始使用后第3天', what: '使用体验反馈' },
  { id: 'day14', when: '开始使用后第14天', what: '阶段感受回顾' },
  { id: 'season', when: '换季时', what: '重新检查当前需求' },
  { id: 'low', when: '余量不足时', what: '补货需求确认' },
] as const

export type FollowId = (typeof followNodes)[number]['id']

export type FollowPrefs = Record<FollowId, boolean>

export type MemberRecord = {
  joined: boolean
  prefs: FollowPrefs
  followPlanId: string | null
  followProductId: string | null
  confirmedPlanId: string | null
  confirmedProductId: string | null
}

export type FollowTarget = {
  planId: string
  productId: string
}

const productFollowIds = ['day3', 'day14', 'low'] as const satisfies readonly FollowId[]

export function isProductFollow(id: FollowId) {
  return productFollowIds.some((productId) => productId === id)
}

export const neutralServiceLine = '可查看资料及管理服务偏好'

const followIds = followNodes.map((node) => node.id)

export function emptyPrefs(): FollowPrefs {
  return { day3: false, day14: false, season: false, low: false }
}

export function savedFollowSummary(prefs: FollowPrefs) {
  const chosen = followNodes.filter((node) => prefs[node.id]).map((node) => node.when)
  if (chosen.length === 0) return '当前没有开启任何跟进节点。'
  return `已选择：${chosen.join('、')}。`
}

export function resolveFollowSelection(
  planId: string | null,
  productId: string | null,
  plans: readonly { id: string; products: readonly { id: string }[] }[],
) {
  const plan = planId ? plans.find((item) => item.id === planId) : undefined
  if (!plan) return { planId: null as string | null, productId: null as string | null }
  const product = productId && plan.products.some((item) => item.id === productId) ? productId : null
  return { planId: plan.id, productId: product }
}

function sameFollowTarget(confirmed: FollowTarget | null, active: FollowTarget | null) {
  return Boolean(confirmed && active && confirmed.planId === active.planId && confirmed.productId === active.productId)
}

function confirmedTarget(record: MemberRecord): FollowTarget | null {
  if (!record.confirmedPlanId || !record.confirmedProductId) return null
  return { planId: record.confirmedPlanId, productId: record.confirmedProductId }
}

export function visiblePrefs(prefs: FollowPrefs, confirmed: FollowTarget | null, active: FollowTarget | null): FollowPrefs {
  const same = sameFollowTarget(confirmed, active)
  return {
    day3: same ? prefs.day3 : false,
    day14: same ? prefs.day14 : false,
    season: prefs.season,
    low: same ? prefs.low : false,
  }
}

export function productNodesNeedConfirm(prefs: FollowPrefs, confirmed: FollowTarget | null, active: FollowTarget | null) {
  const stored = productFollowIds.some((id) => prefs[id])
  return stored && !sameFollowTarget(confirmed, active)
}

export function presentFollow(record: MemberRecord | null, active: FollowTarget | null) {
  if (!record?.joined) return null
  const confirmed = confirmedTarget(record)
  const prefs = visiblePrefs(record.prefs, confirmed, active)
  return {
    prefs,
    summary: savedFollowSummary(prefs),
    needsConfirm: productNodesNeedConfirm(record.prefs, confirmed, active),
  }
}

export function prefsForSave(draft: FollowPrefs, active: FollowTarget | null, previous: MemberRecord) {
  if (!active) {
    return {
      prefs: {
        day3: previous.prefs.day3,
        day14: previous.prefs.day14,
        season: draft.season,
        low: previous.prefs.low,
      },
      confirmedPlanId: previous.confirmedPlanId,
      confirmedProductId: previous.confirmedProductId,
    }
  }
  return {
    prefs: { ...draft },
    confirmedPlanId: active.planId,
    confirmedProductId: active.productId,
  }
}

export function clearedFollow(active: FollowTarget | null) {
  return {
    prefs: emptyPrefs(),
    confirmedPlanId: active?.planId ?? null,
    confirmedProductId: active?.productId ?? null,
  }
}

export function trialCopy(productNames: string[]) {
  const names = [...new Set(productNames.map((name) => name.trim()).filter(Boolean))]
  if (names.length === 0) {
    return '当前没有候选产品，不展示体验装。概念权益，未领取、不寄送。资料没有体验装规格或库存，这里不补充。'
  }
  const listed = names.map((name) => `「${name}」`).join('、')
  return `可以查看与${listed}相关的拟议体验装。资料没有单独的体验装规格或库存，这里不补充。概念权益，未领取、不寄送。`
}

export function membershipCopy(input: { productNames: string[]; limitUse: boolean }) {
  if (input.limitUse) return { neutral: neutralServiceLine, trial: null }
  return { neutral: null, trial: trialCopy(input.productNames) }
}

export function loadMember(store: PlanStore): { record: MemberRecord | null; error: string | null } {
  let raw: string | null
  try {
    raw = store.getItem(MEMBER_KEY)
  } catch {
    return { record: null, error: '浏览器存储暂时读不出来。没有沿用演示会员状态。' }
  }
  if (raw === null || raw.trim() === '') return { record: null, error: null }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { record: null, error: '演示会员记录无法识别，没有沿用。已保存的方案不受影响。' }
  }
  const record = coerceMember(parsed)
  if (!record) return { record: null, error: '演示会员记录无法识别，没有沿用。已保存的方案不受影响。' }
  return { record, error: null }
}

export function saveMember(store: PlanStore, record: MemberRecord): { ok: true } | { ok: false; message: string } {
  try {
    store.setItem(
      MEMBER_KEY,
      JSON.stringify({
        joined: record.joined,
        prefs: { ...record.prefs },
        followPlanId: record.followPlanId,
        followProductId: record.followProductId,
        confirmedPlanId: record.confirmedPlanId,
        confirmedProductId: record.confirmedProductId,
      }),
    )
    return { ok: true }
  } catch {
    return { ok: false, message: '浏览器没有保存成功。可以稍后再试。' }
  }
}

export function clearMember(store: PlanStore): { ok: true } | { ok: false; message: string } {
  try {
    store.removeItem(MEMBER_KEY)
    return { ok: true }
  } catch {
    return { ok: false, message: '没有清除成功。演示会员状态还在。' }
  }
}

function coerceMember(value: unknown): MemberRecord | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (typeof record.joined !== 'boolean') return null
  const prefs = coercePrefs(record.prefs)
  if (!prefs) return null
  return {
    joined: record.joined,
    prefs,
    followPlanId: optionalId(record.followPlanId),
    followProductId: optionalId(record.followProductId),
    confirmedPlanId: optionalId(record.confirmedPlanId),
    confirmedProductId: optionalId(record.confirmedProductId),
  }
}

function optionalId(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function coercePrefs(value: unknown): FollowPrefs | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const prefs = emptyPrefs()
  for (const id of followIds) {
    if (typeof record[id] !== 'boolean') return null
    prefs[id] = record[id]
  }
  return prefs
}
