import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = JSON.parse(readFileSync(resolve(root, 'data/products.json'), 'utf8'))

function ingredientNames(items) {
  if (!Array.isArray(items)) return []
  return items.flatMap((item) => {
    const name = typeof item?.名称 === 'string' ? item.名称.trim() : ''
    return name ? [name] : []
  })
}

function pageNames(items) {
  if (!Array.isArray(items)) return []
  return items.flatMap((item) => {
    const text = typeof item?.文字 === 'string' ? item.文字 : ''
    return text.trim() ? [text] : []
  })
}

function audience(value) {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value
  return null
}

const products = source.产品.map((product) => ({
  id: product.产品ID,
  displayName: product.displayName,
  fullName: typeof product.完整名称 === 'string' ? product.完整名称 : null,
  pageNames: pageNames(product.页内名称原文),
  spec: typeof product.规格 === 'string' ? product.规格 : null,
  rsp: typeof product.资料参考价?.数值 === 'number' ? product.资料参考价.数值 : null,
  rspLabel: typeof product.资料参考价?.标注 === 'string' ? product.资料参考价.标注 : '',
  page: product.来源?.PDF页码,
  ingredientNames: ingredientNames(product.主要成分),
  audience: audience(product.适用信息?.适用人群),
  hasFullFormula: typeof product.完整成分表 === 'string' && product.完整成分表.trim().length > 0,
}))

const output = { products }
const text = `${JSON.stringify(output, null, 2)}\n`
const forbidden = [
  '来源文件',
  '提取状态',
  '共同待核验问题',
  '疑似错误原文',
  '待核验问题',
  'HERO SKU',
  '尚未完成公开来源核验',
  '.pdf',
  '资料原文',
]
for (const phrase of forbidden) {
  if (text.includes(phrase)) {
    throw new Error(`公开产品数据仍包含内部字段：${phrase}`)
  }
}
if (products.some((product) => typeof product.page !== 'number' || !product.id || !product.displayName)) {
  throw new Error('公开产品数据缺少匹配或保存所需的编号、名称或页码')
}

writeFileSync(resolve(root, 'data/products.public.json'), text)
console.log(`wrote ${products.length} public products`)
