import { budgets, goals, knownBudget, type Answers } from '../qa/model.ts'
import { productDisplay } from '../products/display.ts'
import { findProduct, type Catalog } from './catalog.ts'
import { type EngineResult, type RuleReason } from './engine.ts'

export type PresentedProduct = {
  id: string
  displayName: string
  spec: string | null
  rsp: number | null
  rspLabel: string
  sourceFile: string
  page: number
  verification: string
  reason: string
  shortReason: string
  storageReason: string
}

export const currentConcernNote =
  '你提到当前存在或可能存在不适，以下供了解产品，不代表适合现在开始使用。'

export type PresentedResult = {
  status: EngineResult['status']
  summary: string
  products: PresentedProduct[]
  exclusions: string[]
  missing: string[]
  footnotes: string[]
  caution: string | null
}

export function needSummary(answers: Answers) {
  if (answers.task === 'usage') return '查看已点名产品的资料。'
  const goal =
    answers.primaryGoal && answers.primaryGoal !== 'uncertain'
      ? `想先处理「${goals[answers.primaryGoal]}」。`
      : '查看和这次需求相关的产品资料。'
  const budget = knownBudget(answers.purchaseBudget)
  const budgetText = budget ? `单件价格是「${budgets[budget].label}」。` : ''
  return `${goal}${budgetText}`
}

function shortMatchReason(answers: Answers, productId: string, displayName: string, reason: string) {
  if (reason.startsWith('你填写的名称对应')) return `你点名查看的是「${displayName}」。`
  if (answers.primaryGoal && answers.primaryGoal !== 'uncertain') {
    const linked = productDisplay(productId)?.relation[answers.primaryGoal]
    if (linked) return linked
    return `资料中的介绍与这次要处理的「${goals[answers.primaryGoal]}」相关。`
  }
  return `你查看的是「${displayName}」的产品资料。`
}

function storageReason(answers: Answers, displayName: string) {
  if (answers.task === 'usage') return `当时点名查看「${displayName}」。`
  if (answers.primaryGoal && answers.primaryGoal !== 'uncertain') {
    return `当时想先处理「${goals[answers.primaryGoal]}」，「${displayName}」出现在当时的列表里。`
  }
  return `当时保存的是「${displayName}」的产品资料。`
}

export function presentResult(answers: Answers, catalog: Catalog, result: EngineResult): PresentedResult {
  const products = result.candidateIds.flatMap((productId) => {
    const product = findProduct(catalog, productId)
    const reason = result.matchReasons.find((item) => item.productId === productId)
    if (!product || !reason) return []
    return [
      {
        id: product.id,
        displayName: product.displayName,
        spec: product.spec,
        rsp: product.rsp,
        rspLabel: product.rspLabel,
        sourceFile: product.sourceFile,
        page: product.page,
        verification: product.verification,
        reason: reason.text,
        shortReason: shortMatchReason(answers, product.id, product.displayName, reason.text),
        storageReason: storageReason(answers, product.displayName),
      },
    ]
  })
  return {
    status: result.status,
    summary: needSummary(answers),
    products,
    exclusions: result.exclusions.flatMap((item) => {
      const text = consumerExclusion(item)
      return text ? [text] : []
    }),
    missing: result.missing.map((item) => item.text),
    footnotes: result.limitUse
      ? []
      : result.notes.flatMap((note) => {
          const text = consumerNote(note)
          return text ? [text] : []
        }),
    caution: result.limitUse ? currentConcernNote : null,
  }
}

function consumerExclusion(item: RuleReason) {
  if (item.ruleId === 'R07' || item.ruleId === 'S8') return null
  if (item.ruleId === 'S5') return '填写的名称在现有产品资料里没有对应项。'
  if (item.ruleId === 'R06') {
    const name = quoted(item.text)
    const family = item.text.split('的经验')[0]
    return `你填写${family}曾经出现过不适，所以${name}这次没有展示。`
  }
  if (item.ruleId === 'R09') {
    if (item.text.includes('没有可比较')) return `${quoted(item.text)}没有可比较的资料参考价，所以没有展示。`
    const price = item.text.match(/资料 RSP (\d+) 高于本次上限 (\d+)/)
    if (!price) return `${quoted(item.text)}的资料参考价高于这次填写的预算上限，所以没有展示。`
    return `${quoted(item.text)}的资料参考价是 ${price[1]}，高于这次填写的上限 ${price[2]}，所以没有展示。`
  }
  if (item.ruleId === 'R10') {
    return `你填写要避开的名称，出现在${quoted(item.text)}已列出的主要成分里，所以没有展示。`
  }
  if (item.ruleId === 'R11') {
    return `你填写了已知会过敏的成分。现有资料只列出主要成分，不是完整成分表，无法确认${quoted(item.text)}，所以没有展示。`
  }
  return null
}

function consumerNote(note: string) {
  if (note.startsWith('手上的产品只作记录')) {
    return '手上已有的产品只作记录。现有资料不是完整成分表，不能判断能否一起使用。'
  }
  if (note.startsWith('只是不放心')) return '这次没有观察到具体不适，这里不判断这种担心正常或异常。'
  if (note.startsWith('还有未展示资料')) return '相关产品不止这些，这次先展示 3 个。'
  if (note.includes('点名的名称')) return '填写的名称在现有产品资料里没有对应项。'
  return null
}

function quoted(text: string) {
  const name = text.match(/「([^」]+)」/)?.[1]
  return name ? `「${name}」` : '这款产品'
}
