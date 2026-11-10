import { Link, useSearchParams } from 'react-router-dom'
import { PageShell } from '../components/PageShell.tsx'
import { ProductVisual } from '../components/ProductResultCard.tsx'
import { loadCatalog } from '../rules/catalog.ts'
import { productDisplay } from '../products/display.ts'

export function ComparePage() {
  const [params, setParams] = useSearchParams()
  const products = loadCatalog().products
  const left = products.find(p => p.id === params.get('left'))
  const right = products.find(p => p.id === params.get('right'))
  const duplicate = Boolean(left && right && left.id === right.id)
  const selected = [left, right]
  const details = selected.map(p => p ? productDisplay(p.id) : null)
  function choose(side: 'left' | 'right', id: string) {
    const next = new URLSearchParams(params)
    if (id) next.set(side, id); else next.delete(side)
    setParams(next, { replace: true })
  }
  const rows = [
    { title: '规格', values: selected.map(p => p?.spec) },
    { title: '资料参考价', values: selected.map(p => p?.rsp == null ? null : String(p.rsp)) },
    { title: '产品简介', values: details.map(p => p?.intro.replace(/页眉写的是[^。]*。/g, '')) },
    { title: '主要成分', values: details.map(p => p?.ingredients.map(i => i.name).join('、')) },
    { title: '核心功效与特点', values: details.map(p => p?.efficacy) },
    { title: '适用肤质', values: details.map(p => p?.skin) },
    { title: '适用人群', values: details.map(p => p?.audience) },
    { title: '使用方法', values: details.map(p => p?.usage) },
  ]
  return <PageShell showBack>
    <Link className="text-link product-back" to="/products">← 返回产品指南</Link>
    <header className="guide-heading"><p className="section-label">SIDE BY SIDE · 产品对比</p><h1>看清区别，再做选择</h1><p className="note">并排查看两款产品的信息，找到你关心的差异。</p></header>
    <section className="card compare-picker" aria-label="选择对比产品">
      {(['left', 'right'] as const).map((side, index) => <label className="text-field" key={side}>{index === 0 ? '第一款产品' : '第二款产品'}<select value={selected[index]?.id ?? ''} onChange={e => choose(side, e.target.value)}><option value="">请选择一款产品</option>{products.map(p => <option key={p.id} value={p.id} disabled={p.id === selected[1 - index]?.id}>{p.displayName}</option>)}</select></label>)}
      <button className="secondary-button" type="button" disabled={!left || !right || duplicate} onClick={() => setParams({ left: right!.id, right: left!.id }, { replace: true })}>交换位置 ⇄</button>
    </section>
    {duplicate ? <p className="form-error" role="alert">请选择两款不同的产品。</p> : left && right ? <>
      <table className="compare-table"><caption>两款产品资料对比</caption><thead><tr><th scope="col" className="compare-row-label">对比项目</th>{selected.map(p => <th scope="col" key={p!.id}><Link to={`/products/${p!.id}`} state={{ returnTo: "/compare?" + params.toString() }}><ProductVisual productId={p!.id} name={p!.displayName} /><span>{p!.displayName}</span></Link><Link className="text-link" to={`/products/${p!.id}`} state={{ returnTo: "/compare?" + params.toString() }}>详情与用法 ↗</Link></th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.title}><th scope="row">{row.title}</th>{row.values.map((value, index) => <td key={index}>{value?.trim() || '资料未提供'}</td>)}</tr>)}</tbody></table>
      <p className="note compare-note">参考价并非当前售价，主要成分不等于完整配方。产品信息不代表个人适用结论。</p>
    </> : <section className="card compare-empty"><span aria-hidden="true">↔</span><h2>选择两款，开始比较</h2><p className="note">例如：轻盈版与滋润版面霜。也可以回到产品指南勾选。</p></section>}
  </PageShell>
}
