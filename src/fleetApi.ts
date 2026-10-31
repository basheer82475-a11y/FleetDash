export type FleetRecord = Record<string, unknown> & { id: string | number }

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

function messageFrom(data: unknown, fallback: string) {
  if (data && typeof data === 'object') {
    const value = (data as Record<string, unknown>).message ?? (data as Record<string, unknown>).error
    if (typeof value === 'string') return value
  }
  return fallback
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  })
  if (!response.ok) {
    let body: unknown
    try { body = await response.json() } catch { body = undefined }
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

export async function getRecords(kind: 'vehicles' | 'drivers') { return unwrapList(await request<unknown>(`/${kind}`)) }
export async function getRecord(kind: 'vehicles' | 'drivers', id: string) { return unwrapRecord(await request<unknown>(`/${kind}/${encodeURIComponent(id)}`)) }
export async function updateRecord(kind: 'vehicles' | 'drivers', id: string, values: Record<string, unknown>) {
  return unwrapRecord(await request<unknown>(`/${kind}/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(values) }))
}
export async function deleteRecord(kind: 'vehicles' | 'drivers', id: string) {
  await request<void>(`/${kind}/${encodeURIComponent(id)}`, { method: 'DELETE' })
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
