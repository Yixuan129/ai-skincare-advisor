import assert from 'node:assert/strict'
import test from 'node:test'
import { createAnswers, type Answers } from '../src/qa/model.ts'
import { loadCatalog } from '../src/rules/catalog.ts'
import { evaluateRules } from '../src/rules/engine.ts'
import { presentResult } from '../src/rules/present.ts'
import {
  SAVED_PLANS_KEY,
  buildSavedPlan,
  clearPlans,
  deletePlan,
  loadSavedPlans,
  savePlan,
  type PlanStore,
} from '../src/saved/storage.ts'

const catalog = loadCatalog()

class MemoryStore implements PlanStore {
  items = new Map<string, string>()
  failSet = false
  getItem(key: string) {
    return this.items.get(key) ?? null
  }
  setItem(key: string, value: string) {
    if (this.failSet) throw new Error('quota')
    this.items.set(key, value)
  }
  removeItem(key: string) {
    this.items.delete(key)
  }
}

function selection(): Answers {
  const answers = createAnswers('select')
  answers.currentDiscomfort = 'none'
  answers.discomfortAfter = '秘密不适经过'
  answers.skinType = 'combination_oily'
  answers.primaryGoal = 'congestion'
  answers.sensitivityHistory = 'occasional'
  answers.ingredientExperience = {
    bha: 'never',
    niacinamide: 'accepted',
    retinoid: 'never',
    vitaminC: 'uncertain',
  }
  answers.ownedStatus = 'named'
  answers.ownedName = '秘密已有产品'
  answers.ownedDetail = '秘密规格'
  answers.purchaseBudget = 'cap350'
  answers.texturePreference = 'none'
  answers.avoidStatus = 'no'
  answers.avoidIngredients = '秘密避开成分'
  answers.allergyStatus = 'no'
  answers.knownAllergens = '秘密过敏原'
  return answers
}

const forbidden = [
  'currentDiscomfort',
  'observableSigns',
  'discomfortAfter',
  'sensitivityHistory',
  'ingredientExperience',
  'knownAllergens',
  'avoidIngredients',
  'ownedName',
  'ownedDetail',
  '秘密不适经过',
  '秘密已有产品',
  '秘密规格',
  '秘密避开成分',
  '秘密过敏原',
  '没用过',
  '用过且能接受',
  'ruleIds',
  'R12',
  'R07',
]

test('保存内容只包含方案摘要，不含敏感回答', () => {
  const answers = selection()
  const view = presentResult(answers, catalog, evaluateRules(answers, catalog))
  const store = new MemoryStore()
  const outcome = savePlan(store, buildSavedPlan(view.summary, view.products, catalog.dataVersion, new Date('2026-11-07T12:00:00.000Z')))
  assert.equal(outcome.ok, true)
  const raw = store.getItem(SAVED_PLANS_KEY) ?? ''
  for (const word of forbidden) assert.equal(raw.includes(word), false, word)
  const loaded = loadSavedPlans(store)
  assert.equal(loaded.error, null)
  assert.equal(loaded.plans.length, 1)
  assert.deepEqual(loaded.plans[0].productIds, ['local-01'])
  assert.equal(loaded.plans[0].ruleVersion, 'v2')
  assert.match(loaded.plans[0].summary, /黑头/)
  assert.doesNotMatch(loaded.plans[0].summary, /不适|过敏|敏感/)
})

test('旧保存方案保留原来的预算文字', () => {
  const store = new MemoryStore()
  const summary = '想先处理「黑头、闭口、毛孔、痘痘或出油」。预算档是「200元及以下」。'
  store.setItem(
    SAVED_PLANS_KEY,
    JSON.stringify([
      {
        id: 'old-budget',
        savedAt: '2026-11-07T20:33:45.000Z',
        productIds: ['local-01'],
        summary,
        products: [
          {
            id: 'local-01',
            displayName: '宝拉珍选水杨酸精华露',
            spec: '118ml',
            rsp: 330,
            page: 2,
            reason: '当时的资料。',
          },
        ],
        dataVersion: 'old',
        ruleVersion: 'v2',
      },
    ]),
  )
  assert.equal(loadSavedPlans(store).plans[0]?.summary, summary)
  const answers = selection()
  const view = presentResult(answers, catalog, evaluateRules(answers, catalog))
  assert.match(view.summary, /单件价格是「350元及以下」/)
  const saved = savePlan(
    store,
    buildSavedPlan(view.summary, view.products, catalog.dataVersion, new Date('2026-11-07T21:00:00.000Z')),
  )
  assert.equal(saved.ok, true)
  const old = loadSavedPlans(store).plans.find((plan) => plan.id === 'old-budget')
  assert.equal(old?.summary, summary)
})

test('损坏 JSON 不会被新保存覆盖', () => {
  const store = new MemoryStore()
  store.setItem(SAVED_PLANS_KEY, '{')
  const answers = selection()
  const view = presentResult(answers, catalog, evaluateRules(answers, catalog))
  const outcome = savePlan(store, buildSavedPlan(view.summary, view.products, catalog.dataVersion))
  assert.equal(outcome.ok, false)
  assert.equal(store.getItem(SAVED_PLANS_KEY), '{')
  assert.match(loadSavedPlans(store).error ?? '', /损坏/)
})

test('旧记录里的回答字段不会被读出来', () => {
  const store = new MemoryStore()
  store.setItem(
    SAVED_PLANS_KEY,
    JSON.stringify([
      {
        id: 'old-1',
        savedAt: '2026-01-01T00:00:00.000Z',
        name: '旧方案',
        productIds: ['local-01'],
        products: [
          {
            id: 'local-01',
            displayName: '宝拉珍选水杨酸精华露',
            spec: '118ml',
            rsp: 330,
            page: 2,
            reason: '当时的资料。',
          },
        ],
        answers: { currentDiscomfort: 'explicit', knownAllergens: '秘密过敏原' },
      },
      { id: 'broken', savedAt: '2026-01-02T00:00:00.000Z', productIds: ['local-02'] },
    ]),
  )
  const loaded = loadSavedPlans(store)
  assert.equal(loaded.plans.length, 1)
  assert.equal(loaded.dropped, 1)
  assert.equal(loaded.plans[0].dataVersion, '')
  const raw = JSON.stringify(loaded.plans)
  assert.equal(raw.includes('秘密过敏原'), false)
  assert.equal(raw.includes('currentDiscomfort'), false)
})

test('存储失败、删除和清空', () => {
  const store = new MemoryStore()
  const answers = selection()
  const view = presentResult(answers, catalog, evaluateRules(answers, catalog))
  const plan = buildSavedPlan(view.summary, view.products, catalog.dataVersion, new Date('2026-11-07T12:00:00.000Z'))
  assert.equal(savePlan(store, plan).ok, true)
  store.failSet = true
  const again = buildSavedPlan(view.summary, view.products, catalog.dataVersion, new Date('2026-11-07T13:00:00.000Z'))
  assert.equal(savePlan(store, again).ok, false)
  assert.equal(loadSavedPlans(store).plans.length, 1)
  store.failSet = false
  assert.equal(deletePlan(store, plan.id).ok, true)
  assert.equal(loadSavedPlans(store).plans.length, 0)
  assert.equal(savePlan(store, plan).ok, true)
  assert.equal(clearPlans(store).ok, true)
  assert.deepEqual(loadSavedPlans(store).plans, [])
})
