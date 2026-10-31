import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, BarChart3, BusFront, LayoutDashboard, Settings, UsersRound, Wrench } from 'lucide-react'
import FleetList from './FleetList'
import RecordDetails from './RecordDetails'
import { Sidebar, type NavigationItem } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { DashboardPage } from './pages/DashboardPage'
import { getDashboardSummary, logoutUser, type DashboardSummary } from './fleetApi'
import './App.css'

const navigationItems: NavigationItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'vehicles', label: 'Vehicles', icon: BusFront },
  { key: 'drivers', label: 'Drivers', icon: UsersRound },
  { key: 'trips', label: 'Trips', icon: Activity },
  { key: 'maintenance', label: 'Maintenance', icon: Wrench },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: Settings },
]

function getRouteKey(hash: string) {
  const normalized = hash || '#dashboard'
  if (normalized === '#vehicles' || normalized.startsWith('#vehicles/')) return 'vehicles'
  if (normalized === '#drivers' || normalized.startsWith('#drivers/')) return 'drivers'
  const key = normalized.replace(/^#/, '')
  return key || 'dashboard'
}

function getPageTitle(hash: string) {
  const routeKey = getRouteKey(hash)
  const match = navigationItems.find((item) => item.key === routeKey)
  if (match) return match.label
  if (routeKey === 'vehicles') return 'Vehicles'
  if (routeKey === 'drivers') return 'Drivers'
  if (routeKey === 'dashboard') return 'Dashboard'
  return 'Dashboard'
}

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="page-content">
      <section className="page-heading placeholder-page">
        <div>
          <div className="eyebrow">
            <span className="live-dot" />
            MODULE PREVIEW
          </div>
          <h1>{title}</h1>
          <p className="page-subtitle">{description}</p>
        </div>
      </section>
    </div>
  )
}

function App() {
  const [route, setRoute] = useState(() => window.location.hash || '#dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const selectedKey = useMemo(() => getRouteKey(route), [route])
  const pageTitle = useMemo(() => getPageTitle(route), [route])

  const syncHash = useCallback(() => {
    setRoute(window.location.hash || '#dashboard')
    setProfileOpen(false)
  }, [])

  useEffect(() => {
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [syncHash])

  const loadSummary = useCallback(async () => {
    setLoading(true)
    try {
      const nextSummary = await getDashboardSummary()
      setSummary(nextSummary)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Dashboard summary could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  const navigate = useCallback((nextHash: string) => {
    const normalized = nextHash.startsWith('#') ? nextHash : `#${nextHash}`
    window.location.hash = normalized
    setRoute(normalized)
    setMenuOpen(false)
    setProfileOpen(false)
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      await logoutUser()
    } catch {
      // The backend logout endpoint may not exist; continue with local navigation.
    }

    setSearchQuery('')
    setProfileOpen(false)
    window.location.hash = '#dashboard'
    setRoute('#dashboard')
  }, [])

  const handleSearchSubmit = useCallback(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return
    if (route === '#dashboard' || route === '#trips' || route === '#maintenance' || route === '#reports' || route === '#settings') {
      navigate('#vehicles')
    }
  }, [navigate, route, searchQuery])

  const detailMatch = route.match(/^#(vehicles|drivers)\/([^/]+)$/)
  const isVehiclesList = route === '#vehicles'
  const isDriversList = route === '#drivers'

  const content = useMemo(() => {
    if (detailMatch) {
      return <RecordDetails kind={detailMatch[1] as 'vehicles' | 'drivers'} id={decodeURIComponent(detailMatch[2])} navigate={navigate} />
    }

    if (isVehiclesList) {
      return <FleetList kind="vehicles" navigate={navigate} searchQuery={searchQuery} />
    }

    if (isDriversList) {
      return <FleetList kind="drivers" navigate={navigate} searchQuery={searchQuery} />
    }

    if (route === '#dashboard') {
      return <DashboardPage summary={summary} loading={loading} error={error} onRetry={() => void loadSummary()} />
    }

    if (route === '#trips') {
      return <PlaceholderPage title="Trips" description="Trip tracking, lane assignment, and dispatch performance are scheduled for the next release cycle." />
    }

    if (route === '#maintenance') {
      return <PlaceholderPage title="Maintenance" description="Preventive maintenance workflows, asset downtime tracking, and technician scheduling will be added in Week 2." />
    }

    if (route === '#reports') {
      return <PlaceholderPage title="Reports" description="Fleet performance metrics and custom export reporting are being prepared for the next sprint." />
    }

    if (route === '#settings') {
      return <PlaceholderPage title="Settings" description="Configuration controls for organizations, billing, and alerts will land in the upcoming module work." />
    }

    return <PlaceholderPage title={pageTitle} description="This module is currently in preparation." />
  }, [detailMatch, error, isDriversList, isVehiclesList, loadSummary, loading, navigate, pageTitle, route, searchQuery, summary])

  return (
    <div className="dashboard-shell">
      <Sidebar items={navigationItems} selectedKey={selectedKey} onNavigate={navigate} onLogout={handleLogout} isOpen={menuOpen} />

      <main className="main-content">
        <TopBar
          pageTitle={pageTitle}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onMenuToggle={() => setMenuOpen((current) => !current)}
          onProfileToggle={() => setProfileOpen((current) => !current)}
          profileOpen={profileOpen}
          onSearchSubmit={handleSearchSubmit}
          onLogout={handleLogout}
        />

        {menuOpen && <button type="button" className="mobile-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}

        {content}
      </main>
    </div>
  )
}

export default App
