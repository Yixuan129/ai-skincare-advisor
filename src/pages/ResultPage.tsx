import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PageShell } from '../components/PageShell.tsx'
import { ProductResultCard } from '../components/ProductResultCard.tsx'
import { useQuiz } from '../qa/session.tsx'
import { loadCatalog } from '../rules/catalog.ts'
import { evaluateRules } from '../rules/engine.ts'
import { presentResult } from '../rules/present.ts'
import { browserStore, buildSavedPlan, savePlan } from '../saved/storage.ts'

const statusLabel = {
  candidates: '与你需求相关的产品',
  need_info: '需要补充信息',
  no_match: '没有对应的产品',
} as const

export function ResultPage() {
  const quiz = useQuiz()
  const navigate = useNavigate()
  const location = useLocation()
  const answers = quiz.session?.answers
  const [saveMessage, setSaveMessage] = useState('')
  if (!answers) return null
  const catalog = loadCatalog()
  const result = evaluateRules(answers, catalog)
  const view = presentResult(answers, catalog, result)

  const onSave = () => {
    const store = browserStore()
    if (!store) {
      setSaveMessage('浏览器没有保存成功。当前结果还在，可以稍后再试。')
      return
    }
    const outcome = savePlan(store, buildSavedPlan(view.summary, view.products, catalog.dataVersion))
    setSaveMessage(outcome.ok ? '已保存在当前浏览器。' : outcome.message)
  }

  return (
    <PageShell showBack>
      <section className="card status-card">
        <p className="section-label">结果</p>
        <h1>{statusLabel[view.status]}</h1>
        
        <h2>这次的需求</h2>
        <p>{view.summary}</p>
        {view.caution ? <p className="note">{view.caution}</p> : null}
        {view.status === 'need_info' ? (
          <>
            <p className="status-banner">还不能展示资料</p>
            <ul className="reason-list">
              {view.missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        ) : null}
        {view.status === 'no_match' ? (
          <>
            <p className="status-banner">没有对应的产品</p>
            <p className="note">现有资料里没有同时符合这次条件的产品。</p>
          </>
        ) : null}
        {view.status === 'candidates' ? (
          <>
            <div className="result-list">
              {view.products.map((product) => (
                <article key={product.id} className="result-card">
                  <ProductResultCard
                    id={product.id}
                    name={product.displayName}
                    spec={product.spec}
                    rsp={product.rsp}
                    brief={product.shortReason}
                  />
                </article>
              ))}
            </div>
            <p className="note save-note">仅保存在当前浏览器，可随时删除。</p>
            <div className="actions">
              <button type="button" className="primary-button" disabled={saveMessage === "已保存在当前浏览器。"} onClick={onSave}>
                {saveMessage === "已保存在当前浏览器。" ? "方案已保存" : "保存护肤方案"}
              </button>
            </div>
            {saveMessage ? <p className="note" role="status">{saveMessage} <Link className="text-link" to="/saved">查看方案</Link></p> : null}
            <p className="actions">
              <Link className="text-link" to="/membership" state={{ returnTo: location.pathname }}>
                了解会员服务
              </Link>
            </p>
          </>
        ) : null}
        {view.exclusions.length > 0 ? (
          <details className="fold">
            <summary>为什么有些产品没有出现</summary>
            <ul className="reason-list">
              {view.exclusions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        ) : null}
        {view.footnotes.length > 0 ? (
          <ul className="reason-list">
            {view.footnotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
        <div className="actions">
          <button type="button" className="secondary-button" onClick={quiz.backToReview}>
            修改回答
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              quiz.restart()
              navigate('/')
            }}
          >
            重新开始
          </button>
          <Link className="text-link" to="/">
            返回首页
          </Link>
        </div>
      </section>
    </PageShell>
  )
}
