import { ArrowRight, Building2, ShieldCheck, UserRound, Users2 } from 'lucide-react'
import { useMemo, useState } from 'react'

type RoleKey = 'admin' | 'user' | 'partners'

type AuthRole = {
  key: RoleKey
  label: string
  tagline: string
  description: string
  icon: typeof ShieldCheck
}

const roles: AuthRole[] = [
  {
    key: 'admin',
    label: 'Admin',
    tagline: 'Operations control',
    description: 'Full fleet visibility, approvals, and compliance oversight.',
    icon: ShieldCheck,
  },
  {
    key: 'user',
    label: 'User',
    tagline: 'Field access',
    description: 'Manage assigned trips, routes, and live vehicle status.',
    icon: UserRound,
  },
  {
    key: 'partners',
    label: 'Partners',
    tagline: 'Partner network',
    description: 'Track shared assets and service performance in one place.',
    icon: Building2,
  },
]

type AuthPageProps = {
  initialRole?: RoleKey
  onLogin: (role: RoleKey) => void
}

export function AuthPage({ initialRole = 'admin', onLogin }: AuthPageProps) {
  const [selectedRole, setSelectedRole] = useState<RoleKey>(initialRole)
  const [email, setEmail] = useState('admin@fleetdash.io')
  const [password, setPassword] = useState('fleetdash123')
  const [remember, setRemember] = useState(true)

  const activeRole = useMemo(
    () => roles.find((item) => item.key === selectedRole) ?? roles[0],
    [selectedRole],
  )

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim() || !password.trim()) {
      return
    }
    onLogin(selectedRole)
  }

  return (
    <div className="auth-shell">
      <div className="auth-backdrop" aria-hidden="true" />

      <div className="auth-panel">
        <aside className="auth-sidebar">
          <div className="auth-brand" aria-label="FleetDash">
            <span className="auth-brand-mark">FD</span>
            <span>FleetDash</span>
          </div>

          <div className="auth-copy">
            <p className="auth-label">Fleet management portal</p>
            <h1>Welcome back.</h1>
            <p>
              Access the right workspace for fleet oversight, driver coordination, and partner operations.
            </p>
          </div>

          <div className="auth-feature-list">
            <div className="feature-item">
              <span className="feature-icon"><Users2 size={16} /></span>
              <div>
                <strong>Unified fleet view</strong>
                <small>Live asset, driver, and trip visibility</small>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon"><ShieldCheck size={16} /></span>
              <div>
                <strong>Secure access</strong>
                <small>Role-based portal controls</small>
              </div>
            </div>
          </div>
        </aside>

        <section className="auth-form-panel">
          <div className="auth-header-row">
            <div>
              <p className="auth-label">Sign in</p>
              <h2>{activeRole.label} portal</h2>
            </div>
            <span className="role-tag">{activeRole.tagline}</span>
          </div>

          <div className="auth-role-switcher" role="tablist" aria-label="Login role selector">
            {roles.map((role) => {
              const Icon = role.icon
              return (
                <button
                  key={role.key}
                  type="button"
                  className={`role-tab ${selectedRole === role.key ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedRole(role.key)
                    window.location.hash = `#login/${role.key}`
                  }}
                  role="tab"
                  aria-selected={selectedRole === role.key}
                >
                  <Icon size={15} />
                  {role.label}
                </button>
              )
            })}
          </div>

          <div className="role-description">
            <strong>{activeRole.label}</strong>
            <span>{activeRole.description}</span>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              <span>Email address</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </label>

            <div className="auth-form-row">
              <label className="remember-me">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                <span>Keep me signed in</span>
              </label>
              <button type="button" className="text-button">Forgot password?</button>
            </div>

            <button type="submit" className="primary-button">
              Sign in as {activeRole.label}
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="auth-footer">
            <span>Need access?</span>
            <button type="button" className="text-button">Request portal access</button>
          </div>
        </section>
      </div>
    </div>
  )
}
