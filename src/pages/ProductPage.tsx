import { UiIcon } from '../components/UiIcon.tsx'
import { Link, useLocation, useParams } from 'react-router-dom'
import { PageShell } from '../components/PageShell.tsx'
import { ProductVisual } from '../components/ProductResultCard.tsx'
import { productDisplay } from '../products/display.ts'
import { productReturn } from '../products/navigation.ts'
import { useQuiz } from '../qa/session.tsx'
import { loadCatalog } from '../rules/catalog.ts'

export function ProductPage() {
  const { id } = useParams()
  const location = useLocation()
  const quiz = useQuiz()
  const origin = productReturn(location.state)
  const hasResult = quiz.session?.phase === 'result'
  const resultOrigin = origin.to === '/qa/select' || origin.to === '/qa/usage'
  const back = resultOrigin && !hasResult ? { to: '/qa/select', label: '重新开始选品' } : origin
  const product = loadCatalog().products.find(p => p.id === id)
  const display = product ? productDisplay(product.id) : null
  if (!product || !display) return <PageShell showBack><section className="card"><h1>暂未找到这款产品</h1><Link className="text-link" to="/products">返回产品指南</Link></section></PageShell>
  return <PageShell showBack>
    <div className="product-return-bar"><Link className="secondary-button" to={back.to}>← {back.label}</Link>{back.to !== "/products" ? <Link className="text-link" to="/products">全部产品</Link> : null}</div>
    <article className="product-page">
      <div className="product-detail-hero">
        <div className="product-detail-visual"><ProductVisual productId={product.id} name={product.displayName} /></div>
        <div className="product-detail-overview"><p className="section-label">PAULA’S CHOICE · 产品档案</p><h1>{product.displayName}</h1><p className="product-spec">{product.spec}</p><p>{display.intro}</p><p className="note">资料参考价：{product.rsp ?? '未提供'} · 实际售价以购买渠道为准</p><a className="primary-button" href="#product-usage">查看使用方法 ↓</a><Link className="text-link product-compare-entry" to={`/compare?left=${product.id}`} state={{ returnTo: back.to }}><UiIcon name="compare" />与其他产品对比</Link></div>
      </div>
      <nav className="product-section-nav" aria-label="产品详情导航"><a href="#product-usage">使用方法</a><a href="#product-ingredients">主要成分</a><a href="#product-fit">适用信息</a></nav>
      <section className="card usage-guide" id="product-usage"><div className="member-section-heading"><span className="member-step">01</span><div><p className="section-label">HOW TO USE</p><h2>产品使用方法</h2></div></div><p className="usage-copy">{display.usage || '暂未提供使用说明，请查看产品包装。'}</p><p className="usage-note">以上为品牌资料中的使用说明。请同时阅读实际包装；使用频率、用量及搭配应结合个人情况确认。出现不适时先暂停使用。</p></section>
      <section className="card" id="product-ingredients"><div className="member-section-heading"><span className="member-step">02</span><div><p className="section-label">KEY INGREDIENTS</p><h2>主要成分与特点</h2></div></div><div className="ingredient-grid">{display.ingredients.map((ingredient, i) => <div key={i}><h3>{ingredient.name}</h3><p>{ingredient.text}</p></div>)}</div><p className="note">此处展示主要成分，完整配方以实际产品包装为准。</p><details className="fold"><summary>核心功效与技术</summary><p>{display.efficacy}</p></details></section>
      <section className="card" id="product-fit"><div className="member-section-heading"><span className="member-step">03</span><div><p className="section-label">IS IT FOR ME</p><h2>适用信息</h2></div></div><dl className="product-fit"><div><dt>适用肤质</dt><dd>{display.skin}</dd></div><div><dt>适用人群</dt><dd>{display.audience}</dd></div></dl><details className="fold"><summary>品牌介绍</summary><p>{display.brand}</p></details></section>
      <div className="product-next"><div><h2>想了解哪些产品与你的需求相关？</h2><p className="note">回答几个问题，查看选择依据。</p></div><Link className="primary-button" to={resultOrigin && hasResult ? back.to : "/qa/select"} state={resultOrigin && hasResult ? undefined : { fresh: true }}>{resultOrigin && hasResult ? "返回本次选品结果 →" : "帮我选择产品 →"}</Link></div>
    </article>
  </PageShell>
}
