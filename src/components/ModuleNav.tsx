import { createContext, useContext, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { Task } from '../qa/model.ts'
import { useQuiz } from '../qa/session.tsx'

type ModuleId = 'select' | 'usage' | 'plan' | 'member'

type Dest = {
  to: string
  state?: { fresh: true }
}

const modules: { id: ModuleId; to: string; label: string }[] = [
  { id: 'select', to: '/face-map', label: '面部地图' },
  { id: 'usage', to: '/products', label: '使用方法' },
  { id: 'plan', to: '/saved', label: '我的护肤方案' },
  { id: 'member', to: '/membership', label: '会员与客服' },
]

function currentModule(pathname: string, task: Task | null | undefined): ModuleId | null {
  if (pathname === '/compare' || pathname === '/products' || pathname.startsWith('/products/')) return 'usage'
  if (pathname === '/saved') return 'plan'
  if (pathname === '/membership') return 'member'
  if (pathname === '/face-map' || pathname.startsWith('/face-map/')) return 'select'
  if (pathname === '/qa/usage') return 'usage'
  if (pathname === '/qa/both') return task === 'usage' ? 'usage' : null
  return null
}

const LeaveContext = createContext<((dest: Dest) => void) | null>(null)

export function LeaveGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const quiz = useQuiz()
  const [pending, setPending] = useState<Dest | null>(null)
  const stayRef = useRef<HTMLButtonElement>(null)
  const unfinished = quiz.session?.phase === 'quiz' && location.pathname.startsWith('/qa/')

  useEffect(() => {
    document.body.classList.toggle('leave-open', Boolean(pending))
    return () => document.body.classList.remove('leave-open')
  }, [pending])

  useEffect(() => {
    if (!pending) return
    stayRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPending(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending])

  const ask = (dest: Dest) => {
    if (unfinished) {
      setPending(dest)
      return
    }
    navigate(dest.to, { state: dest.state })
  }

  const go = () => {
    if (!pending) return
    const dest = pending
    setPending(null)
    navigate(dest.to, { state: dest.state })
  }

  return (
    <LeaveContext.Provider value={ask}>
      {children}
      {pending ? (
        <p className="leave-confirm" role="alertdialog" aria-label="离开问答">
          <span>这次问答还没有完成。确定离开吗？</span>
          <button ref={stayRef} type="button" onClick={() => setPending(null)}>
            留下
          </button>
          <button type="button" onClick={go}>
            离开
          </button>
        </p>
      ) : null}
    </LeaveContext.Provider>
  )
}

export function ModuleNav({ placement }: { placement: 'top' | 'bottom' }) {
  const location = useLocation()
  const quiz = useQuiz()
  const ask = useContext(LeaveContext)
  const current = currentModule(location.pathname, quiz.session?.answers.task)

  const open = (event: MouseEvent<HTMLAnchorElement>, id: ModuleId, to: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    if (id === current && location.pathname === to) return
    const task = quiz.session?.answers.task
    const state = (id === 'select' || id === 'usage') && task !== id ? ({ fresh: true } as const) : undefined
    ask?.({ to, state })
  }

  return (
    <nav
      className={placement === 'top' ? 'module-nav module-nav-top' : 'module-nav module-nav-bottom'}
      aria-label="模块"
    >
      {modules.map((item) => (
        <Link
          key={item.id}
          to={item.to}
          aria-current={current === item.id ? 'page' : undefined}
          onClick={(event) => open(event, item.id, item.to)}
        >
          <ModuleIcon id={item.id} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}

function ModuleIcon({ id }: { id: ModuleId }) {
  if (id === 'select') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 5c0-3 10-3 10 0v8c0 5-3 8-5 8s-5-3-5-8ZM9 10h.1M15 10h.1M12 11v3M10 17h4" />
      </svg>
    )
  }
  if (id === 'usage') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.5 3.5h5M10.2 3.5v5.2L6.4 18.2A2 2 0 0 0 8.2 21h7.6a2 2 0 0 0 1.8-2.8l-3.8-9.5V3.5" />
      </svg>
    )
  }
  if (id === 'plan') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4.2h10a1 1 0 0 1 1 1V20l-6-3.4L6 20V5.2a1 1 0 0 1 1-1z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3" />
      <path d="M5.6 19.2c1.1-2.8 3.3-4.2 6.4-4.2s5.3 1.4 6.4 4.2" />
    </svg>
  )
}
