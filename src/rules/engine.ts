import {
  asksForProduct,
  asksForSelection,
  budgets,
  experienceLevels,
  goals,
  knownBudget,
  knownTask,
  limitsCurrentUse,
  type Answers,
  type IngredientKey,
} from '../qa/model.ts'
import { findProduct, identifyProduct, normalizeText, type Catalog, type CatalogProduct } from './catalog.ts'

export type RuleStatus = 'candidates' | 'need_info' | 'no_match'

export type RuleReason = {
  productId: string | null
  ruleId: string
  text: string
  source: string
}

export type EngineResult = {
  status: RuleStatus
  candidateIds: string[]
  matchReasons: RuleReason[]
  exclusions: RuleReason[]
  missing: RuleReason[]
  ruleIds: string[]
  sources: { ruleId: string; location: string }[]
  notes: string[]
  ambiguousIds: string[]
  unshownIds: string[]
  dataVersion: string
  limitUse: boolean
}

const sourceOf: Record<string, string> = {
  R01: '问答与推荐规则草案_v2.md 第4节 R01',
  R02: '问答与推荐规则草案_v2.md 第4节 R02',
  R03: '问答与推荐规则草案_v2.md 第4节 R03',
  R04: '问答与推荐规则草案_v2.md 第4节 R04',
  R05: '问答与推荐规则草案_v2.md 第4节 R05',
  R06: '问答与推荐规则草案_v2.md 第4节 R06',
  R07: '问答与推荐规则草案_v2.md 第4节 R07',
  R08: '问答与推荐规则草案_v2.md 第4节 R08',
  R09: '问答与推荐规则草案_v2.md 第4节 R09',
  R10: '问答与推荐规则草案_v2.md 第4节 R10',
  R11: '问答与推荐规则草案_v2.md 第4节 R11',
  R12: '问答与推荐规则草案_v2.md 第4节 R12',
  R13: '问答与推荐规则草案_v2.md 第4节 R13',
  Q1: '问答与推荐规则草案_v2.md 第2节 Q1',
  Q4: '问答与推荐规则草案_v2.md 第2节 Q4',
  Q6: '问答与推荐规则草案_v2.md 第2节 Q6',
  S5: '问答与推荐规则草案_v2.md 第5节',
  S8: '问答与推荐规则草案_v2.md 第8节第4条',
}

export const goalOrder: Record<Exclude<Answers['primaryGoal'], null | 'uncertain'>, readonly string[]> = {
  congestion: ['local-01'],
  dryness: ['local-10', 'local-09'],
  dullness: ['local-08'],
  aging: ['local-04', 'local-07'],
  eyes: ['local-11'],
  sunscreen: ['local-06'],
}

const blockedUpgrades: Partial<Record<Exclude<Answers['primaryGoal'], null | 'uncertain'>, readonly string[]>> = {
  congestion: ['local-02'],
  aging: ['local-05'],
}

const families: Record<IngredientKey, readonly string[]> = {
  bha: ['local-01', 'local-02'],
  niacinamide: ['local-03'],
  retinoid: ['local-05', 'local-07'],
  vitaminC: ['local-08'],
}

const familyLabel: Record<IngredientKey, string> = {
  bha: '水杨酸',
  niacinamide: '烟酰胺',
  retinoid: 'A醇或A醛',
  vitaminC: '维生素C',
}

const upgradeIds = new Set(['local-02', 'local-05'])

function emptyResult(dataVersion: string): EngineResult {
  return {
    status: 'need_info',
    candidateIds: [],
    matchReasons: [],
    exclusions: [],
    missing: [],
    ruleIds: [],
    sources: [],
    notes: [],
    ambiguousIds: [],
    unshownIds: [],
    dataVersion,
    limitUse: false,
  }
}

function addRule(result: EngineResult, ruleId: string) {
  if (!result.ruleIds.includes(ruleId)) {
    result.ruleIds.push(ruleId)
    result.sources.push({ ruleId, location: sourceOf[ruleId] })
  }
}

function addReason(list: RuleReason[], productId: string | null, ruleId: string, text: string) {
  list.push({ productId, ruleId, text, source: sourceOf[ruleId] })
}

export function takeInFixedOrder(ids: readonly string[], limit = 3) {
  return { shown: ids.slice(0, limit), unshown: ids.slice(limit) }
}

function applyLimit(result: EngineResult, answers: Answers) {
  if (result.status !== 'candidates' && result.status !== 'no_match') return
  if (!limitsCurrentUse(answers)) return
  addRule(result, 'R01')
  result.limitUse = true
}

function collectMissing(answers: Answers): RuleReason[] {
  const missing: RuleReason[] = []
  const need = (ruleId: string, text: string) => addReason(missing, null, ruleId, text)
  if (asksForProduct(answers.task)) {
    if (!answers.productName.trim()) need('R04', '请填写要了解的产品名称。')
    if (!answers.productDetail.trim()) need('R04', '请填写浓度、规格或完整名称。不清楚可以填写“不清楚”。')
  }
  if (asksForSelection(answers.task)) {
    if (!answers.skinType) need('R05', '请选择肤质。')
    if (!answers.primaryGoal) need('R05', '请选择这次最想处理的一件事。')
  }
  if (!answers.sensitivityHistory) need('R05', '请选择过去是否容易敏感。')
  for (const key of Object.keys(familyLabel) as IngredientKey[]) {
    if (!answers.ingredientExperience[key]) need('R05', `请选择${familyLabel[key]}的使用经验。`)
  }
  if (asksForSelection(answers.task)) {
    if (!answers.ownedStatus) need('Q6', '请选择手上是否有相关产品。')
    if (answers.ownedStatus === 'named' && !answers.ownedName.trim()) need('Q6', '请填写手上产品的名称。')
    if (answers.ownedStatus === 'named' && !answers.ownedDetail.trim()) {
      need('Q6', '请补充手上产品的浓度、规格或完整名称。不清楚可以填写“不清楚”。')
    }
    if (!knownBudget(answers.purchaseBudget)) need('R05', '请选择单件产品的价格范围。')
    if (!answers.texturePreference) need('R05', '请选择质地偏好。')
  }
  if (!answers.avoidStatus) need('R05', '请回答是否有需要避开的成分。')
  if (!answers.allergyStatus) need('R05', '请回答是否有已知过敏的成分。')
  if (answers.avoidStatus === 'yes' && !answers.avoidIngredients.trim()) need('R05', '请填写要避开的成分。')
  if (answers.allergyStatus === 'yes' && !answers.knownAllergens.trim()) need('R05', '请填写已知过敏的成分。')
  return missing
}

function avoidHits(product: CatalogProduct, raw: string) {
  const tokens = raw
    .split(/[、，,；;/\s]+/)
    .map((item) => normalizeText(item))
    .filter((item) => item.length >= 1)
  const hits: { token: string; ingredient: string }[] = []
  for (const token of tokens) {
    for (const ingredient of product.ingredientNames) {
      const name = normalizeText(ingredient)
      if (!name) continue
      if (name.includes(token) || token.includes(name)) hits.push({ token, ingredient })
    }
  }
  return hits
}

function familyOf(productId: string) {
  return (Object.keys(families) as IngredientKey[]).find((key) => families[key].includes(productId)) ?? null
}

function budgetCap(answers: Answers) {
  if (!asksForSelection(answers.task)) return null
  const budget = knownBudget(answers.purchaseBudget)
  if (!budget) return null
  return budgets[budget].cap
}

function skinNote(product: CatalogProduct, answers: Answers) {
  if (product.id === 'local-10') {
    return '适用肤质原文是「混合型或干性肌肤，含敏感肌」。与本次肤质没有逐字对应时，只说明依据不足，不因此排除，也不改推其他产品。'
  }
  if (product.id === 'local-09') {
    return '这是待核验资料。页眉和价格旁名称不同，不因此排除；不凭「轻盈版」判断油性、干性或敏感。适用肤质原文是「多种肤质」。'
  }
  if (product.id === 'local-04') {
    return '适用人群原文含「35岁+」。这里只摘录来源，不作为年龄门槛。'
  }
  if (product.id === 'local-06') {
    return '不引用氧化锌后面的毛孔、角质、痘痘句子，也不把防晒指数写成已核验规格。'
  }
  if (product.id === 'local-08') {
    return '不写成与 A 醇或 A 醛的确定搭配，也不使用「美白针」。'
  }
  if (answers.texturePreference === 'light' || answers.texturePreference === 'rich') {
    return '质地偏好只记录为候选差异，不作为排除理由，也不凭名称里的轻盈或滋润推断质地。'
  }
  return ''
}

function matchText(product: CatalogProduct, answers: Answers, named: boolean) {
  const parts: string[] = []
  const limitUse = limitsCurrentUse(answers)
  if (named) {
    parts.push(`你填写的名称对应「${product.displayName}」。`)
    if (upgradeIds.has(product.id) && !limitUse) {
      parts.push('只在只问用法并且点名这个版本时查看这份资料。这不是升级，也不是开始使用建议。')
    }
  } else if (answers.primaryGoal && answers.primaryGoal !== 'uncertain') {
    parts.push(`你选择的主目标是「${goals[answers.primaryGoal]}」。目标表把「${product.displayName}」列为对应资料。`)
    if (answers.primaryGoal === 'congestion') parts.push('不加入 4% 水杨酸。')
    if (answers.primaryGoal === 'aging') parts.push('不加入 A 醛，也不追加烟酰胺。')
  }
  if (product.id === 'local-01' && product.audienceText) parts.push(`适用人群原文：${product.audienceText}。`)
  if (product.id === 'local-11' && product.audienceText) parts.push(`适用人群原文：${product.audienceText}。`)
  const family = familyOf(product.id)
  if (family) {
    const level = answers.ingredientExperience[family]
    if (level && level !== 'problem' && !limitUse) {
      parts.push(`你对${familyLabel[family]}的经验是「${experienceLevels[level]}」。可以查看这份待核验资料，不能换成开始使用建议，也不升级浓度。`)
    }
  }
  const budget = knownBudget(answers.purchaseBudget)
  if (asksForSelection(answers.task) && budget && product.rsp !== null) {
    const cap = budgets[budget].cap
    if (cap === null) {
      parts.push(`本次选择「${budgets[budget].label}」，不按价格排除。资料 RSP ${product.rsp}，不是当前售价。`)
    } else {
      parts.push(`资料 RSP ${product.rsp}，不超过本次上限 ${cap}。这是资料 RSP，不是当前售价。`)
    }
  }
  const note = skinNote(product, answers)
  if (note) parts.push(note)
  if (answers.avoidStatus === 'yes' && avoidHits(product, answers.avoidIngredients).length === 0) {
    parts.push('避开名称没有命中已列出的主要成分，不能据此认定不含该成分。')
  }
  if (!limitUse) parts.push('当前为待核验资料候选。')
  return parts.join('')
}

function boundaryNotes(answers: Answers) {
  const notes = limitsCurrentUse(answers) ? [] : ['不输出开始使用、频率、用量、搭配、套装或疗效建议。']
  if (answers.ownedStatus && answers.ownedStatus !== 'none') {
    notes.push('手上的产品只作记录。资料没有完整配方时，不判断能否同用。')
  }
  if (answers.observableSigns === 'just_worried') {
    notes.push('只是不放心，不判断这种担心正常或不正常。')
  }
  return notes
}

function decideListed(
  result: EngineResult,
  answers: Answers,
  catalog: Catalog,
  ids: readonly string[],
  named: boolean,
) {
  const kept: string[] = []
  for (const productId of ids) {
    const product = findProduct(catalog, productId)
    if (!product) continue
    if (!named && upgradeIds.has(productId)) {
      addRule(result, 'R07')
      addReason(result.exclusions, productId, 'R07', `目标匹配不加入「${product.displayName}」，也不因用过且能接受而升级。`)
      continue
    }
    const family = familyOf(productId)
    if (family && answers.ingredientExperience[family] === 'problem') {
      addRule(result, 'R06')
      addReason(
        result.exclusions,
        productId,
        'R06',
        `${familyLabel[family]}的经验是「用过但出过状况」，「${product.displayName}」不进入候选。`,
      )
      continue
    }
    const cap = budgetCap(answers)
    if (asksForSelection(answers.task) && cap !== null) {
      if (product.rsp === null || product.rsp > cap) {
        addRule(result, 'R09')
        addReason(
          result.exclusions,
          productId,
          'R09',
          product.rsp === null
            ? `「${product.displayName}」没有可比较的资料 RSP，不展示。`
            : `「${product.displayName}」的资料 RSP ${product.rsp} 高于本次上限 ${cap}。等于上限可以展示，高于上限不展示。`,
        )
        continue
      }
    }
    if (answers.avoidStatus === 'yes') {
      const hits = avoidHits(product, answers.avoidIngredients)
      if (hits.length > 0) {
        addRule(result, 'R10')
        addReason(
          result.exclusions,
          productId,
          'R10',
          `避开名称命中「${product.displayName}」已列出的主要成分「${hits[0].ingredient}」。`,
        )
        continue
      }
    }
    if (answers.allergyStatus === 'yes') {
      if (!product.hasFullFormula) {
        addRule(result, 'R11')
        addReason(
          result.exclusions,
          productId,
          'R11',
          `已填写已知过敏。「${product.displayName}」没有完整成分表，无法确认，不能通过筛选，也不表示安全。`,
        )
        continue
      }
    }
    kept.push(productId)
  }
  const limited = takeInFixedOrder(kept, 3)
  result.candidateIds = [...limited.shown]
  result.unshownIds = [...limited.unshown]
  for (const productId of result.candidateIds) {
    const product = findProduct(catalog, productId)
    if (!product) continue
    addRule(result, 'R08')
    if (!named) addRule(result, 'R12')
    if (named && upgradeIds.has(productId)) addRule(result, 'S8')
    addReason(result.matchReasons, productId, named ? 'R08' : 'R12', matchText(product, answers, named))
  }
  if (result.unshownIds.length > 0) {
    addRule(result, 'R12')
    result.notes.push('还有未展示资料。本次只保留目标表顺序中的前 3 个。')
  }
  result.notes.push(...boundaryNotes(answers))
  if (answers.ownedStatus && answers.ownedStatus !== 'none') addRule(result, 'R13')
  result.status = result.candidateIds.length > 0 ? 'candidates' : 'no_match'
  if (result.status === 'no_match') addRule(result, 'S5')
  applyLimit(result, answers)
}

export function evaluateRules(answers: Answers, catalog: Catalog): EngineResult {
  const result = emptyResult(catalog.dataVersion)
  if (!answers.currentDiscomfort || (answers.currentDiscomfort === 'unsure' && !answers.observableSigns)) {
    addRule(result, 'R01')
    addReason(result.missing, null, 'R01', '请先完成当前不适。说不准时，要先选择现在能够观察到的表现。')
    result.status = 'need_info'
    return result
  }
  if (!knownTask(answers.task)) {
    addRule(result, 'Q1')
    addReason(result.missing, null, 'Q1', '请选择这次要做的事。')
    result.status = 'need_info'
    return result
  }
  if (answers.observableSigns === 'just_worried') addRule(result, 'R02')
  if (answers.task === 'usage') addRule(result, 'R03')

  const missing = collectMissing(answers)
  if (missing.length > 0) {
    result.missing = missing
    for (const item of missing) addRule(result, item.ruleId)
    result.status = 'need_info'
    return result
  }

  const identity = asksForProduct(answers.task)
    ? identifyProduct(catalog, answers.productName, answers.productDetail)
    : null
  if (identity?.kind === 'ambiguous') {
    addRule(result, 'R04')
    result.ambiguousIds = identity.ids
    addReason(result.missing, null, 'R04', '填写的名称不能唯一对应一份资料。请写出浓度、规格或完整名称。不会从相近名称里猜测。')
    result.status = 'need_info'
    return result
  }

  if (answers.task === 'usage') {
    if (!identity || identity.kind === 'none') {
      addRule(result, 'S5')
      addReason(result.exclusions, null, 'S5', '资料里没有对应产品。不另找相近产品。')
      result.notes.push(...boundaryNotes(answers))
      result.status = 'no_match'
      applyLimit(result, answers)
      return result
    }
    decideListed(result, answers, catalog, identity.ids, true)
    return result
  }

  if (answers.primaryGoal === 'uncertain') {
    addRule(result, 'Q4')
    addReason(result.missing, null, 'Q4', '主目标选择了不确定。请先确定这次最想处理的一件事。')
    result.status = 'need_info'
    return result
  }

  if (identity?.kind === 'none') {
    addRule(result, 'S5')
    result.notes.push('点名的名称在资料里没有对应产品，不另找相近产品，也不把它追加进主目标候选。')
  }
  if (identity?.kind === 'unique' && upgradeIds.has(identity.ids[0])) {
    addRule(result, 'R07')
    addRule(result, 'S8')
    const product = findProduct(catalog, identity.ids[0])
    addReason(
      result.exclusions,
      identity.ids[0],
      'S8',
      `「${product?.displayName ?? identity.ids[0]}」只在只问用法并且点名该版本时查看。本次不加入候选，也不配成套装。`,
    )
  }

  const goal = answers.primaryGoal
  if (goal === null) return result
  for (const productId of blockedUpgrades[goal] ?? []) {
    const product = findProduct(catalog, productId)
    addRule(result, 'R07')
    addReason(result.exclusions, productId, 'R07', `目标匹配不加入「${product?.displayName ?? productId}」。`)
  }
  decideListed(result, answers, catalog, goalOrder[goal], false)
  return result
}
