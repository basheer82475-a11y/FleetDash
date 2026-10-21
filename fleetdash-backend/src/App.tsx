import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BusFront,
  CarFront,
  ChevronDown,
  CircleHelp,
  Download,
  MapPin,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
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

const vehicles = [
  { id: 'VH-2048', name: 'Ford Transit', type: 'Cargo Van', plate: 'CA 8KJ 4291', status: 'Available', driver: '—', location: 'San Francisco, CA', mileage: '24,810 mi' },
  { id: 'VH-2047', name: 'Mercedes Sprinter', type: 'Cargo Van', plate: 'CA 7MP 1836', status: 'On trip', driver: 'Marcus Chen', location: 'Oakland, CA', mileage: '38,245 mi' },
  { id: 'VH-2046', name: 'Freightliner M2', type: 'Box Truck', plate: 'CA 5RT 6204', status: 'Available', driver: '—', location: 'San Jose, CA', mileage: '62,108 mi' },
  { id: 'VH-2045', name: 'Ford F-150', type: 'Pickup', plate: 'CA 9BD 7712', status: 'In service', driver: '—', location: 'Sacramento, CA', mileage: '51,376 mi' },
  { id: 'VH-2044', name: 'Isuzu NPR', type: 'Box Truck', plate: 'CA 4LN 3985', status: 'On trip', driver: 'Aisha Patel', location: 'Berkeley, CA', mileage: '44,920 mi' },
  { id: 'VH-2043', name: 'Ram ProMaster', type: 'Cargo Van', plate: 'CA 6CW 8543', status: 'Available', driver: '—', location: 'San Francisco, CA', mileage: '19,630 mi' },
  { id: 'VH-2042', name: 'Chevrolet Express', type: 'Passenger Van', plate: 'CA 3FX 1158', status: 'Available', driver: '—', location: 'Fremont, CA', mileage: '32,704 mi' },
  { id: 'VH-2041', name: 'Hino 268', type: 'Box Truck', plate: 'CA 2GV 9470', status: 'In service', driver: '—', location: 'San Jose, CA', mileage: '73,281 mi' },
]

function VehiclesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesStatus = statusFilter === 'All statuses' || vehicle.status === statusFilter
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || [vehicle.id, vehicle.name, vehicle.type, vehicle.plate, vehicle.driver, vehicle.location].some((value) => value.toLowerCase().includes(query))
    return matchesStatus && matchesSearch
  })

  return (
    <div className="page-content vehicles-content">
      <section className="page-heading vehicles-heading">
        <div>
          <div className="eyebrow"><span className="live-dot" /> FLEET MANAGEMENT</div>
          <h1>Vehicles</h1>
          <p className="page-subtitle">Manage your fleet, check vehicle status, and keep every trip moving.</p>
        </div>
        <button className="primary-button"><Plus size={16} /> Add vehicle</button>
      </section>

      <section className="vehicle-summary" aria-label="Vehicle status summary">
        <article><span className="summary-label">Total vehicles</span><strong>248</strong><span className="summary-note"><span className="summary-dot total-dot" /> Across your fleet</span></article>
        <article><span className="summary-label">Available</span><strong>186</strong><span className="summary-note"><span className="summary-dot available-dot" /> Ready for assignment</span></article>
        <article><span className="summary-label">On trip</span><strong>42</strong><span className="summary-note"><span className="summary-dot trip-dot" /> Currently on the road</span></article>
        <article><span className="summary-label">In service</span><strong>20</strong><span className="summary-note"><span className="summary-dot service-dot" /> Scheduled or in repair</span></article>
      </section>

      <section className="vehicle-table-card">
        <div className="vehicle-table-heading">
          <div><h2>All vehicles</h2><p>Keep track of every vehicle in your fleet.</p></div>
          <button className="export-button"><Download size={15} /> Export</button>
        </div>
        <div className="vehicle-toolbar">
          <label className="vehicle-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vehicles..." aria-label="Search vehicles" /></label>
          <label className="status-select-wrap"><span className="sr-only">Filter by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option><option>Available</option><option>On trip</option><option>In service</option></select><ChevronDown size={15} /></label>
          <span className="vehicle-count">{filteredVehicles.length} vehicles</span>
        </div>
        <div className="vehicle-table-scroll">
          <table className="vehicle-table">
            <thead><tr><th>Vehicle</th><th>Type</th><th>Status</th><th>Assigned driver</th><th>Location</th><th>Mileage</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{filteredVehicles.map((vehicle) => (
              <tr key={vehicle.id}>
                <td><div className="vehicle-name-cell"><span className="vehicle-thumb"><BusFront size={18} /></span><span><strong>{vehicle.name}</strong><small>{vehicle.id} <span>·</span> {vehicle.plate}</small></span></div></td>
                <td className="vehicle-type">{vehicle.type}</td>
                <td><span className={`vehicle-status ${vehicle.status.toLowerCase().replace(' ', '-')}`}><i />{vehicle.status}</span></td>
                <td className={vehicle.driver === '—' ? 'unassigned' : ''}>{vehicle.driver}</td>
                <td><span className="vehicle-location"><MapPin size={14} />{vehicle.location}</span></td>
                <td className="vehicle-mileage">{vehicle.mileage}</td>
                <td><button className="card-menu row-menu" aria-label={`More options for ${vehicle.name}`}><MoreHorizontal size={18} /></button></td>
              </tr>
            ))}</tbody>
          </table>
          {filteredVehicles.length === 0 && <div className="vehicle-empty">No vehicles match your search.</div>}
        </div>
        <div className="vehicle-table-footer"><span>Showing {filteredVehicles.length} of 248 vehicles</span><div><button disabled>Previous</button><button className="current-page">1</button><button>2</button><button>3</button><span>…</span><button>31</button><button>Next</button></div></div>
      </section>
      <footer className="page-footer"><span>© 2026 FleetDash</span><span><span className="footer-status" /> Fleet data synced just now</span></footer>
    </div>
  )
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedPage, setSelectedPage] = useState('Dashboard')

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
          {navigation.map(({ label, icon: Icon }) => (
            <a className={`nav-link${selectedPage === label ? ' active' : ''}`} href={`#${label.toLowerCase()}`} key={label} onClick={(event) => { event.preventDefault(); if (label === 'Dashboard' || label === 'Vehicles') setSelectedPage(label); setMenuOpen(false) }} aria-current={selectedPage === label ? 'page' : undefined}>
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
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{selectedPage}</strong></div>
          <div className="topbar-actions">
            <button className="icon-button search-button" aria-label="Search"><Search size={19} /></button>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={19} /><i /></button>
            <span className="topbar-divider" />
            <span className="topbar-date">Friday, October 16, 2026</span>
          </div>
        </header>

        {selectedPage === 'Vehicles' ? <VehiclesPage /> : <div className="page-content">
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
        </div>}
      </main>
    </div>
  )
}

export default App
