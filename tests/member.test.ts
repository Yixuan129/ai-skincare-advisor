import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MEMBER_KEY,
  clearMember,
  emptyPrefs,
  loadMember,
  membershipCopy,
  prefsForSave,
  presentFollow,
  resolveFollowSelection,
  saveMember,
  savedFollowSummary,
  type MemberRecord,
} from '../src/membership/store.ts'
import { SAVED_PLANS_KEY, type PlanStore } from '../src/saved/storage.ts'

class MemoryStore implements PlanStore {
  items = new Map<string, string>()
  failSet = false
  failGet = false
  failRemove = false
  getItem(key: string) {
    if (this.failGet) throw new Error('blocked')
    return this.items.get(key) ?? null
  }
  setItem(key: string, value: string) {
    if (this.failSet) throw new Error('quota')
    this.items.set(key, value)
  }
  removeItem(key: string) {
    if (this.failRemove) throw new Error('blocked')
    this.items.delete(key)
  }
}

const record: MemberRecord = {
  joined: true,
  prefs: { day3: true, day14: false, season: true, low: false },
  followPlanId: 'plan-a',
  followProductId: 'local-01',
  confirmedPlanId: 'plan-a',
  confirmedProductId: 'local-01',
}

const plans = [
  { id: 'plan-a', products: [{ id: 'local-01' }, { id: 'local-11' }] },
  { id: 'plan-b', products: [{ id: 'local-01' }] },
]

test('新的演示会员默认四个开关都关闭', () => {
  assert.deepEqual(emptyPrefs(), { day3: false, day14: false, season: false, low: false })
  assert.equal(savedFollowSummary(emptyPrefs()), '当前没有开启任何跟进节点。')
})

test('只保存演示状态和四个开关，不保存问答或身份信息', () => {
  const store = new MemoryStore()
  assert.deepEqual(saveMember(store, record), { ok: true })
  const raw = store.getItem(MEMBER_KEY) ?? ''
  const parsed = JSON.parse(raw) as { joined: boolean; prefs: Record<string, boolean> }
  assert.deepEqual(Object.keys(parsed).sort(), [
    'confirmedPlanId',
    'confirmedProductId',
    'followPlanId',
    'followProductId',
    'joined',
    'prefs',
  ])
  assert.deepEqual(Object.keys(parsed.prefs).sort(), ['day14', 'day3', 'low', 'season'])
  for (const phrase of [
    'currentDiscomfort',
    'knownAllergens',
    'discomfortAfter',
    'avoidIngredients',
    'observableSigns',
    'sensitivityHistory',
    'ingredientExperience',
    '手机',
    '姓名',
    '会员编号',
    'joinedAt',
    'answers',
  ]) {
    assert.equal(raw.includes(phrase), false, phrase)
  }
  assert.deepEqual(loadMember(store).record, record)
  assert.equal(savedFollowSummary(record.prefs), '已选择：开始使用后第3天、换季时。')
})

test('清除会员数据时不删除已保存方案', () => {
  const store = new MemoryStore()
  store.setItem(SAVED_PLANS_KEY, '[]')
  saveMember(store, record)
  assert.deepEqual(clearMember(store), { ok: true })
  assert.equal(store.getItem(MEMBER_KEY), null)
  assert.equal(store.getItem(SAVED_PLANS_KEY), '[]')
  assert.deepEqual(loadMember(store), { record: null, error: null })
})

test('损坏或读不出的会员记录不会被沿用', () => {
  const broken = new MemoryStore()
  broken.setItem(MEMBER_KEY, '{')
  const loaded = loadMember(broken)
  assert.equal(loaded.record, null)
  assert.match(loaded.error ?? '', /没有沿用/)

  const blocked = new MemoryStore()
  blocked.failGet = true
  assert.equal(loadMember(blocked).record, null)

  const full = new MemoryStore()
  full.failSet = true
  const outcome = saveMember(full, record)
  assert.equal(outcome.ok, false)
  assert.equal(full.getItem(MEMBER_KEY), null)

  const stuck = new MemoryStore()
  saveMember(stuck, record)
  stuck.failRemove = true
  assert.equal(clearMember(stuck).ok, false)
  assert.equal(loadMember(stuck).record?.joined, true)
})

test('换方案或产品后不沿用上一款的使用和补货节点，换季偏好可以留下', () => {
  const switched = presentFollow(record, { planId: 'plan-a', productId: 'local-11' })
  assert.ok(switched)
  assert.equal(switched.prefs.season, true)
  assert.equal(switched.prefs.day3, false)
  assert.equal(switched.prefs.day14, false)
  assert.equal(switched.prefs.low, false)
  assert.equal(switched.needsConfirm, true)
  assert.equal(switched.summary.includes('开始使用后第3天'), false)
  assert.match(switched.summary, /换季时/)

  const otherPlan = presentFollow(record, { planId: 'plan-b', productId: 'local-01' })
  assert.equal(otherPlan?.prefs.day3, false)
  assert.equal(otherPlan?.needsConfirm, true)

  const same = presentFollow(record, { planId: 'plan-a', productId: 'local-01' })
  assert.equal(same?.prefs.day3, true)
  assert.equal(same?.needsConfirm, false)

  const exited = presentFollow({ ...record, joined: false }, { planId: 'plan-a', productId: 'local-01' })
  assert.equal(exited, null)
})

test('没有跟进产品时只保存换季偏好，已打开的产品节点不会被保存悄悄关掉', () => {
  const kept = prefsForSave({ ...record.prefs, season: false, day3: false }, null, record)
  assert.equal(kept.prefs.day3, true)
  assert.equal(kept.prefs.season, false)
  assert.equal(kept.confirmedPlanId, 'plan-a')
  assert.equal(kept.confirmedProductId, 'local-01')

  const saved = prefsForSave({ ...emptyPrefs(), day3: true, season: true }, { planId: 'plan-a', productId: 'local-01' }, record)
  assert.equal(saved.prefs.day3, true)
  assert.equal(saved.prefs.season, true)
  assert.deepEqual(saved, {
    prefs: { day3: true, day14: false, season: true, low: false },
    confirmedPlanId: 'plan-a',
    confirmedProductId: 'local-01',
  })

  assert.deepEqual(resolveFollowSelection('plan-a', 'local-01', plans), { planId: 'plan-a', productId: 'local-01' })
  assert.deepEqual(resolveFollowSelection('plan-a', null, plans), { planId: 'plan-a', productId: null })
  assert.deepEqual(resolveFollowSelection('missing', 'local-01', plans), { planId: null, productId: null })
})

test('退出只关闭呈现，清除才删除偏好且不影响方案', () => {
  const store = new MemoryStore()
  store.setItem(SAVED_PLANS_KEY, '[{"id":"keep"}]')
  saveMember(store, record)
  const exited: MemberRecord = { ...record, joined: false }
  assert.deepEqual(saveMember(store, exited), { ok: true })
  assert.equal(presentFollow(loadMember(store).record, { planId: 'plan-a', productId: 'local-01' }), null)
  assert.equal(loadMember(store).record?.prefs.season, true)
  assert.deepEqual(clearMember(store), { ok: true })
  assert.equal(store.getItem(MEMBER_KEY), null)
  assert.equal(store.getItem(SAVED_PLANS_KEY), '[{"id":"keep"}]')
})

test('没有记下产品范围的旧记录，不会把使用节点套到当前产品', () => {
  const store = new MemoryStore()
  store.setItem(MEMBER_KEY, JSON.stringify({ joined: true, prefs: record.prefs, answers: { currentDiscomfort: 'explicit', knownAllergens: '秘密过敏原' } }))
  const loaded = loadMember(store).record
  assert.equal(loaded?.confirmedProductId, null)
  assert.equal(loaded?.followProductId, null)
  assert.equal(JSON.stringify(loaded).includes('currentDiscomfort'), false)
  assert.equal(JSON.stringify(loaded).includes('秘密过敏原'), false)
  const shown = presentFollow(loaded, { planId: 'plan-a', productId: 'local-01' })
  assert.equal(shown?.prefs.day3, false)
  assert.equal(shown?.prefs.season, true)
  assert.equal(shown?.needsConfirm, true)
})

test('没有体验装资料时不编写规格，当前不适时不给出促销内容', () => {
  const named = membershipCopy({ productNames: [' 宝拉珍选水杨酸精华露 ', '宝拉珍选水杨酸精华露'], limitUse: false })
  assert.equal(named.neutral, null)
  assert.match(named.trial ?? '', /宝拉珍选水杨酸精华露/)
  assert.match(named.trial ?? '', /概念权益，未领取、不寄送/)
  assert.match(named.trial ?? '', /不补充/)
  assert.equal((named.trial ?? '').includes('5ml'), false)
  assert.equal((named.trial ?? '').includes('库存：'), false)

  const empty = membershipCopy({ productNames: ['  '], limitUse: false })
  assert.match(empty.trial ?? '', /当前没有候选产品/)
  assert.equal((empty.trial ?? '').includes('水杨酸'), false)

  const limited = membershipCopy({ productNames: ['宝拉珍选水杨酸精华露'], limitUse: true })
  assert.equal(limited.trial, null)
  assert.equal(limited.neutral, '可查看资料及管理服务偏好')
  const text = JSON.stringify(limited)
  for (const phrase of ['促销', '进阶', '复购', '领取', '寄送', '体验装', '开始使用', '升级']) {
    assert.equal(text.includes(phrase), false, phrase)
  }
})
