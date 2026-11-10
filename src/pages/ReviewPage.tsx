import { Link, useNavigate } from 'react-router-dom'
import { PageShell } from '../components/PageShell.tsx'
import { summaryRows } from '../qa/model.ts'
import { useQuiz } from '../qa/session.tsx'

export function ReviewPage({ onEdit }: { onEdit: () => void }) {
  const quiz = useQuiz()
  const navigate = useNavigate()
  const answers = quiz.session?.answers
  if (!answers) return null

  return (
    <PageShell showBack>
      <section className="card status-card">
        <p className="section-label">回答确认</p>
        <h1>回答确认</h1>
        
        <p className="note">确认你的需求，或点击“修改”调整回答。</p>
        <dl className="answer-list">
          {summaryRows(answers).map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  onEdit()
                  quiz.editStep(row.stepId)
                }}
              >
                修改
              </button>
            </div>
          ))}
        </dl>
        <div className="actions">
          <button type="button" className="primary-button" onClick={quiz.showResult}>
            查看结果
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
