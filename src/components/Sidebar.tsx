import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight, CircleHelp, LogOut, MoreHorizontal } from 'lucide-react'

export type NavigationItem = {
  key: string
  label: string
  icon: LucideIcon
  badge?: number
}

type SidebarProps = {
  items: NavigationItem[]
  selectedKey: string
  onNavigate: (key: string) => void
  onLogout: () => void
}

export function Sidebar({ items, selectedKey, onNavigate, onLogout }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand" role="banner">
        <span className="brand-mark">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3.5 17.5h17M6.5 17.5V9.7l4.1-4.2h7.7l.9.9v11.1M9.5 9.5h6.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span>
          Fleet<span className="brand-light">Dash</span>
        </span>
      </div>

      <div className="nav-caption">WORKSPACE</div>

      <nav className="main-nav" aria-label="Main navigation">
        {items.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            type="button"
            className={`nav-link ${selectedKey === key ? 'active' : ''}`}
            onClick={() => onNavigate(key)}
            aria-current={selectedKey === key ? 'page' : undefined}
          >
            <Icon size={18} strokeWidth={1.8} />
            <span>{label}</span>
            {badge ? <span className="nav-count">{badge}</span> : null}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="help-card">
          <span className="help-icon">
            <CircleHelp size={16} />
          </span>
          <div>
            <strong>Need a hand?</strong>
            <span>Help center</span>
          </div>
          <ArrowUpRight size={15} className="help-arrow" />
        </div>

        <button type="button" className="profile-button" onClick={onLogout}>
          <span className="avatar">JD</span>
          <span className="profile-copy">
            <strong>Jordan Davis</strong>
            <span>Fleet manager</span>
          </span>
          <MoreHorizontal size={18} />
        </button>

        <button type="button" className="logout-button" onClick={onLogout}>
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </aside>
  )
}
