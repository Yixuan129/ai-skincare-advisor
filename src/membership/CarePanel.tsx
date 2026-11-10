import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { FollowPrefs, FollowTarget } from './store.ts'
import { browserStore } from '../saved/storage.ts'
import { writeCare } from './care-storage.ts'

type Entry = { date: string; value: 'not_started' | 'comfortable' | 'discomfort' }
type Care = { start: string; entries: Entry[]; remaining?: 'enough' | 'low' }
const labels = { not_started: '尚未开始使用', comfortable: '目前没有明显不适', discomfort: '出现不适，已暂停使用' }
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

function read(key: string): Care {
  try {
    const value = JSON.parse(browserStore()?.getItem(key) ?? 'null')
    return { remaining: value?.remaining === 'low' ? 'low' : value?.remaining === 'enough' ? 'enough' : undefined, start: typeof value?.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.start) && value.start <= today() ? value.start : '', entries: Array.isArray(value?.entries) ? value.entries.filter((e: Entry) => e && typeof e.date === 'string' && Object.hasOwn(labels, e.value)).slice(0, 30) : [] }
  } catch { return { start: '', entries: [] } }
}

export function CarePanel({ target, name, prefs }: { target: FollowTarget; name: string; prefs: FollowPrefs }) {
  const key = `baola.care.v1:${encodeURIComponent(target.planId)}:${encodeURIComponent(target.productId)}`
  const [care, setCare] = useState(() => read(key))
  const [start, setStart] = useState(care.start)
  const [feedback, setFeedback] = useState<Entry['value'] | ''>('')
  const [note, setNote] = useState('')
  const [clear, setClear] = useState(false)
  const days = care.start ? Math.max(0, Math.floor((Date.parse(today()) - Date.parse(care.start)) / 86400000)) + 1 : 0
  const paused = care.entries[0]?.value === 'discomfort'
  function save(next: Care, message: string) {
    try {
      const store = browserStore()
      if (!store) throw new Error('storage')
      writeCare(store, key, next)
      setCare(next); setNote(message); return true
    } catch { setNote('保存失败，请稍后重试。原记录已保留。'); return false }
  }
  return <section className="card care-panel">
    <p className="section-label">使用档案</p><h2>我的护理进度</h2><p><Link className="text-link" to={`/products/${target.productId}`}>{name} · 查看产品与用法 ↗</Link></p>
    <form onSubmit={e => { e.preventDefault(); if (start && !Number.isNaN(Date.parse(start)) && start <= today()) save({ ...care, start }, '开始日期已保存。'); else setNote('请选择今天或之前的有效日期。') }}>
      <label className="text-field">开始使用日期<input type="date" required max={today()} value={start} onChange={e => setStart(e.target.value)} onInput={e => setStart(e.currentTarget.value)} /></label>
      <div className="actions"><button className="secondary-button" type="submit">保存开始日期</button><button className="text-link" type="button" onClick={() => { const date = today(); if (save({ ...care, start: date }, "已记录今天开始使用。")) setStart(date) }}>今天开始</button></div>
    </form>
    <p className="status-banner">{paused ? '已记录不适，请先暂停使用' : care.start ? `已记录使用第 ${days} 天` : '尚未记录开始日期'}</p>
    {!paused && <div className="care-timeline">
      {prefs.day3 && <p><strong>第3天 · 使用感受</strong><br />{!care.start ? '记录开始日期后查看进度' : days >= 3 ? '已到回顾时间，可在下方记录使用感受。' : `还有 ${3 - days} 天`}</p>}
      {prefs.day14 && <p><strong>第14天 · 阶段回顾</strong><br />{!care.start ? '记录开始日期后查看进度' : days >= 14 ? '已到回顾时间，可记录目前感受；不据此判断疗效。' : `还有 ${14 - days} 天`}</p>}
      {prefs.season && <p><strong>换季 · 重新评估</strong><br />肤况变化时，可重新进行产品问答。<br /><Link className="text-link" to="/qa/select" state={{ fresh: true }}>重新评估需求</Link></p>}
      {prefs.low && <p><strong>余量 · 按需补货</strong><br />{care.remaining === 'low' ? '已记录余量不足，请结合实际需求决定是否补货。' : care.remaining === 'enough' ? '已记录余量充足，暂不需要补货。' : '请查看实际余量，按需记录。'}<br /><button className="text-link" type="button" onClick={() => save({ ...care, remaining: 'enough' }, '已记录余量充足。')}>余量充足</button><button className="text-link" type="button" onClick={() => save({ ...care, remaining: 'low' }, '已记录余量不足，不会自动下单。')}>余量不足</button></p>}
    </div>}
    <form onSubmit={e => { e.preventDefault(); if (!feedback) return; if (feedback !== 'not_started' && !care.start) { setNote('请先记录开始使用日期。'); return } if (save({ ...care, start: feedback === 'not_started' ? '' : care.start, entries: [{ date: new Date().toISOString(), value: feedback }, ...care.entries].slice(0, 30) }, '使用反馈已保存。')) { if (feedback === 'not_started') setStart(''); setFeedback('') } }}>
      <fieldset className="choice-set"><legend>记录使用感受</legend>{(Object.keys(labels) as Entry['value'][]).map(value => <label className={feedback === value ? 'choice selected' : 'choice'} key={value}><input type="radio" name="care-feedback" required checked={feedback === value} onChange={() => setFeedback(value)} /><span>{labels[value]}</span></label>)}</fieldset>
      <button type="submit" className="primary-button">保存使用反馈</button>
    </form>
    {paused && <p className="note">请勿自行加量或增加频率。若不适持续或加重，请咨询皮肤科医生。</p>}
    {note && <p role="status" className="notice">{note}</p>}
    {care.entries.length > 0 && <details className="fold"><summary>查看反馈记录（{care.entries.length}）</summary><ul className="care-history">{care.entries.map((entry, i) => <li key={i}>{new Date(entry.date).toLocaleString('zh-CN')} · {labels[entry.value]}</li>)}</ul></details>}
    {clear ? <div className="actions"><button type="button" className="secondary-button" onClick={() => { try { const store = browserStore(); if (!store) throw new Error(); store.removeItem(key); setCare({ start: '', entries: [] }); setStart(''); setNote('此产品使用记录已删除。'); setClear(false) } catch { setNote('删除失败，请稍后重试。') } }}>确认删除使用记录</button><button type="button" className="text-link" onClick={() => setClear(false)}>取消</button></div> : <button type="button" className="text-link" onClick={() => setClear(true)}>删除此产品使用记录</button>}
    <p className="note">仅保存在此设备。使用记录由你填写，不代表疗效评估。</p>
  </section>
}
