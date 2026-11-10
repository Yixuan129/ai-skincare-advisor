import { UiIcon } from './UiIcon.tsx'
import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { productDisplay, type ProductDisplay } from '../products/display.ts'
import { productImageSrc } from '../products/images.ts'

const sections = [
  ['产品简介', 'intro'],
  ['核心功效与技术', 'efficacy'],
  ['适用肤质', 'skin'],
  ['适用人群', 'audience'],
  ['产品使用方法', 'usage'],
  ['品牌介绍与特点', 'brand'],
] as const

export function ProductResultCard({
  id,
  name,
  spec,
  rsp,
  brief,
  specFallback = '资料未写规格',
  priceFallback = '资料未写价格',
}: {
  id: string
  name: string
  spec: string | null
  rsp: number | null
  brief: string
  specFallback?: string
  priceFallback?: string
}) {
  const location = useLocation()
  const origin = { returnTo: location.pathname + location.search }
  const display = productDisplay(id)
  return (
    <div className="saved-product">
      <Link to={`/products/${id}`} state={origin} aria-label={`查看${name}的产品页面`}><ProductVisual productId={id} name={name} /></Link>
      <h3><Link to={`/products/${id}`} state={origin}>{name}</Link></h3>
      <p>规格：{spec ?? specFallback}</p>
      <p>资料参考价：{rsp ?? priceFallback}。不是当前售价。</p>
      {brief ? <p>{brief}</p> : null}
      <Link className="secondary-button entry-outline-button product-guide-link" to={`/products/${id}`} state={origin}><UiIcon name="guide" />产品详情与使用方法<span aria-hidden="true">↗</span></Link>
      <details className="fold">
        <summary>产品详情</summary>
        {display ? <ProductDetails display={display} /> : <p>当前资料里没有这款产品的详情，没有用其他产品补上。</p>}
      </details>
    </div>
  )
}

function ProductDetails({ display }: { display: ProductDisplay }) {
  return (
    <div className="detail-sections">
      <section>
        <h4>产品简介</h4>
        <p>{display.intro || '资料未单独写明。'}</p>
      </section>
      <section>
        <h4>主要成分及资料中描述的作用</h4>
        {display.ingredients.length > 0 ? (
          <ul className="ingredient-list">
            {display.ingredients.map((item) => (
              <li key={`${item.name}-${item.text}`}>
                {item.name ? <strong>{item.name}</strong> : null}
                {item.name ? '：' : null}
                {item.text || '资料未单独写明。'}
              </li>
            ))}
          </ul>
        ) : (
          <p>资料未单独写明。</p>
        )}
      </section>
      {sections.slice(1).map(([title, key]) => (
        <section key={title}>
          <h4>{title}</h4>
          <p>{display[key] || '资料未单独写明。'}</p>
        </section>
      ))}
    </div>
  )
}

export function ProductVisual({ productId, name }: { productId: string; name: string }) {
  const src = productImageSrc(productId)
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className="product-photo-frame" role="img" aria-label="暂无包装图">
        <p className="product-photo-fallback">暂无包装图</p>
      </div>
    )
  }
  return (
    <div className="product-photo-frame" data-product-id={productId}>
      <img className="product-photo" src={src} alt={`${name}的包装`} onError={() => setFailed(true)} />
    </div>
  )
}

export function briefSavedReason(reason: string) {
  return reason
    .replaceAll('这是待核验资料，不是使用建议。', '')
    .replaceAll('当前为待核验资料候选。', '')
    .replaceAll('被列入候选。', '出现在当时的列表里。')
    .replaceAll('不输出开始使用、频率、用量、搭配、套装或疗效建议。', '')
    .replaceAll('不能换成开始使用建议，也不升级浓度。', '')
    .trim()
}
