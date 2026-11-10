import { Link, useNavigate } from 'react-router-dom'
import { PageShell } from '../components/PageShell.tsx'
import { useQuiz } from '../qa/session.tsx'

export function PausePage() {
  const quiz = useQuiz()
  const navigate = useNavigate()

  return (
    <PageShell showBack>
      <section className="card status-card">
        <p className="section-label">暂停</p>
        <h1>已暂停常规问答</h1>
        <p className="status-banner">当前不适尚未排除</p>
        <p className="note">
          问答在这里结束，不需要填写后面的问题。这里不判断原因，不展示产品，也不包含会员内容。持续不适时，请联系有资质的专业人员。
        </p>
        <div className="actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => quiz.editStep('discomfort')}
          >
            返回修改
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
