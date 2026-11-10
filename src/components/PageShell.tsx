import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ModuleNav } from './ModuleNav.tsx'

type PageShellProps = {
  children: ReactNode
  showBack?: boolean
}

export function PageShell({ children, showBack = false }: PageShellProps) {
  return (
    <div className="page">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">宝拉珍选</span>
          <span className="brand-service">AI 护肤顾问</span>
        </Link>
        <div className="topbar-side">
          {showBack ? (
            <Link to="/" className="back-link">
              返回首页
            </Link>
          ) : null}
          <ModuleNav placement="top" />
        </div>
      </header>
      <main className="wrap">{children}</main>
    </div>
  )
}
