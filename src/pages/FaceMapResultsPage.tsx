import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageShell } from '../components/PageShell.tsx'
import { ProductResultCard } from '../components/ProductResultCard.tsx'
import { goals } from '../qa/model.ts'
import { goalOrder } from '../rules/engine.ts'
import { loadCatalog } from '../rules/catalog.ts'
import { productDisplay } from '../products/display.ts'
import type { PresentedProduct } from '../rules/present.ts'
import { browserStore, buildSavedPlan, savePlan } from '../saved/storage.ts'

const regions: Record<string, string> = { forehead: '额头', eyes: '眼周', nose: '鼻部', cheeks: '两颊', chin: '下巴' }

export function FaceMapResultsPage() {
  const [params] = useSearchParams()
  const goal = params.get('goal') ?? ''
  const regionId = params.get('region') ?? ''
  const region = Object.hasOwn(regions, regionId) ? regions[regionId] : null
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState(false)
  if (!region || !Object.hasOwn(goalOrder, goal)) return <PageShell showBack><section className="card"><h1>先选择关注区域与问题</h1><Link className="text-link" to="/face-map">返回面部地图 →</Link></section></PageShell>
  const concern = goal as keyof typeof goalOrder
  const catalog = loadCatalog()
  const summary = `${region} · 关注「${goals[concern]}」。按关注点查看相关产品。`
  const products: PresentedProduct[] = goalOrder[concern].flatMap(id => {
    const product = catalog.products.find(p => p.id === id)
    if (!product) return []
    const reason = productDisplay(id)?.relation[concern] ?? `产品资料中的介绍与「${goals[concern]}」相关。`
    return [{ ...product, reason, shortReason: reason, storageReason: `按关注点「${goals[concern]}」保存的产品，尚未评估个人适用性。` }]
  })
  function save() {
    const store = browserStore()
    if (!store) { setMessage('保存失败，请稍后重试。'); return }
    const result = savePlan(store, buildSavedPlan(summary, products, catalog.dataVersion))
    setSaved(result.ok)
    setMessage(result.ok ? '方案已保存。' : result.message)
  }
  return <PageShell showBack>
    <Link className="text-link product-back" to="/face-map">← 重新选择区域与问题</Link>
    <header className="guide-heading"><p className="section-label">FACE MAP · 相关产品</p><h1>{region} · 你的关注点</h1><p>{goals[concern]}</p><p className="note">按关注问题匹配，尚未评估肤质、过敏及个人耐受。</p></header>
    <div className="map-result-grid">{products.map(product => <article className="result-card" key={product.id}><ProductResultCard id={product.id} name={product.displayName} spec={product.spec} rsp={product.rsp} brief={product.shortReason} /></article>)}</div>
    {products.length === 0 ? <p className="status-banner">暂未找到相关产品，可重新选择关注点。</p> : <div className="actions"><button className="primary-button" type="button" onClick={save} disabled={saved}>{saved ? '方案已保存' : '保存这些产品'}</button><Link className="secondary-button" to="/saved">我的护肤方案</Link></div>}
    {message ? <p className="note" role="status">{message}</p> : null}
  </PageShell>
}
