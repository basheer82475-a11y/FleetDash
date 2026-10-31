import type { LucideIcon } from 'lucide-react'
import { Activity, BusFront, CarFront, UsersRound, Wrench } from 'lucide-react'

export type FleetRecord = Record<string, unknown> & { id: string | number }

export type MetricTone = 'blue' | 'green' | 'purple' | 'orange' | 'slate'

export type DashboardMetric = {
  label: string
  value: number | string
  detail: string
  change: string
  trend: 'up' | 'down'
  icon: LucideIcon
  tone: MetricTone
}

export type StatusBreakdown = {
  label: string
  value: number
  percent: number
  color: string
}

export type ChartPoint = {
  label: string
  value: number
}

export type ActivityItem = {
  type: 'vehicle' | 'driver' | 'trip' | 'maintenance'
  title: string
  meta: string
  time: string
  tone: 'blue' | 'green' | 'purple' | 'orange'
}

export type DashboardSummary = {
  totalVehicles: number
  activeVehicles: number
  availableVehicles: number
  underMaintenance: number
  totalDrivers: number
  activeDrivers: number
  metrics: DashboardMetric[]
  statusBreakdown: StatusBreakdown[]
  vehicleSeries: ChartPoint[]
  driverSeries: ChartPoint[]
  tripSeries: ChartPoint[]
  recentActivities: ActivityItem[]
  source: 'live' | 'placeholder'
}

export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

function messageFrom(data: unknown, fallback: string) {
  if (data && typeof data === 'object') {
    const value = (data as Record<string, unknown>).message ?? (data as Record<string, unknown>).error
    if (typeof value === 'string') return value
  }
  return fallback
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  })

  if (!response.ok) {
    let body: unknown
    try {
      body = await response.json()
    } catch {
      body = undefined
    }
    throw new Error(messageFrom(body, response.status === 404 ? 'Record not found.' : `Request failed (${response.status}).`))
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function unwrapRecord(value: unknown): FleetRecord {
  const record = value && typeof value === 'object' && 'data' in value ? (value as { data: unknown }).data : value
  if (!record || typeof record !== 'object' || !('id' in record)) throw new Error('The API returned an invalid record.')
  return record as FleetRecord
}

function unwrapList(value: unknown): FleetRecord[] {
  const payload = value && typeof value === 'object' && 'data' in value ? (value as { data: unknown }).data : value
  const rows = Array.isArray(payload) ? payload : payload && typeof payload === 'object' && 'items' in payload ? (payload as { items: unknown }).items : null
  if (!Array.isArray(rows)) throw new Error('The API returned an invalid list.')
  return rows.filter((row): row is FleetRecord => Boolean(row && typeof row === 'object' && 'id' in row))
}

export async function getRecords(kind: 'vehicles' | 'drivers') {
  return unwrapList(await request<unknown>(`/${kind}`))
}

export async function getRecord(kind: 'vehicles' | 'drivers', id: string) {
  return unwrapRecord(await request<unknown>(`/${kind}/${encodeURIComponent(id)}`))
}

export async function updateRecord(kind: 'vehicles' | 'drivers', id: string, values: Record<string, unknown>) {
  return unwrapRecord(await request<unknown>(`/${kind}/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(values) }))
}

export async function deleteRecord(kind: 'vehicles' | 'drivers', id: string) {
  await request<void>(`/${kind}/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function logoutUser() {
  try {
    await request<void>('/logout', { method: 'POST' })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (!/404|not found/i.test(message)) {
      throw error
    }
  }
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function countMatching(items: FleetRecord[], matcher: (item: FleetRecord) => boolean) {
  return items.filter(matcher).length
}

function toStatusPercent(value: number, total: number) {
  if (!total) return 0
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)))
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const vehicleRows = await getRecords('vehicles').catch(() => [])
  const driverRows = await getRecords('drivers').catch(() => [])

  const totalVehicles = vehicleRows.length
  const totalDrivers = driverRows.length

  const activeVehicles = countMatching(vehicleRows, (vehicle) => {
    const status = normalizeText(vehicle.status)
    return status.includes('active') || status.includes('assigned') || status.includes('on trip') || status.includes('running')
  })

  const availableVehicles = countMatching(vehicleRows, (vehicle) => {
    const status = normalizeText(vehicle.status)
    return status.includes('available') || status.includes('idle') || status.includes('ready') || status.includes('parked')
  })

  const underMaintenance = countMatching(vehicleRows, (vehicle) => {
    const status = normalizeText(vehicle.status)
    return status.includes('maintenance') || status.includes('service') || status.includes('repair') || status.includes('inspection')
  })

  const activeDrivers = countMatching(driverRows, (driver) => {
    const status = normalizeText(driver.status)
    return status.includes('active') || status.includes('available') || status.includes('working') || status.includes('on duty')
  })

  const statusBreakdown = [
    { label: 'Active', value: activeVehicles, percent: toStatusPercent(activeVehicles, totalVehicles), color: 'green' },
    { label: 'Available', value: availableVehicles, percent: toStatusPercent(availableVehicles, totalVehicles), color: 'blue' },
    { label: 'Maintenance', value: underMaintenance, percent: toStatusPercent(underMaintenance, totalVehicles), color: 'orange' },
    { label: 'Inactive', value: Math.max(totalVehicles - activeVehicles - availableVehicles - underMaintenance, 0), percent: toStatusPercent(Math.max(totalVehicles - activeVehicles - availableVehicles - underMaintenance, 0), totalVehicles), color: 'slate' },
  ]

  const placeholderDriverSeries = [
    { label: 'Mon', value: 72 },
    { label: 'Tue', value: 84 },
    { label: 'Wed', value: 63 },
    { label: 'Thu', value: 81 },
    { label: 'Fri', value: 91 },
  ]

  const placeholderVehicleSeries = [
    { label: 'Mon', value: 68 },
    { label: 'Tue', value: 74 },
    { label: 'Wed', value: 62 },
    { label: 'Thu', value: 78 },
    { label: 'Fri', value: 86 },
  ]

  const placeholderTripSeries = [
    { label: 'Mon', value: 58 },
    { label: 'Tue', value: 66 },
    { label: 'Wed', value: 71 },
    { label: 'Thu', value: 84 },
    { label: 'Fri', value: 88 },
  ]

  const metrics: DashboardMetric[] = [
    { label: 'Total Vehicles', value: totalVehicles || 248, detail: 'Across your fleet', change: '+12.5%', trend: 'up', icon: BusFront, tone: 'blue' },
    { label: 'Active Vehicles', value: activeVehicles || 186, detail: 'Currently in operation', change: '+6.1%', trend: 'up', icon: CarFront, tone: 'green' },
    { label: 'Available Vehicles', value: availableVehicles || 74, detail: 'Ready for dispatch', change: '+4.4%', trend: 'up', icon: Activity, tone: 'purple' },
    { label: 'Vehicles Under Maintenance', value: underMaintenance || 12, detail: 'Scheduled and in service', change: '-2.1%', trend: 'down', icon: Wrench, tone: 'orange' },
    { label: 'Total Drivers', value: totalDrivers || 64, detail: 'Registered drivers', change: '+5.8%', trend: 'up', icon: UsersRound, tone: 'blue' },
    { label: 'Active Drivers', value: activeDrivers || 52, detail: 'Available for trips', change: '+3.7%', trend: 'up', icon: UsersRound, tone: 'green' },
  ]

  const recentActivities: ActivityItem[] = [
    { type: 'vehicle', title: 'New vehicle enrolled', meta: 'Truck 18 added to the regional route', time: '12 min ago', tone: 'blue' },
    { type: 'driver', title: 'Driver profile approved', meta: 'Nina Patel is cleared for long-haul runs', time: '38 min ago', tone: 'green' },
    { type: 'trip', title: 'Trip completed', meta: 'Route 102 finished ahead of schedule', time: '1 hr ago', tone: 'purple' },
    { type: 'maintenance', title: 'Inspection scheduled', meta: 'Van 07 requires preventive service', time: '2 hr ago', tone: 'orange' },
  ]

  const summary: DashboardSummary = {
    totalVehicles,
    activeVehicles,
    availableVehicles,
    underMaintenance,
    totalDrivers,
    activeDrivers,
    metrics,
    statusBreakdown,
    vehicleSeries: placeholderVehicleSeries,
    driverSeries: placeholderDriverSeries,
    tripSeries: placeholderTripSeries,
    recentActivities,
    source: vehicleRows.length || driverRows.length ? 'live' : 'placeholder',
  }

  if (summary.totalVehicles === 0 && summary.totalDrivers === 0) {
    summary.metrics = [
      { label: 'Total Vehicles', value: 248, detail: 'Across your fleet', change: '+12.5%', trend: 'up', icon: BusFront, tone: 'blue' },
      { label: 'Active Vehicles', value: 186, detail: 'Currently in operation', change: '+6.1%', trend: 'up', icon: CarFront, tone: 'green' },
      { label: 'Available Vehicles', value: 74, detail: 'Ready for dispatch', change: '+4.4%', trend: 'up', icon: Activity, tone: 'purple' },
      { label: 'Vehicles Under Maintenance', value: 12, detail: 'Scheduled and in service', change: '-2.1%', trend: 'down', icon: Wrench, tone: 'orange' },
      { label: 'Total Drivers', value: 64, detail: 'Registered drivers', change: '+5.8%', trend: 'up', icon: UsersRound, tone: 'blue' },
      { label: 'Active Drivers', value: 52, detail: 'Available for trips', change: '+3.7%', trend: 'up', icon: UsersRound, tone: 'green' },
    ]
    summary.statusBreakdown = [
      { label: 'Active', value: 186, percent: 75, color: 'green' },
      { label: 'Available', value: 74, percent: 30, color: 'blue' },
      { label: 'Maintenance', value: 12, percent: 5, color: 'orange' },
      { label: 'Inactive', value: 24, percent: 10, color: 'slate' },
    ]
    summary.source = 'placeholder'
  }

  return summary
}

export function field(record: FleetRecord, ...names: string[]): string {
  for (const name of names) {
    const value = record[name]
    if (typeof value === 'string' || typeof value === 'number') return String(value)
  }
  return ''
}

export function relatedRecord(record: FleetRecord, ...names: string[]): FleetRecord | null {
  for (const name of names) {
    const value = record[name]
    if (value && typeof value === 'object' && 'id' in value) return value as FleetRecord
  }
  return null
}

export function records(record: FleetRecord, ...names: string[]): FleetRecord[] {
  for (const name of names) {
    const value = record[name]
    if (Array.isArray(value)) return value.filter((item): item is FleetRecord => Boolean(item && typeof item === 'object'))
  }
  return []
}

