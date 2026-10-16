import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BusFront,
  CarFront,
  CircleHelp,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Search,
  Settings2,
  ShieldCheck,
  Wrench,
  X,
  UsersRound,
} from 'lucide-react'
import { useState } from 'react'
import './App.css'

const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Vehicles', icon: BusFront },
  { label: 'Drivers', icon: UsersRound },
  { label: 'Trips', icon: Activity },
  { label: 'Maintenance', icon: Wrench },
]

const stats = [
  { label: 'Total Vehicles', value: '248', detail: 'Across your fleet', change: '+12.5%', icon: BusFront, tone: 'blue' },
  { label: 'Available Vehicles', value: '186', detail: 'Ready for assignment', change: '+8.2%', icon: CarFront, tone: 'green' },
  { label: 'Active Trips', value: '42', detail: 'Currently on the road', change: '+4.3%', icon: Activity, tone: 'purple' },
  { label: 'Under Maintenance', value: '20', detail: 'Scheduled or in service', change: '-2.1%', icon: Wrench, tone: 'orange' },
]

function App() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="dashboard-shell">
      <aside className={`sidebar${menuOpen ? ' sidebar-open' : ''}`}>
        <a className="brand" href="#dashboard" aria-label="FleetDash home">
          <span className="brand-mark"><BusFront size={21} strokeWidth={2.3} /></span>
          <span>Fleet<span className="brand-light">Dash</span></span>
          <button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={19} /></button>
        </a>

        <div className="nav-caption">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(({ label, icon: Icon }, index) => (
            <a className={`nav-link${index === 0 ? ' active' : ''}`} href={`#${label.toLowerCase()}`} key={label} aria-current={index === 0 ? 'page' : undefined}>
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
              {label === 'Maintenance' && <span className="nav-count">3</span>}
            </a>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon"><CircleHelp size={17} /></span>
            <div><strong>Need a hand?</strong><span>Visit our help center</span></div>
            <ArrowUpRight size={15} className="help-arrow" />
          </div>
          <button className="profile-button">
            <span className="avatar">JD</span>
            <span className="profile-copy"><strong>Jordan Davis</strong><span>Fleet manager</span></span>
            <MoreHorizontal size={20} />
          </button>
        </div>
      </aside>

      {menuOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={21} /></button>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>Dashboard</strong></div>
          <div className="topbar-actions">
            <button className="icon-button search-button" aria-label="Search"><Search size={19} /></button>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={19} /><i /></button>
            <span className="topbar-divider" />
            <span className="topbar-date">Thursday, October 16, 2026</span>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span className="live-dot" /> FLEET STATUS <span className="eyebrow-divider">·</span> LIVE OVERVIEW</div>
              <h1>Fleet Overview</h1>
              <p className="page-subtitle">Here’s what’s happening across your fleet today.</p>
            </div>
            <button className="date-filter"><span className="calendar-mini">16</span><span>Today, Oct 16</span><Settings2 size={16} /></button>
          </section>

          <section className="stats-grid" aria-label="Fleet summary">
            {stats.map(({ label, value, detail, change, icon: Icon, tone }) => (
              <article className="stat-card" key={label}>
                <div className="stat-topline"><span className={`stat-icon ${tone}`}><Icon size={19} strokeWidth={1.9} /></span><button className="card-menu" aria-label={`${label} options`}><MoreHorizontal size={19} /></button></div>
                <p className="stat-label">{label}</p>
                <div className="stat-value-row"><span className="stat-value">{value}</span><span className={`stat-change ${tone === 'orange' ? 'negative' : ''}`}>{tone === 'orange' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}{change}</span></div>
                <p className="stat-detail">{detail} <span>·</span> vs. last month</p>
              </article>
            ))}
          </section>

          <section className="welcome-panel">
            <div className="welcome-copy">
              <span className="welcome-kicker"><ShieldCheck size={15} /> ALL SYSTEMS OPERATIONAL</span>
              <h2>Your fleet is moving smoothly.</h2>
              <p>186 vehicles are ready to go, with 42 active trips currently on the road.</p>
            </div>
            <div className="welcome-art" aria-hidden="true">
              <span className="art-orbit orbit-one" /><span className="art-orbit orbit-two" />
              <span className="art-pin pin-one"><span /></span><span className="art-pin pin-two"><span /></span><span className="art-pin pin-three"><span /></span>
              <span className="art-route" />
              <span className="art-vehicle"><BusFront size={29} strokeWidth={1.6} /></span>
            </div>
          </section>

          <section className="lower-grid">
            <article className="content-card activity-card">
              <div className="section-heading"><div><h2>Fleet activity</h2><p>A quick look at today’s operations</p></div><button className="text-action">View all <ArrowUpRight size={15} /></button></div>
              <div className="empty-activity"><span className="empty-icon"><Activity size={21} /></span><div><strong>You’re all caught up</strong><p>New fleet activity will show up here.</p></div></div>
            </article>
            <article className="content-card health-card">
              <div className="section-heading"><div><h2>Fleet health</h2><p>Vehicle status breakdown</p></div><button className="card-menu" aria-label="Fleet health options"><MoreHorizontal size={19} /></button></div>
              <div className="health-meter"><span /><span /><span /><span /></div>
              <div className="health-legend"><div><i className="legend-dot available" /><span>Available</span><strong>186</strong></div><div><i className="legend-dot on-trip" /><span>On trip</span><strong>42</strong></div><div><i className="legend-dot service" /><span>In service</span><strong>20</strong></div></div>
            </article>
          </section>

          <footer className="page-footer"><span>© 2026 FleetDash</span><span><span className="footer-status" /> Fleet data synced just now</span></footer>
        </div>
      </main>
    </div>
  )
}

export default App
