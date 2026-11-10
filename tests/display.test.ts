import assert from 'node:assert/strict'
import test from 'node:test'
import { createAnswers } from '../src/qa/model.ts'
import { allProductDisplays } from '../src/products/display.ts'
import { loadCatalog } from '../src/rules/catalog.ts'
import { evaluateRules } from '../src/rules/engine.ts'
import { presentResult } from '../src/rules/present.ts'

const ids = [
  'local-01',
  'local-02',
  'local-03',
  'local-04',
  'local-05',
  'local-06',
  'local-07',
  'local-08',
  'local-09',
  'local-10',
  'local-11',
]

test('11 款产品都有独立展示文案，且不出现内部说明和夸张说法', () => {
  const displays = allProductDisplays()
  assert.deepEqual(displays.map((item) => item.id), ids)
  const text = JSON.stringify(displays)
  for (const phrase of [
    '天花板',
    '美白针',
    '一夜回春',
    '确保安全',
    '确保产品安全',
    'NO.1',
    '获奖',
    '铂金',
    '100%',
    '受试者',
    '来源文件',
    '待核验',
    '不输出开始使用',
    '不能升级',
    '不引用',
  ]) {
    assert.equal(text.includes(phrase), false, phrase)
  }
  const sunscreen = displays.find((item) => item.id === 'local-06')
  assert.equal(JSON.stringify(sunscreen).includes('疏通毛孔'), false)
  const salicylic = displays.find((item) => item.id === 'local-01')
  assert.match(salicylic?.usage ?? '', /避开眼睑/)
  assert.match(displays.find((item) => item.id === 'local-08')?.intro ?? '', /维生素 C/)
  for (const item of displays) {
    assert.ok(item.intro)
    assert.ok(item.ingredients.length > 0)
    assert.ok(item.ingredients.every((ingredient) => ingredient.name && ingredient.text))
    assert.ok(item.efficacy && item.skin && item.audience && item.usage && item.brand)
  }
})

test('推荐页文案不再展示来源、核验和开发说明', () => {
  const catalog = loadCatalog()
  const answers = createAnswers('select')
  answers.currentDiscomfort = 'none'
  answers.skinType = 'combination_oily'
  answers.primaryGoal = 'dullness'
  answers.sensitivityHistory = 'occasional'
  answers.ingredientExperience = { bha: 'never', niacinamide: 'accepted', retinoid: 'never', vitaminC: 'accepted' }
  answers.ownedStatus = 'none'
  answers.purchaseBudget = 'unset'
  answers.texturePreference = 'none'
  answers.avoidStatus = 'no'
  answers.allergyStatus = 'no'
  const view = presentResult(answers, catalog, evaluateRules(answers, catalog))
  const visible = [
    view.summary,
    ...view.products.map((item) => item.shortReason),
    ...view.exclusions,
    ...view.footnotes,
    ...view.missing,
  ].join('\n')
  assert.equal(view.status, 'candidates')
  assert.equal(view.products.some((item) => item.id === 'local-08'), true)
  assert.match(view.products[0]?.shortReason ?? '', /暗沉/)
  for (const phrase of ['来源文件', '第 9 页', '尚未完成公开来源核验', '不输出开始使用', '不能升级', '美白针', '待核验']) {
    assert.equal(visible.includes(phrase), false, phrase)
  }
  assert.equal(view.exclusions.some((item) => item.includes('不升级')), false)
})


test('产品详情返回入口保留来源查询参数，并拒绝外部地址', async () => {
  const { productReturn } = await import('../src/products/navigation.ts')
  assert.deepEqual(productReturn({ returnTo: '/qa/select' }), { to: '/qa/select', label: '返回选品结果' })
  assert.equal(productReturn({ returnTo: '/face-map/results?region=nose&goal=congestion' }).to, '/face-map/results?region=nose&goal=congestion')
  assert.equal(productReturn({ returnTo: '/compare?left=local-09&right=local-10' }).label, '返回产品对比')
  for (const returnTo of ['https://example.com', '//example.com', '/qa/select#bad', '/unrelated', '/toString']) {
    assert.equal(productReturn({ returnTo }).to, '/products')
  }
})
