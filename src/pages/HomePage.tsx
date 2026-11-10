import { Link } from 'react-router-dom'
import { ModuleNav } from '../components/ModuleNav.tsx'

const steps = [
  {
    title: '了解需求',
    text: '简短问答，明确关注点',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="6.5" y="3.5" width="11" height="17" rx="1.5" />
        <path d="M9 3.8h6V6H9zM9 10.5h6M9 13.5h6M9 16.5h4" />
      </svg>
    ),
  },
  {
    title: '查看选择依据',
    text: '产品信息与理由清晰呈现',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.5 3.5h5M10.2 3.5v5.2L6.4 18.2A2 2 0 0 0 8.2 21h7.6a2 2 0 0 0 1.8-2.8l-3.8-9.5V3.5" />
        <path d="M8.2 14.5h7.6" />
      </svg>
    ),
  },
  {
    title: '保存方案',
    text: '随时回看你的选择',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4.2h10a1 1 0 0 1 1 1V20l-6-3.4L6 20V5.2a1 1 0 0 1 1-1z" />
      </svg>
    ),
  },
] as const

export function HomePage() {
  return (
    <div className="page home">
      <section className="home-stage">
        <div className="home-inner home-stage-inner">
          <div className="home-top">
            <Link to="/" className="home-brand">
              <span className="home-brand-en">PAULA’S CHOICE</span>
              <span className="home-brand-zh">宝拉珍选</span>
            </Link>
            <ModuleNav placement="top" />
          </div>
          <div className="home-copy">
            <p className="home-kicker">
              你的专属护肤选择
              <span aria-hidden="true" />
            </p>
            <h1>
              从肌肤需求，
              <br />
              找到你的护肤选择
            </h1>
            <p className="home-lead">回答几个问题，查看相关产品、选择依据与使用说明。</p>
            <div className="home-actions">
              <Link className="home-primary" to="/qa/select" state={{ fresh: true }}>
                开始选品 →
              </Link>
              <Link className="home-secondary" to="/products" state={{ fresh: true }}>
                了解已有产品
              </Link>
            </div>
            <p className="home-demo">产品信息仅供护肤参考</p>
          </div>
        </div>
      </section>
      <main className="home-main">
        <div className="home-inner">
          <ol className="home-steps">
            {steps.map((step, index) => (
              <li key={step.title}>
                {step.icon}
                <div>
                  <p className="home-step-title">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    {step.title}
                  </p>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <section className="home-saved" aria-label="我的护肤方案">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 4.2h10a1 1 0 0 1 1 1V20l-6-3.4L6 20V5.2a1 1 0 0 1 1-1z" />
            </svg>
            <div>
              <p className="home-saved-title">我的护肤方案</p>
              <p>查看已保存的产品与方案</p>
            </div>
            <Link to="/saved">查看方案 →</Link>
          </section>
        </div>
      </main>
    </div>
  )
}
