import { UiIcon } from '../components/UiIcon.tsx'
import { Link, useSearchParams } from 'react-router-dom'
import { PageShell } from '../components/PageShell.tsx'
import { ProductVisual } from '../components/ProductResultCard.tsx'
import { loadCatalog } from '../rules/catalog.ts'

export function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const products = loadCatalog().products
  const ids = [...new Set((params.get('compare') ?? '').split(','))].filter(id => products.some(p => p.id === id)).slice(0, 2)
  function toggle(id: string) {
    const next = ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id].slice(0, 2)
    const query = new URLSearchParams(params)
    if (next.length) query.set('compare', next.join(',')); else query.delete('compare')
    setParams(query, { replace: true })
  }
  return <PageShell showBack>
    <header className="guide-heading"><p className="section-label">PRODUCT GUIDE · 产品指南</p><h1>了解产品，也了解怎么用</h1><p className="note">选择产品查看详情，或勾选两款并排比较。</p><Link className="secondary-button entry-outline-button" to="/compare"><UiIcon name="compare" />打开产品对比<span aria-hidden="true">↗</span></Link></header>
    <div className="product-library">{products.map(product => <article className={ids.includes(product.id) ? 'library-card is-comparing' : 'library-card'} key={product.id}>
      <label className="compare-check"><input type="checkbox" aria-label={`对比${product.displayName}`} checked={ids.includes(product.id)} disabled={ids.length === 2 && !ids.includes(product.id)} onChange={() => toggle(product.id)} /><span>{ids.includes(product.id) ? '已选对比' : '加入对比'}</span></label>
      <Link className="library-product-link" to={`/products/${product.id}`} state={{ returnTo: "/products" + (params.size ? "?" + params.toString() : "") }}><ProductVisual productId={product.id} name={product.displayName} /><p className="section-label">{product.spec ?? '产品资料'}</p><h2>{product.displayName}</h2><span className="library-cta">查看产品与用法 <span aria-hidden="true">↗</span></span></Link>
    </article>)}</div>
    {ids.length > 0 ? <aside className="compare-tray" aria-label="产品对比栏"><div><strong>已选 {ids.length} / 2 款</strong><p className="note">{ids.map(id => products.find(p => p.id === id)!.displayName).join(' · ')}</p>{ids.length === 2 ? <small>取消勾选后可更换产品。</small> : null}</div><div className="actions"><button type="button" className="text-link" onClick={() => { const next = new URLSearchParams(params); next.delete('compare'); setParams(next, { replace: true }) }}>清空</button>{ids.length === 2 ? <Link className="primary-button" to={`/compare?left=${ids[0]}&right=${ids[1]}`}>开始对比 →</Link> : <button type="button" className="primary-button" disabled>再选一款</button>}</div></aside> : null}
  </PageShell>
}
