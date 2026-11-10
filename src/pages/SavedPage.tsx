import { useState } from 'react'
import { Link } from 'react-router-dom'
import { briefSavedReason, ProductResultCard } from '../components/ProductResultCard.tsx'
import { PageShell } from '../components/PageShell.tsx'
import { loadCatalog } from '../rules/catalog.ts'
import {
  browserStore,
  clearPlans,
  deletePlan,
  loadSavedPlans,
  type SavedPlan,
} from '../saved/storage.ts'

export function SavedPage() {
  const store = browserStore()
  const [revision, setRevision] = useState(0)
  const [message, setMessage] = useState('')
  const [confirming, setConfirming] = useState(false)
  const loaded = store
    ? loadSavedPlans(store)
    : { plans: [], dropped: 0, error: '浏览器存储暂时读不出来。' }
  const catalog = loadCatalog()
  const plans = [...loaded.plans].sort((a, b) => b.savedAt.localeCompare(a.savedAt))

  const refresh = (text: string) => {
    setMessage(text)
    setRevision(revision + 1)
  }

  const remove = (id: string) => {
    if (!store) return
    const outcome = deletePlan(store, id)
    refresh(outcome.ok ? '已删除这条方案。' : outcome.message)
  }

  const clear = () => {
    if (!store) return
    const outcome = clearPlans(store)
    setConfirming(false)
    refresh(outcome.ok ? '已清空本机保存的方案。' : outcome.message)
  }

  return (
    <PageShell showBack>
      <section className="card status-card">
        <p className="section-label">本机</p>
        <h1>我的护肤方案</h1>
        <p className="note">
          查看已保存的产品与选择依据。记录仅保存在当前设备，请按最新肤况重新评估。
        </p>
        {loaded.error ? <p className="form-error">{loaded.error}</p> : null}
        {loaded.dropped > 0 ? (
          <p className="note">有 {loaded.dropped} 条记录无法识别，没有用当前产品文件补写。</p>
        ) : null}
        {message ? <p className="note">{message}</p> : null}
        {plans.length === 0 && !loaded.error ? <p>还没有保存在本机的方案。</p> : null}
        <div className="result-list">
          {plans.map((plan) => (
            <SavedPlanCard
              key={plan.id}
              plan={plan}
              currentVersion={catalog.dataVersion}
              knownIds={new Set(catalog.products.map((product) => product.id))}
              onDelete={remove}
            />
          ))}
        </div>
        <div className="actions">
          <Link className="primary-button" to="/qa/select" state={{ fresh: true }}>创建新方案</Link>
          <Link className="secondary-button" to="/membership">管理护理跟进</Link>
          {confirming ? (
            <>
              <p className="note">确认清空全部本机方案？此操作只删除这台浏览器里的记录。</p>
              <button type="button" className="primary-button" onClick={clear}>
                确认清空
              </button>
              <button type="button" className="secondary-button" onClick={() => setConfirming(false)}>
                取消
              </button>
            </>
          ) : (
            <button type="button" className="secondary-button" onClick={() => setConfirming(true)} disabled={!store}>
              清空全部方案
            </button>
          )}
          <Link className="text-link" to="/">
            返回首页
          </Link>
        </div>
      </section>
    </PageShell>
  )
}

function SavedPlanCard({
  plan,
  currentVersion,
  knownIds,
  onDelete,
}: {
  plan: SavedPlan
  currentVersion: string
  knownIds: Set<string>
  onDelete: (id: string) => void
}) {
  const versionChanged = plan.dataVersion !== currentVersion
  const savedTime = formatTime(plan.savedAt)
  return (
    <article className="result-card">
      <h2>{savedTime}</h2>
      <p>{plan.summary}</p>
      {versionChanged ? (
        <p className="form-error">
          保存时的产品资料版本与现在的文件不一致，或当时没有记下版本。下面仍是当时保存的名称、规格和价格，没有按新资料替换或重新推荐。
        </p>
      ) : null}
      {plan.products.map((product) => {
        return (
          <div key={product.id} className="saved-product-block">
            {knownIds.has(product.id) ? null : (
              <p className="form-error">当前产品文件里已经没有这份资料，没有用其他产品替换。</p>
            )}
            <ProductResultCard
              id={product.id}
              name={product.displayName}
              spec={product.spec}
              rsp={product.rsp}
              brief={briefSavedReason(product.reason)}
              specFallback="保存时未记录规格"
              priceFallback="保存时未记录价格"
            />
          </div>
        )
      })}
      <button type="button" className="secondary-button" onClick={() => onDelete(plan.id)}>
        删除这条
      </button>
    </article>
  )
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}
