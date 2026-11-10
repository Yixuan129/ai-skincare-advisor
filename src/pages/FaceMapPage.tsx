import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageShell } from '../components/PageShell.tsx'
import { goals, type Goal } from '../qa/model.ts'

const regions = [
  { id: 'forehead', name: '额头', x: 50, y: 29 },
  { id: 'eyes', name: '眼周', x: 66, y: 47 },
  { id: 'nose', name: '鼻部', x: 50, y: 56 },
  { id: 'cheeks', name: '两颊', x: 28, y: 55 },
  { id: 'chin', name: '下巴', x: 50, y: 74 },
] as const

export function FaceMapPage() {
  const [region, setRegion] = useState<(typeof regions)[number] | null>(null)
  const navigate = useNavigate()
  function select(next: (typeof regions)[number]) { setRegion(next) }
  return <PageShell showBack>
    <header className="guide-heading"><p className="section-label">FACE MAP · 面部护理地图</p><h1>从一个关注区域开始</h1><p className="note">点选面部区域，告诉我们你想改善什么。</p></header>
    <section className="face-map-layout">
      <div className="face-map-art">
        <span className="face-art-label">点选你的关注区</span>
        <div className="face-map-canvas">
          <img className="face-map-portrait" src="/face-map-woman.png" alt="女性正面面部示意图" />
          {regions.map(item => <button key={item.id} type="button" style={{ left: `${item.x}%`, top: `${item.y}%` }} className={region?.id === item.id ? 'face-hotspot active' : 'face-hotspot'} aria-label={`选择${item.name}`} aria-pressed={region?.id === item.id} onClick={() => select(item)}><span /><b>{item.name}</b></button>)}
        </div>
        <p className="note">区域由你主动选择，无需拍照或上传人脸。</p>
      </div>
      <div className="card face-map-options">
        <p className="section-label">01 · 选择区域</p>
        <div className="face-region-options">{regions.map(item => <button type="button" key={item.id} className={region?.id === item.id ? 'region-pill active' : 'region-pill'} aria-pressed={region?.id === item.id} onClick={() => select(item)}>{item.name}</button>)}</div>
        <p className="section-label">02 · 选择关注点</p>
        <h2>{region ? `${region.name}，你更关注什么？` : '先选择一个面部区域'}</h2>
        {region ? <div className="map-concern-list">{(Object.entries(goals) as [Goal, string][]).filter(([key]) => key !== 'uncertain').map(([key, label]) => <button type="button" className="map-concern" key={key} onClick={() => navigate(`/face-map/results?region=${region.id}&goal=${key}`)}><span>{label}</span><span aria-hidden="true">→</span></button>)}</div> : <p className="face-map-empty">点击左侧定位点，或使用上方区域按钮。</p>}
        <p className="note face-map-note">选择关注点后，直接查看相关产品。</p>
      </div>
    </section>
  </PageShell>
}
