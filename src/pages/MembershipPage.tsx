import { UiIcon } from '../components/UiIcon.tsx'
import { useState } from 'react'
import { CarePanel } from '../membership/CarePanel.tsx'
import { clearCareRecords } from '../membership/care-storage.ts'
import { Link, useLocation } from 'react-router-dom'
import { PageShell } from '../components/PageShell.tsx'
import {
  clearedFollow,
  clearMember,
  emptyPrefs,
  followNodes,
  isProductFollow,
  loadMember,
  prefsForSave,
  presentFollow,
  resolveFollowSelection,
  saveMember,
  type FollowId,
  type FollowPrefs,
  type FollowTarget,
  type MemberRecord,
} from '../membership/store.ts'
import { useQuiz } from '../qa/session.tsx'
import { loadCatalog } from '../rules/catalog.ts'
import { evaluateRules } from '../rules/engine.ts'
import { presentResult } from '../rules/present.ts'
import { browserStore, buildSavedPlan, loadSavedPlans, savePlan, type SavedPlan } from '../saved/storage.ts'

function readMember() {
  const store = browserStore()
  if (!store) {
    return {
      record: null as MemberRecord | null,
      prefs: emptyPrefs(),
      note: '浏览器存储暂时读不出来。没有沿用演示会员状态。',
    }
  }
  const loaded = loadMember(store)
  return { record: loaded.record, note: loaded.error ?? '' }
}

function readPlans() {
  const store = browserStore()
  if (!store) return { plans: [] as SavedPlan[], error: '浏览器存储暂时读不出来。' }
  const loaded = loadSavedPlans(store)
  return {
    plans: [...loaded.plans].sort((a, b) => b.savedAt.localeCompare(a.savedAt)),
    error: loaded.error,
  }
}

function activeTarget(planId: string | null, productId: string | null): FollowTarget | null {
  return planId && productId ? { planId, productId } : null
}

export function MembershipPage() {
  const quiz = useQuiz()
  const location = useLocation()
  const [initial] = useState(readMember)
  const [plansState, setPlansState] = useState(readPlans)
  const initialSelection = resolveFollowSelection(
    initial.record?.followPlanId ?? null,
    initial.record?.followProductId ?? null,
    plansState.plans,
  )
  const [record, setRecord] = useState<MemberRecord | null>(initial.record)
  const [planId, setPlanId] = useState<string | null>(initialSelection.planId)
  const [productId, setProductId] = useState<string | null>(initialSelection.productId)
  const [prefs, setPrefs] = useState<FollowPrefs>(
    () => presentFollow(initial.record, activeTarget(initialSelection.planId, initialSelection.productId))?.prefs ?? emptyPrefs(),
  )
  const [storageNote, setStorageNote] = useState(initial.note)
  const [planNote, setPlanNote] = useState('')
  const [savedNote, setSavedNote] = useState('')
  const [confirmingClear, setConfirmingClear] = useState(false)

  const returnTo = readReturnTo(location.state)
  const answers = quiz.session?.phase === 'result' ? quiz.session.answers : null
  const catalog = answers ? loadCatalog() : null
  const view = answers && catalog ? presentResult(answers, catalog, evaluateRules(answers, catalog)) : null
  const hasPlan = Boolean(view?.status === 'candidates' && view.products.length > 0)
  const taskPath = answers?.task === 'usage' ? '/qa/usage' : answers?.task === 'select' ? '/qa/select' : null
  const resultPath = answers ? returnTo ?? taskPath : null
  const plans = plansState.plans
  const selectedPlan = planId ? plans.find((plan) => plan.id === planId) ?? null : null
  const target = activeTarget(selectedPlan ? planId : null, productId)
  const follow = presentFollow(record, target)
  const joined = follow !== null
  const productReady = Boolean(target)
  const dirty = joined && followNodes.some((node) => prefs[node.id] !== follow.prefs[node.id])
  const missingSavedPlan = Boolean(record?.followPlanId && !plans.some((plan) => plan.id === record.followPlanId))

  const join = () => {
    const store = browserStore()
    if (!store) {
      setStorageNote('浏览器没有保存成功。演示会员没有开启，可以稍后再试。')
      return
    }
    const existing = loadMember(store).record
    const next: MemberRecord = {
      joined: true,
      prefs: existing?.prefs ?? emptyPrefs(),
      followPlanId: existing?.followPlanId ?? null,
      followProductId: existing?.followProductId ?? null,
      confirmedPlanId: existing?.confirmedPlanId ?? null,
      confirmedProductId: existing?.confirmedProductId ?? null,
    }
    const outcome = saveMember(store, next)
    if (!outcome.ok) {
      setStorageNote(`${outcome.message}演示会员没有开启。`)
      return
    }
    applyRecord(next)
    setConfirmingClear(false)
    setSavedNote('')
    setStorageNote('')
  }

  const exit = () => {
    if (!record) return
    const store = browserStore()
    if (!store) {
      setStorageNote('浏览器没有保存成功。演示会员状态还在。')
      return
    }
    const next: MemberRecord = { ...record, joined: false }
    const outcome = saveMember(store, next)
    if (!outcome.ok) {
      setStorageNote(outcome.message)
      return
    }
    setRecord(next)
    setPrefs(emptyPrefs())
    setConfirmingClear(false)
    setSavedNote('')
    setStorageNote('')
  }

  const confirmClear = () => {
    const store = browserStore()
    if (!store) {
      setStorageNote('没有清除成功。演示会员状态还在。')
      return
    }
    try { clearCareRecords(store) } catch { setStorageNote('清除使用记录失败，请稍后重试。会员状态已保留。'); return }
    const outcome = clearMember(store)
    if (!outcome.ok) {
      setStorageNote(outcome.message)
      return
    }
    setRecord(null)
    setPlanId(null)
    setProductId(null)
    setPrefs(emptyPrefs())
    setConfirmingClear(false)
    setSavedNote('')
    setStorageNote('')
  }

  const applyRecord = (next: MemberRecord) => {
    const selection = resolveFollowSelection(next.followPlanId, next.followProductId, plans)
    const shown = presentFollow(next, activeTarget(selection.planId, selection.productId))
    setRecord(next)
    setPlanId(selection.planId)
    setProductId(selection.productId)
    setPrefs(shown?.prefs ?? emptyPrefs())
  }

  const writeRecord = (next: MemberRecord) => {
    const store = browserStore()
    if (!store) {
      setSavedNote('')
      setStorageNote('浏览器没有保存成功。刚才的选择还在页面上，没有写入。')
      return false
    }
    const outcome = saveMember(store, next)
    if (!outcome.ok) {
      setSavedNote('')
      setStorageNote(`${outcome.message}刚才的选择还在页面上，没有写入。`)
      return false
    }
    setRecord(next)
    setStorageNote('')
    return true
  }

  const choosePlan = (id: string) => {
    if (!record?.joined || id === planId) return
    const next: MemberRecord = { ...record, followPlanId: id, followProductId: null }
    if (!writeRecord(next)) return
    setPlanId(id)
    setProductId(null)
    setPrefs(presentFollow(next, null)?.prefs ?? emptyPrefs())
    setSavedNote('')
  }

  const chooseProduct = (id: string) => {
    if (!record?.joined || !planId || id === productId) return
    const next: MemberRecord = { ...record, followPlanId: planId, followProductId: id }
    if (!writeRecord(next)) return
    setProductId(id)
    setPrefs(presentFollow(next, { planId, productId: id })?.prefs ?? emptyPrefs())
    setSavedNote('')
  }

  const persistPrefs = (nextPrefs: FollowPrefs, cleared = false) => {
    if (!record?.joined) return
    const saved = cleared ? clearedFollow(target) : prefsForSave(nextPrefs, target, record)
    const next: MemberRecord = {
      ...record,
      joined: true,
      ...saved,
      followPlanId: planId,
      followProductId: productId,
    }
    if (!writeRecord(next)) return
    const shown = presentFollow(next, target)
    setPrefs(shown?.prefs ?? nextPrefs)
    setSavedNote('跟进偏好已保存。')
  }

  const onSavePlan = () => {
    if (!hasPlan || !view || !catalog) return
    const store = browserStore()
    if (!store) {
      setPlanNote('浏览器没有保存成功。当前结果还在，可以稍后再试。')
      return
    }
    const outcome = savePlan(store, buildSavedPlan(view.summary, view.products, catalog.dataVersion))
    if (!outcome.ok) {
      setPlanNote(outcome.message)
      return
    }
    setPlanNote('已保存在当前浏览器。')
    setPlansState(readPlans())
  }

  const setSwitch = (id: FollowId, checked: boolean) => {
    if (!productReady && isProductFollow(id)) return
    setSavedNote('')
    setPrefs((current) => ({ ...current, [id]: checked }))
  }

  return (
    <PageShell showBack>
      <div className="member-page">
        <section className="card status-card member-status">
          <p className="section-label">CARE CLUB · 护肤服务</p>
          <h1>让后续护理，更有计划</h1>
          <p className="member-intro">管理护肤方案，记录每一次使用感受。</p>
          {joined ? <span className="member-badge">服务已开启</span> : null}
          <p className="note">无需手机号。方案与服务记录保存在当前设备，不跨设备同步。</p>
          {storageNote ? <p className="form-error">{storageNote}</p> : null}
          {joined ? (
            confirmingClear ? (
              <>
                <p className="note member-clear-note">将删除此设备的会员状态、跟进偏好和使用记录。已保存的护肤方案会保留。</p>
                <div className="actions">
                  <button type="button" className="secondary-button" onClick={confirmClear}>
                    确认清除
                  </button>
                  <button type="button" className="text-link" onClick={() => setConfirmingClear(false)}>
                    取消
                  </button>
                </div>
              </>
            ) : (
              <div className="actions">
                <button type="button" className="secondary-button" onClick={exit}>
                  关闭会员服务
                </button>
                <button type="button" className="text-link" onClick={() => setConfirmingClear(true)}>
                  清除会员记录
                </button>
              </div>
            )
          ) : (
            <div className="actions">
              <button type="button" className="primary-button" onClick={join}>
                开启会员服务
              </button>
              <Link className="secondary-button" to={resultPath ?? '/'}>
                暂不加入
              </Link>
            </div>
          )}
          {joined && !confirmingClear ? (
            <p className="note member-clear-note">关闭后保留偏好与使用记录，重新开启可恢复。选择“清除会员记录”可删除这些数据。</p>
          ) : null}
        </section>

        <section className="card">
          <div className="member-section-heading"><span className="member-step">01</span><div><h2>方案与跟进设置</h2><p className="note">选择产品，再设置你需要的跟进项目。</p></div></div>
          {hasPlan && !selectedPlan ? <div className="member-incoming"><p>本次产品结果还未关联到护理档案。</p><div className="actions"><button type="button" className="secondary-button" onClick={onSavePlan}>保存本次结果</button>{resultPath ? <Link className="text-link" to={resultPath}>查看产品结果</Link> : null}</div>{planNote ? <p role="status" className="note">{planNote}</p> : null}</div> : null}
          {joined ? (
            <>
              <div className="member-settings-grid"><div className="member-selection">
              <fieldset className="choice-set">
                <legend>护肤方案</legend>
                <p className="note">选择需要持续跟进的护肤方案。</p>
                {plansState.error ? <p className="form-error">{plansState.error}</p> : null}
                {missingSavedPlan ? <p className="note">上次选择的方案已经不在本机，请重新选择。</p> : null}
                {plans.length === 0 && !plansState.error ? (
                  <div className="member-empty"><p className="note">还没有已保存方案，先完成选品并保存结果。</p><Link className="secondary-button" to="/qa/select" state={{ fresh: true }}>创建护肤方案</Link></div>
                ) : null}
                {plans.map((plan) => (
                  <label key={plan.id} className={plan.id === planId ? 'choice selected' : 'choice'}>
                    <input
                      type="radio"
                      name="follow-plan"
                      checked={plan.id === planId}
                      onChange={() => choosePlan(plan.id)}
                    />
                    <span>
                      {plan.summary}
                      <span className="note">保存于 {new Date(plan.savedAt).toLocaleString("zh-CN", { hour12: false })}</span>
                      <span className="note">{plan.products.map((product) => product.displayName).join('、')}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              {selectedPlan ? (
                <fieldset className="choice-set">
                  <legend>跟进产品</legend>
                  <p className="note">请选择这一方案里要跟进的产品。</p>
                  {selectedPlan.products.map((product) => (
                    <label key={product.id} className={product.id === productId ? 'choice selected' : 'choice'}>
                      <input
                        type="radio"
                        name="follow-product"
                        checked={product.id === productId}
                        onChange={() => chooseProduct(product.id)}
                      />
                      <span>{product.displayName}</span>
                    </label>
                  ))}
                </fieldset>
              ) : null}
              </div><div className="member-preferences"><h3>跟进项目</h3>
              {productId ? <Link className="text-link" to={`/products/${productId}`}>查看当前产品与使用方法 ↗</Link> : null}
              <div className="pref-list">
                {followNodes.map((node) => {
                  const locked = !productReady && isProductFollow(node.id)
                  return (
                    <label key={node.id} className={locked ? 'pref-row is-locked' : 'pref-row'}>
                      <span>
                        <strong>{node.when}</strong>
                        <span className="note">{node.what}</span>
                      </span>
                      <span className="switch">
                        <input
                          type="checkbox"
                          checked={prefs[node.id]}
                          disabled={locked}
                          onChange={(event) => setSwitch(node.id, event.target.checked)}
                        />
                        <span className="switch-ui" />
                      </span>
                    </label>
                  )
                })}
              </div>
              {productReady ? null : <p className="note">请先选择跟进产品</p>}
              <p className="note">
                第3天和第14天从下方记录的开始日期计算；补货由你自行确认余量。
              </p>
              <p className="note">跟进内容在本页查看，不会向微信或手机推送。</p>
              {productReady && follow?.needsConfirm ? (
                <p className="note">这次的方案或产品已更换，使用和补货节点需要重新确认。</p>
              ) : null}
              {dirty ? <p className="note">这次修改还没有保存。</p> : null}
              {savedNote ? <p className="notice">{savedNote}</p> : null}
              {follow ? <p>{follow.summary}</p> : null}
              <div className="actions">
                <button type="button" className="primary-button" onClick={() => persistPrefs(prefs)}>
                  保存跟进偏好
                </button>
                <button type="button" className="secondary-button" onClick={() => persistPrefs(emptyPrefs(), true)}>
                  全部关闭
                </button>
              </div></div></div>
            </>
          ) : (
            <p className="note">开启会员服务后，可选择跟进产品、记录使用反馈和设置跟进项目。</p>
          )}
        </section>
        {joined && target ? <CarePanel key={`${target.planId}:${target.productId}`} target={target} name={selectedPlan?.products.find(p => p.id === productId)?.displayName ?? '当前产品'} prefs={follow?.prefs ?? emptyPrefs()} /> : null}
        <section className="card member-help">
          <div className="help-heading"><div><p className="section-label">SUPPORT · 使用帮助</p><h2 className="icon-heading"><UiIcon name="help" />需要一点帮助？</h2></div><Link className="secondary-button" to="/products"><UiIcon name="guide" />产品与使用指南<span aria-hidden="true">↗</span></Link></div>
          <p className="note">选择产品查看用法，或展开常见问题。</p>
          <div className="help-faq">
            <details name="member-help"><summary>如何查看产品使用方法？</summary><p>点击产品图片或名称即可进入详情页，查看主要成分、适用信息及品牌使用说明。</p><Link className="text-link" to="/products">浏览全部产品 →</Link></details>
            <details name="member-help"><summary>方案和记录能在其他设备查看吗？</summary><p>目前仅保存在此设备的浏览器中。清理浏览器数据会移除记录。</p><Link className="text-link" to="/saved">管理我的护肤方案 →</Link></details>
            <details name="member-help"><summary>使用后感觉不适怎么办？</summary><p>先暂停使用引起不适的产品，不要自行加量或增加频率。若不适持续或加重，请咨询皮肤科医生。可在护理进度中记录使用反馈。</p></details>
            <details name="member-help"><summary>会收到消息或自动购买吗？</summary><p>不会。跟进项目仅在页面显示，未连接消息推送、订单或支付服务。人工客服暂未接入。</p></details>
          </div>
        </section>
      </div>
    </PageShell>
  )
}

function readReturnTo(state: unknown) {
  if (!state || typeof state !== 'object' || !('returnTo' in state)) return null
  const value = state.returnTo
  return value === '/qa/select' || value === '/qa/usage' ? value : null
}
