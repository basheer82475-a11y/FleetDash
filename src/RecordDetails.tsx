import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BusFront, Pencil, RefreshCw, Trash2, UserRound } from 'lucide-react'
import { deleteRecord, field, getRecord, records, relatedRecord, updateRecord } from './fleetApi'
import type { FleetRecord } from './fleetApi'

type Kind = 'vehicles' | 'drivers'
type Props = { kind: Kind; id: string; navigate: (hash: string) => void }
const humanize = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/^./, (char) => char.toUpperCase())
const shown = (value: unknown) => value === null || value === undefined || value === '' ? '—' : typeof value === 'object' ? '' : String(value)
const dateValue = (record: FleetRecord, ...keys: string[]) => field(record, ...keys)

export default function RecordDetails({ kind, id, navigate }: Props) {
  const [record, setRecord] = useState<FleetRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const title = kind === 'vehicles' ? 'Vehicle' : 'Driver'

  const load = useCallback(async (quiet = false) => {
    if (!id || id.length > 128) { setError('This ID is invalid.'); setRecord(null); setLoading(false); return }
    if (quiet) setRefreshing(true); else setLoading(true)
    try { setRecord(await getRecord(kind, id)); setError('') }
    catch (cause) { setRecord(null); setError(cause instanceof Error ? cause.message : `Could not load ${title.toLowerCase()}.`) }
    finally { setLoading(false); setRefreshing(false) }
  }, [id, kind, title])

  useEffect(() => { void load(); const timer = window.setInterval(() => void load(true), 30_000); return () => window.clearInterval(timer) }, [load])

  const editFields = useMemo(() => {
    if (!record) return []
    const keys = kind === 'vehicles'
      ? ['name', 'make', 'model', 'year', 'licensePlate', 'registrationNumber', 'type', 'status', 'odometer', 'totalDistance', 'insuranceProvider', 'insurancePolicyNumber', 'insuranceExpiry', 'lastServiceDate', 'nextServiceDate']
      : ['firstName', 'lastName', 'name', 'email', 'phone', 'status', 'licenseNumber', 'licenceNumber', 'licenseClass', 'licenseExpiry', 'licenceExpiry', 'address']
    return keys.filter((key) => key in record && (typeof record[key] === 'string' || typeof record[key] === 'number'))
  }, [kind, record])

  function startEdit() { if (!record) return; setForm(Object.fromEntries(editFields.map((key) => [key, String(record[key] ?? '')]))); setFormError(''); setEditOpen(true) }
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!record) return
    const required = kind === 'vehicles' ? ['licensePlate', 'registrationNumber'] : ['firstName', 'name', 'licenseNumber', 'licenceNumber']
    if (!Object.values(form).some((value) => value.trim())) { setFormError('Enter at least one value before saving.'); return }
    if (required.some((key) => key in form && !form[key].trim())) { setFormError('Required fields cannot be empty.'); return }
    const distance = form.odometer ?? form.totalDistance
    if (distance !== undefined && distance !== '' && (!Number.isFinite(Number(distance)) || Number(distance) < 0)) { setFormError('Distance must be a non-negative number.'); return }
    const email = form.email
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFormError('Enter a valid email address.'); return }
    setSaving(true); setFormError('')
    try { setRecord(await updateRecord(kind, id, Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])))); setEditOpen(false) }
    catch (cause) { setFormError(cause instanceof Error ? cause.message : 'Could not save changes.') }
    finally { setSaving(false) }
  }
  async function remove() {
    if (!record || !window.confirm(`Delete this ${title.toLowerCase()}? This action cannot be undone.`)) return
    setDeleting(true)
    try { await deleteRecord(kind, id); navigate(kind === 'vehicles' ? '#vehicles' : '#drivers') }
    catch (cause) { setError(cause instanceof Error ? cause.message : `Could not delete ${title.toLowerCase()}.`); setDeleting(false) }
  }

  if (loading) return <section className="record-state" aria-live="polite"><span className="loading-spinner" />Loading {title.toLowerCase()} details…</section>
  if (!record) return <section className="record-state record-error"><strong>{error || `${title} not found`}</strong><p>Check the ID and try again.</p><button className="secondary-button" onClick={() => void load()}><RefreshCw size={15} /> Retry</button><button className="text-action" onClick={() => navigate(kind === 'vehicles' ? '#vehicles' : '#drivers')}><ArrowLeft size={15} /> Back to {kind}</button></section>

  const assignedVehicle = kind === 'drivers' ? relatedRecord(record, 'vehicle', 'assignedVehicle') : null
  const assignedDriver = kind === 'vehicles' ? relatedRecord(record, 'driver', 'assignedDriver') : null
  const tripList = records(record, 'trips', 'tripHistory')
  const completedTrips = tripList.filter((trip) => /complete|finished|closed/i.test(field(trip, 'status')))
  const tripDistance = tripList.reduce((total, trip) => { const distance = Number(field(trip, 'distance', 'distanceTravelled')); return total + (Number.isFinite(distance) && distance > 0 ? distance : 0) }, 0)
  const history = kind === 'vehicles' ? records(record, 'maintenanceHistory', 'maintenanceRecords', 'services') : tripList
  const details = kind === 'vehicles'
    ? [['Vehicle ID', 'id'], ['Make', 'make'], ['Model', 'model'], ['Year', 'year'], ['Type', 'type', 'vehicleType'], ['Registration', 'licensePlate', 'registrationNumber'], ['Status', 'status'], ['Total distance', 'totalDistance', 'odometer', 'mileage'], ['Insurance provider', 'insuranceProvider'], ['Policy number', 'insurancePolicyNumber', 'policyNumber'], ['Insurance expires', 'insuranceExpiry', 'insuranceExpirationDate'], ['Last service', 'lastServiceDate'], ['Next service', 'nextServiceDate']]
    : [['Driver ID', 'id'], ['Email', 'email'], ['Phone', 'phone', 'phoneNumber'], ['Status', 'status'], ['Licence number', 'licenseNumber', 'licenceNumber'], ['Licence class', 'licenseClass', 'licenceClass'], ['Licence expires', 'licenseExpiry', 'licenceExpiry', 'licenseExpirationDate'], ['Completed trips', 'completedTripsCount'], ['Total distance', 'totalDistance', 'distanceTravelled']]
  const name = kind === 'vehicles' ? field(record, 'name') || `${field(record, 'year')} ${field(record, 'make')} ${field(record, 'model')}`.trim() : field(record, 'name') || `${field(record, 'firstName')} ${field(record, 'lastName')}`.trim()

  return <div className="page-content record-content">
    <div className="record-back"><button className="text-action" onClick={() => navigate(kind === 'vehicles' ? '#vehicles' : '#drivers')}><ArrowLeft size={15} /> {kind}</button><button className="secondary-button" onClick={() => void load(true)} disabled={refreshing}><RefreshCw size={14} className={refreshing ? 'spin' : ''} /> Refresh</button></div>
    {error && <div className="inline-error" role="alert">{error}</div>}
    <section className="record-hero"><span className="record-icon">{kind === 'vehicles' ? <BusFront size={24} /> : <UserRound size={24} />}</span><div className="record-title"><div className="eyebrow"><span className="live-dot" /> {kind.toUpperCase()} DETAILS</div><h1>{name || `${title} ${id}`}</h1><p>{kind === 'vehicles' ? field(record, 'licensePlate', 'registrationNumber') : field(record, 'email', 'phone')}</p></div><div className="record-actions"><button className="secondary-button" onClick={startEdit}><Pencil size={15} /> Edit</button><button className="danger-button" onClick={() => void remove()} disabled={deleting}><Trash2 size={15} /> {deleting ? 'Deleting…' : 'Delete'}</button></div></section>
    <section className="record-grid"><article className="record-card"><h2>{title} information</h2><dl className="detail-grid">{details.map(([label, ...keys]) => { let value: unknown = keys[0] === 'id' ? record.id : keys.map((key) => record[key]).find((item) => item !== undefined); if (label === 'Completed trips' && value === undefined && tripList.length) value = completedTrips.length; if (label === 'Total distance' && value === undefined && tripDistance) value = tripDistance; return <div key={label}><dt>{label}</dt><dd>{shown(value)}</dd></div> })}</dl></article>
      <article className="record-card"><h2>Assignment</h2>{kind === 'vehicles' ? assignedDriver ? <button className="related-link" onClick={() => navigate(`#drivers/${assignedDriver.id}`)}><UserRound size={18} /><span><strong>{field(assignedDriver, 'name') || `${field(assignedDriver, 'firstName')} ${field(assignedDriver, 'lastName')}`}</strong><small>Driver · {field(assignedDriver, 'status') || 'Status unavailable'}</small></span></button> : <p className="muted">No driver is currently assigned.</p> : assignedVehicle ? <button className="related-link" onClick={() => navigate(`#vehicles/${assignedVehicle.id}`)}><BusFront size={18} /><span><strong>{field(assignedVehicle, 'name') || `${field(assignedVehicle, 'make')} ${field(assignedVehicle, 'model')}`}</strong><small>Vehicle · {field(assignedVehicle, 'licensePlate', 'registrationNumber')}</small></span></button> : <p className="muted">No vehicle is currently assigned.</p>}</article></section>
    <section className="record-card history-card"><div className="history-heading"><div><h2>{kind === 'vehicles' ? 'Maintenance history' : 'Trip history'}</h2><p>{history.length} records</p></div>{kind === 'drivers' && <span className="history-total">{completedTrips.length} completed {completedTrips.length === 1 ? 'trip' : 'trips'}</span>}</div>
      {history.length ? <div className="history-table-wrap"><table className="history-table"><thead><tr>{(kind === 'vehicles' ? ['Service', 'Description', 'Date', 'Status', 'Cost'] : ['Trip', 'Route', 'Started', 'Completed', 'Distance', 'Status']).map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{history.map((item, index) => <tr key={String(item.id ?? index)}>{(kind === 'vehicles' ? [field(item, 'type', 'serviceType', 'title') || 'Maintenance', field(item, 'description', 'notes'), dateValue(item, 'serviceDate', 'date', 'createdAt'), field(item, 'status'), field(item, 'cost')] : [field(item, 'name', 'id') || `Trip ${index + 1}`, [field(item, 'origin', 'startLocation'), field(item, 'destination', 'endLocation')].filter(Boolean).join(' → '), field(item, 'startedAt', 'startDate'), field(item, 'completedAt', 'endDate'), field(item, 'distance', 'distanceTravelled'), field(item, 'status')]).map((value, cell) => <td key={cell}>{value || '—'}</td>)}</tr>)}</tbody></table></div> : <p className="history-empty">No {kind === 'vehicles' ? 'maintenance' : 'trip'} history available.</p>}</section>
    {editOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditOpen(false) }}><section className="edit-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-title"><div className="dialog-heading"><div><h2 id="edit-title">Edit {title.toLowerCase()}</h2><p>Changes are saved to your fleet database.</p></div><button className="dialog-close" onClick={() => setEditOpen(false)} aria-label="Close">×</button></div><form onSubmit={(event) => void save(event)}><div className="edit-fields">{editFields.map((key) => <label key={key}>{humanize(key)}<input type={/date|expiry/i.test(key) ? 'date' : key === 'email' ? 'email' : 'text'} value={form[key] ?? ''} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required={['licensePlate', 'registrationNumber', 'firstName', 'name', 'licenseNumber', 'licenceNumber'].includes(key)} /></label>)}</div>{formError && <div className="inline-error" role="alert">{formError}</div>}<div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => setEditOpen(false)}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div></form></section></div>}
  </div>
}
