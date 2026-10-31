import { Activity, BusFront, ShieldCheck, UsersRound, Wrench } from 'lucide-react'
import { StatusCard } from '../components/StatusCard'
import type { DashboardSummary } from '../fleetApi'

type DashboardPageProps = {
  summary: DashboardSummary | null
  loading: boolean
  error: string
  onRetry: () => void
}

export function DashboardPage({ summary, loading, error, onRetry }: DashboardPageProps) {
  if (loading) {
    return (
      <div className="page-content">
        <section className="state-panel">
          <span className="loading-spinner" />
          <p>Loading fleet overview…</p>
        </section>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="page-content">
        <section className="state-panel error-state">
          <strong>{error || 'Unable to load dashboard data.'}</strong>
          <button type="button" className="secondary-button" onClick={onRetry}>Retry</button>
        </section>
      </div>
    )
  }

  return (
    <div className="page-content">
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot" />
            FLEET STATUS • LIVE OVERVIEW
          </div>
          <h1>Fleet Overview</h1>
          <p className="page-subtitle">Here’s what’s happening across your fleet today.</p>
        </div>

        <div className="header-badge">
          <span>{summary.source === 'live' ? 'Live sync' : 'Temporary placeholder'}</span>
        </div>
      </section>

      <section className="stats-grid" aria-label="Fleet summary">
        {summary.metrics.map((metric) => (
          <StatusCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
            change={metric.change}
            trend={metric.trend}
            icon={metric.icon}
            tone={metric.tone}
          />
        ))}
      </section>

      <section className="welcome-panel">
        <div className="welcome-copy">
          <span className="welcome-kicker">
            <ShieldCheck size={15} />
            ALL SYSTEMS OPERATIONAL
          </span>
          <h2>Your fleet is moving smoothly.</h2>
          <p>
            {summary.activeVehicles} vehicles are active and {summary.availableVehicles} are ready to dispatch.
          </p>
        </div>

        <div className="welcome-art" aria-hidden="true">
          <span className="art-orbit orbit-one" />
          <span className="art-orbit orbit-two" />
          <span className="art-pin pin-one"><span /></span>
          <span className="art-pin pin-two"><span /></span>
          <span className="art-pin pin-three"><span /></span>
          <span className="art-route" />
          <span className="art-vehicle"><BusFront size={27} strokeWidth={1.7} /></span>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="content-card">
          <div className="section-heading">
            <div>
              <h2>Vehicle status overview</h2>
              <p>Current availability mix</p>
            </div>
          </div>

          <div className="status-rollup">
            {summary.statusBreakdown.map((status) => (
              <div className="status-row" key={status.label}>
                <div className="status-name-wrap">
                  <span className={`status-dot ${status.color}`} />
                  <span>{status.label}</span>
                </div>
                <div className="status-bar-track">
                  <span className={`status-bar ${status.color}`} style={{ width: `${status.percent}%` }} />
                </div>
                <strong>{status.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="content-card">
          <div className="section-heading">
            <div>
              <h2>Recent activities</h2>
              <p>Latest updates across the fleet</p>
            </div>
          </div>

          <ul className="activity-list">
            {summary.recentActivities.map((item) => (
              <li key={`${item.type}-${item.title}-${item.time}`}>
                <span className={`activity-icon ${item.tone}`}>
                  {item.type === 'vehicle' ? <BusFront size={14} /> : item.type === 'driver' ? <UsersRound size={14} /> : item.type === 'maintenance' ? <Wrench size={14} /> : <Activity size={14} />}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.meta}</small>
                </div>
                <time>{item.time}</time>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="analytics-grid">
        <article className="content-card chart-card">
          <div className="section-heading">
            <div>
              <h2>Vehicle statistics</h2>
              <p>Daily fleet utilization</p>
            </div>
          </div>

          <div className="chart-bars">
            {summary.vehicleSeries.map((item) => (
              <div className="chart-row" key={item.label}>
                <span>{item.label}</span>
                <div className="chart-track"><span style={{ width: `${item.value}%` }} /></div>
                <strong>{item.value}%</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="content-card chart-card">
          <div className="section-heading">
            <div>
              <h2>Driver statistics</h2>
              <p>Attendance and productivity</p>
            </div>
          </div>

          <div className="chart-bars">
            {summary.driverSeries.map((item) => (
              <div className="chart-row" key={item.label}>
                <span>{item.label}</span>
                <div className="chart-track"><span className="alt" style={{ width: `${item.value}%` }} /></div>
                <strong>{item.value}%</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="content-card chart-card">
          <div className="section-heading">
            <div>
              <h2>Trip statistics</h2>
              <p>Trip flow this week</p>
            </div>
          </div>

          <div className="chart-bars">
            {summary.tripSeries.map((item) => (
              <div className="chart-row" key={item.label}>
                <span>{item.label}</span>
                <div className="chart-track"><span className="accent" style={{ width: `${item.value}%` }} /></div>
                <strong>{item.value}%</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
