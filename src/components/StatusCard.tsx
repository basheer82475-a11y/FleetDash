import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'

export type StatusCardTone = 'blue' | 'green' | 'purple' | 'orange' | 'slate'

export type StatusCardProps = {
  label: string
  value: string | number
  detail: string
  change?: string
  trend?: 'up' | 'down'
  icon: LucideIcon
  tone?: StatusCardTone
}

export function StatusCard({
  label,
  value,
  detail,
  change,
  trend = 'up',
  icon: Icon,
  tone = 'blue',
}: StatusCardProps) {
  const negative = trend === 'down'

  return (
    <article className="stat-card">
      <div className="stat-topline">
        <span className={`stat-icon ${tone}`}>
          <Icon size={18} strokeWidth={1.9} />
        </span>
        <button className="card-menu" type="button" aria-label={`${label} options`}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="5" cy="12" r="1.4" fill="currentColor" />
            <circle cx="12" cy="12" r="1.4" fill="currentColor" />
            <circle cx="19" cy="12" r="1.4" fill="currentColor" />
          </svg>
        </button>
      </div>

      <p className="stat-label">{label}</p>
      <div className="stat-value-row">
        <span className="stat-value">{value}</span>
        {change && (
          <span className={`stat-change ${negative ? 'negative' : ''}`}>
            {negative ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
            {change}
          </span>
        )}
      </div>
      <p className="stat-detail">{detail}</p>
    </article>
  )
}
