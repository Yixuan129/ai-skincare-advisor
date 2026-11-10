import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applicableSteps,
  asksForProduct,
  asksForSelection,
  budgetLabel,
  budgets,
  createAnswers,
  pruneAnswers,
  progressTotal,
  summaryRows,
  validateStep,
  type Answers,
} from '../src/qa/model.ts'
import { loadCatalog } from '../src/rules/catalog.ts'
import { evaluateRules, takeInFixedOrder } from '../src/rules/engine.ts'
import { currentConcernNote, presentResult } from '../src/rules/present.ts'

const catalog = loadCatalog()

function fill(task: Answers['task'], patch: Partial<Answers>): Answers {
  const base = createAnswers(task)
  return {
    ...base,
    currentDiscomfort: 'none',
    sensitivityHistory: 'occasional',
    ingredientExperience: {
      bha: 'never',
      niacinamide: 'accepted',
      retinoid: 'never',
      vitaminC: 'uncertain',
    },
    avoidStatus: 'no',
    allergyStatus: 'no',
    ...patch,
    ingredientExperience: {
      bha: 'never',
      niacinamide: 'accepted',
      retinoid: 'never',
      vitaminC: 'uncertain',
      ...patch.ingredientExperience,
    },
  }
}

function selection(patch: Partial<Answers> = {}): Answers {
  return fill('select', {
    skinType: 'combination_oily',
    primaryGoal: 'congestion',
    ownedStatus: 'named',
    ownedName: '模拟保湿乳',
    ownedDetail: '不清楚',
    purchaseBudget: 'cap350',
    texturePreference: 'none',
    ...patch,
  })
}

test('正常匹配只展示 local-01，不升级到 4%', () => {
  const result = evaluateRules(selection(), catalog)
  assert.equal(result.status, 'candidates')
  assert.deepEqual(result.candidateIds, ['local-01'])
  assert.equal(result.exclusions.some((item) => item.productId === 'local-02' && item.ruleId === 'R07'), true)
  assert.equal(result.candidateIds.includes('local-03'), false)
  const text = JSON.stringify(result)
  assert.match(text, /330/)
  assert.match(text, /350/)
  assert.equal(text.includes('化妆棉'), false)
  assert.equal(text.includes('每周'), false)
  assert.equal(text.includes('疏通毛孔'), false)
})

test('单件价格按上限筛选，并区分四个答案', () => {
  assert.deepEqual(
    Object.values(budgets).map((item) => item.label),
    ['350元及以下', '351–650元', '650元以上', '暂不设预算'],
  )
  assert.equal(Object.hasOwn(budgets, 'cap200'), false)
  const row = summaryRows(selection({ purchaseBudget: 'cap650' })).find((item) => item.stepId === 'budget')
  assert.equal(row?.label, '单件价格')
  assert.equal(row?.value, '351–650元')

  const at350 = evaluateRules(selection({ purchaseBudget: 'cap350' }), catalog)
  const underInSecondTier = evaluateRules(selection({ purchaseBudget: 'cap650' }), catalog)
  assert.equal(catalog.products.find((product) => product.id === 'local-01')?.rsp, 330)
  assert.deepEqual(at350.candidateIds, ['local-01'])
  assert.deepEqual(underInSecondTier.candidateIds, ['local-01'])

  const sunscreen = catalog.products.find((product) => product.id === 'local-06')
  assert.equal(sunscreen?.rsp, 355)
  const over350 = evaluateRules(selection({ primaryGoal: 'sunscreen', purchaseBudget: 'cap350' }), catalog)
  const within650 = evaluateRules(selection({ primaryGoal: 'sunscreen', purchaseBudget: 'cap650' }), catalog)
  assert.equal(over350.status, 'no_match')
  assert.equal(
    over350.exclusions.some((item) => item.productId === 'local-06' && item.ruleId === 'R09' && item.text.includes('355') && item.text.includes('350')),
    true,
  )
  assert.deepEqual(within650.candidateIds, ['local-06'])

  const equal650 = catalog.products.find((product) => product.id === 'local-07')
  const over650 = catalog.products.find((product) => product.id === 'local-04')
  assert.equal(equal650?.rsp, 650)
  assert.equal(over650?.rsp, 760)
  const aging = { primaryGoal: 'aging' as const, skinType: 'dry' as const }
  const capped650 = evaluateRules(selection({ ...aging, purchaseBudget: 'cap650' }), catalog)
  assert.deepEqual(capped650.candidateIds, ['local-07'])
  assert.equal(capped650.exclusions.some((item) => item.productId === 'local-04' && item.ruleId === 'R09'), true)

  const above = evaluateRules(selection({ ...aging, purchaseBudget: 'above650' }), catalog)
  const unset = evaluateRules(selection({ ...aging, purchaseBudget: 'unset' }), catalog)
  assert.deepEqual(above.candidateIds, ['local-04', 'local-07'])
  assert.deepEqual(unset.candidateIds, above.candidateIds)
  const aboveView = presentResult(selection({ ...aging, purchaseBudget: 'above650' }), catalog, above)
  const unsetView = presentResult(selection({ ...aging, purchaseBudget: 'unset' }), catalog, unset)
  assert.match(aboveView.summary, /单件价格是「650元以上」/)
  assert.match(unsetView.summary, /单件价格是「暂不设预算」/)
  assert.notEqual(aboveView.summary, unsetView.summary)
  assert.match(JSON.stringify(above), /650元以上/)
  assert.match(JSON.stringify(unset), /暂不设预算/)
})

test('已删除的预算档不会被改写成新选项', () => {
  const legacy = selection()
  legacy.purchaseBudget = 'cap200' as Answers['purchaseBudget']
  assert.equal(budgetLabel(legacy.purchaseBudget), '')
  assert.equal(validateStep('budget', legacy), '请选择单件产品的价格范围。')
  const pruned = pruneAnswers(legacy)
  assert.equal(pruned.purchaseBudget, null)
  const result = evaluateRules(legacy, catalog)
  assert.equal(result.status, 'need_info')
  assert.deepEqual(result.candidateIds, [])
  assert.equal(result.missing.some((item) => item.text === '请选择单件产品的价格范围。'), true)
})

test('已知过敏且没有完整配方时不能通过筛选', () => {
  const result = evaluateRules(
    selection({ allergyStatus: 'yes', knownAllergens: '模拟香料' }),
    catalog,
  )
  assert.equal(result.status, 'no_match')
  assert.deepEqual(result.candidateIds, [])
  assert.equal(result.exclusions.some((item) => item.productId === 'local-01' && item.ruleId === 'R11'), true)
  assert.equal(JSON.stringify(result).includes('不含'), false)
})

test('水杨酸名称不能区分 2% 和 4% 时要求明确选择', () => {
  const result = evaluateRules(
    fill('usage', {
      productName: '宝拉水杨酸能不能天天用',
      productDetail: '不清楚',
    }),
    catalog,
  )
  assert.equal(result.status, 'need_info')
  assert.deepEqual(result.candidateIds, [])
  assert.deepEqual(result.ambiguousIds, ['local-01', 'local-02'])
  assert.equal(result.ruleIds.includes('R04'), true)
})

test('明确不适未答完时继续要求后续问题，不暂停', () => {
  const answers = createAnswers('select')
  answers.currentDiscomfort = 'explicit'
  const result = evaluateRules(answers, catalog)
  assert.equal(result.status, 'need_info')
  assert.equal(result.limitUse, false)
  assert.deepEqual(result.candidateIds, [])
  assert.ok(result.missing.length > 0)
  assert.equal(applicableSteps(answers).includes('goal'), true)
  assert.equal(progressTotal(answers), applicableSteps(answers).length)
})

test('明确不适和仍无法确认时展示同一批资料，但不标为适合现在使用', () => {
  const calm = evaluateRules(selection(), catalog)
  const explicit = evaluateRules(selection({ currentDiscomfort: 'explicit', discomfortAfter: '模拟记录' }), catalog)
  const unclear = evaluateRules(
    selection({ currentDiscomfort: 'unsure', observableSigns: 'still_unclear' }),
    catalog,
  )
  const worried = evaluateRules(
    selection({ currentDiscomfort: 'unsure', observableSigns: 'just_worried' }),
    catalog,
  )
  assert.equal(calm.limitUse, false)
  assert.equal(worried.limitUse, false)
  assert.equal(explicit.limitUse, true)
  assert.equal(unclear.limitUse, true)
  assert.deepEqual(explicit.candidateIds, calm.candidateIds)
  assert.deepEqual(unclear.candidateIds, calm.candidateIds)
  assert.deepEqual(worried.candidateIds, calm.candidateIds)
  const explicitView = presentResult(selection({ currentDiscomfort: 'explicit' }), catalog, explicit)
  const calmView = presentResult(selection(), catalog, calm)
  assert.equal(explicitView.caution, currentConcernNote)
  assert.deepEqual(explicitView.footnotes, [])
  assert.equal(calmView.caution, null)
  assert.equal(explicitView.products.map((item) => item.shortReason).join('').includes('适合现在开始使用'), false)
  assert.equal(JSON.stringify(explicit).includes('开始使用'), false)
  assert.equal(JSON.stringify(explicit).includes('升级'), false)
  const kept = pruneAnswers(selection({ currentDiscomfort: 'none' }))
  const revised = pruneAnswers({ ...kept, currentDiscomfort: 'explicit' })
  assert.equal(revised.primaryGoal, 'congestion')
  assert.equal(revised.purchaseBudget, 'cap350')
  const revisedResult = evaluateRules(revised, catalog)
  assert.deepEqual(revisedResult.candidateIds, calm.candidateIds)
  assert.equal(revisedResult.limitUse, true)
})

test('当前不适时预算和已知过敏筛选仍然生效', () => {
  const overBudget = evaluateRules(
    selection({ currentDiscomfort: 'explicit', primaryGoal: 'sunscreen', purchaseBudget: 'cap350' }),
    catalog,
  )
  assert.equal(overBudget.status, 'no_match')
  assert.equal(overBudget.limitUse, true)
  assert.equal(overBudget.exclusions.some((item) => item.ruleId === 'R09'), true)
  const allergic = evaluateRules(
    selection({
      currentDiscomfort: 'unsure',
      observableSigns: 'sting',
      allergyStatus: 'yes',
      knownAllergens: '模拟香料',
    }),
    catalog,
  )
  assert.equal(allergic.status, 'no_match')
  assert.equal(allergic.limitUse, true)
  assert.equal(allergic.exclusions.some((item) => item.ruleId === 'R11'), true)
})

test('只问用法不因肤质、目标、预算和质地未答而信息不足', () => {
  const result = evaluateRules(
    fill('usage', {
      productName: '眼霜',
      productDetail: '不清楚',
    }),
    catalog,
  )
  assert.equal(result.status, 'candidates')
  assert.deepEqual(result.candidateIds, ['local-11'])
  assert.equal(result.ruleIds.includes('R03'), true)
  assert.equal(result.ruleIds.includes('R09'), false)
  assert.equal(result.missing.some((item) => /肤质|预算|质地|主目标/.test(item.text)), false)
})

test('干燥目标按目标表顺序展示，不按编号字母序', () => {
  const result = evaluateRules(
    selection({
      primaryGoal: 'dryness',
      skinType: 'dry',
      purchaseBudget: 'cap650',
    }),
    catalog,
  )
  assert.deepEqual(result.candidateIds, ['local-10', 'local-09'])
})

test('同输入和同数据版本返回相同结果', () => {
  const input = selection()
  const first = evaluateRules(input, catalog)
  const second = evaluateRules(structuredClone(input), catalog)
  assert.deepEqual(first, second)
  assert.equal(first.dataVersion, second.dataVersion)
  input.primaryGoal = 'eyes'
  assert.deepEqual(evaluateRules(selection(), catalog), first)
  assert.deepEqual(takeInFixedOrder(['local-10', 'local-09', 'local-11', 'local-01']), {
    shown: ['local-10', 'local-09', 'local-11'],
    unshown: ['local-01'],
  })
})

test('两条任务的步骤、切换和进度各自计算', () => {
  const selectSteps = ['discomfort', 'skin', 'goal', 'history', 'owned', 'budget', 'limits']
  const usageSteps = ['discomfort', 'product', 'history', 'limits']
  const usage = fill('usage', { productName: '宝拉珍选水杨酸精华露', productDetail: '118ml' })
  assert.deepEqual(applicableSteps(selection()), selectSteps)
  assert.deepEqual(applicableSteps(usage), usageSteps)
  assert.equal(progressTotal(selection()), selectSteps.length)
  assert.equal(progressTotal(usage), usageSteps.length)
  assert.equal(asksForSelection('select') && asksForProduct('usage'), true)
  assert.equal(asksForProduct('select') || asksForSelection('usage'), false)

  const toUsage = pruneAnswers({ ...selection(), task: 'usage' })
  assert.equal(toUsage.skinType, null)
  assert.equal(toUsage.primaryGoal, null)
  assert.equal(toUsage.purchaseBudget, null)
  assert.equal(toUsage.texturePreference, null)
  assert.deepEqual(applicableSteps(toUsage), usageSteps)
  assert.equal(progressTotal(toUsage), usageSteps.length)

  const toSelect = pruneAnswers({ ...usage, task: 'select' })
  assert.equal(toSelect.productName, '')
  assert.equal(toSelect.productDetail, '')
  assert.deepEqual(applicableSteps(toSelect), selectSteps)
  assert.equal(progressTotal(toSelect), selectSteps.length)
})

test('旧的两件都要回到未选择的任务，不进入混合路径', () => {
  const legacy = selection()
  legacy.task = 'both' as Answers['task']
  const pruned = pruneAnswers(legacy)
  assert.equal(pruned.task, null)
  assert.equal(pruned.primaryGoal, null)
  assert.equal(pruned.productName, '')
  assert.deepEqual(applicableSteps(pruned), ['discomfort'])
  assert.equal(progressTotal(pruned), 1)
  assert.equal(validateStep('discomfort', pruned), '请选择这次要做的事。')
  assert.equal(asksForProduct(pruned.task) || asksForSelection(pruned.task), false)

  const result = evaluateRules(pruned, catalog)
  assert.equal(result.status, 'need_info')
  assert.deepEqual(result.candidateIds, [])
  assert.deepEqual(result.missing.map((item) => item.text), ['请选择这次要做的事。'])
})
