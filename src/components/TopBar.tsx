import { Bell, ChevronDown, Menu, Search } from 'lucide-react'

type TopBarProps = {
  pageTitle: string
  searchValue: string
  onSearchChange: (value: string) => void
  onMenuToggle: () => void
  onProfileToggle: () => void
  profileOpen: boolean
  onSearchSubmit: () => void
  onLogout: () => void
}

export function TopBar({
  pageTitle,
  searchValue,
  onSearchChange,
  onMenuToggle,
  onProfileToggle,
  profileOpen,
  onSearchSubmit,
  onLogout,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="mobile-menu" type="button" onClick={onMenuToggle} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <div className="breadcrumbs">
          <span>Workspace</span>
          <span className="crumb-slash">/</span>
          <strong>{pageTitle}</strong>
        </div>
      </div>

      <div className="topbar-actions">
        <label className="global-search" aria-label="Search fleet data">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onSearchSubmit()
              }
            }}
            placeholder="Search vehicles, drivers..."
          />
        </label>

        <button type="button" className="icon-button transparent" aria-label="Notifications">
          <Bell size={18} />
          <i />
        </button>

        <div className="topbar-user">
          <button type="button" className="profile-trigger" onClick={onProfileToggle}>
            <span className="user-avatar">JD</span>
            <span className="user-meta">
              <strong>Jordan Davis</strong>
              <small>Fleet manager</small>
            </span>
            <ChevronDown size={15} className={profileOpen ? 'open' : ''} />
          </button>

          {profileOpen && (
            <div className="profile-menu" role="menu">
              <button type="button" role="menuitem">Profile</button>
              <button type="button" role="menuitem">Preferences</button>
              <button type="button" role="menuitem" onClick={onLogout}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
