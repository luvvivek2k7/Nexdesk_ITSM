// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Asset Detail Page
// Full asset view: details, assignment, history, linked tickets
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Edit, Trash2, UserCheck, UserX, History, Link } from 'lucide-react'
import { getAsset, updateAsset, assignAsset, unassignAsset, deleteAsset } from '@/lib/assetService'
import { ASSET_TYPES, ASSET_STATUS } from '@/lib/constants'
import { Card, CardHeader, Badge, Button, Spinner } from '@/components/shared/index.jsx'
import { useAuth } from '@/context/AuthContext'
import { format } from 'date-fns'

export default function AssetDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user, profile, can } = useAuth()
  const [asset,   setAsset]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting,setDeleting]= useState(false)

  const load = () => getAsset(id).then(a => { setAsset(a); setLoading(false) }).catch(() => { toast.error('Asset not found'); navigate('/itam/assets') })
  useEffect(() => { load() }, [id])

  const actor = { uid: user?.uid, displayName: profile?.displayName ?? user?.email, email: user?.email }

  const handleUnassign = async () => {
    try { await unassignAsset(id, actor); toast.success('Asset unassigned'); load() }
    catch { toast.error('Failed to unassign') }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this asset permanently? This cannot be undone.')) return
    setDeleting(true)
    try { await deleteAsset(id); toast.success('Asset deleted'); navigate('/itam/assets') }
    catch { toast.error('Failed to delete'); setDeleting(false) }
  }

  const fmtDate = (val) => {
    if (!val) return '—'
    try { return format(new Date(val), 'dd MMM yyyy') } catch { return val }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (!asset)  return null

  const expDate = asset.warrantyEnd || asset.expiryDate
  const isExpiring = expDate && (new Date(expDate) - new Date()) < 30 * 86400000 && new Date(expDate) > new Date()
  const isExpired  = expDate && new Date(expDate) < new Date()

  const Row = ({ label, value }) => (
    <div className="flex justify-between py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{value || '—'}</span>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/itam/assets')} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)]"><ArrowLeft size={16} style={{ color: 'var(--text-muted)' }} /></button>
          <div>
            <div className="flex items-center gap-2">
              <code className="text-sm px-2 py-0.5 rounded font-mono" style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>{asset.assetTag}</code>
              <Badge variant={asset.status === 'ACTIVE' ? 'green' : asset.status === 'IN_REPAIR' ? 'amber' : asset.status === 'DISPOSED' ? 'red' : 'gray'}>{ASSET_STATUS[asset.status]?.label}</Badge>
              {isExpiring && <Badge variant="amber">⚠ Expiring Soon</Badge>}
              {isExpired  && <Badge variant="red">⛔ Expired</Badge>}
            </div>
            <h1 className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{asset.name}</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{ASSET_TYPES[asset.type]?.icon} {ASSET_TYPES[asset.type]?.label} {asset.brand && `· ${asset.brand}`} {asset.model && `${asset.model}`}</p>
          </div>
        </div>
        {can('MANAGE_ITAM') && (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" icon={Edit} onClick={() => navigate(`/itam/assets/${id}/edit`)}>Edit</Button>
            <Button size="sm" variant="ghost" icon={Trash2} loading={deleting} onClick={handleDelete} className="text-red-400 hover:text-red-300">Delete</Button>
          </div>
        )}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Details */}
        <Card>
          <CardHeader title="Asset Details" />
          <Row label="Serial Number"   value={asset.serialNumber} />
          <Row label="Location"        value={asset.location} />
          <Row label="Department"      value={asset.department} />
          <Row label="Purchase Date"   value={fmtDate(asset.purchaseDate)} />
          <Row label="Warranty / Expiry" value={expDate ? <span className={isExpired ? 'text-red-400' : isExpiring ? 'text-amber-400' : ''}>{fmtDate(expDate)}</span> : '—'} />
          <Row label="Purchase Cost"   value={asset.purchaseCost ? `₹${Number(asset.purchaseCost).toLocaleString()}` : null} />
          <Row label="Vendor"          value={asset.vendor} />
          <Row label="Invoice / PO"    value={asset.invoiceNo} />
        </Card>

        {/* Assignment */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Assignment" />
            {asset.assignedTo ? (
              <div>
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--accent)', color: '#fff' }}>
                    {(asset.assignedName ?? '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{asset.assignedName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Currently assigned</p>
                  </div>
                </div>
                {can('MANAGE_ITAM') && (
                  <Button size="sm" variant="ghost" icon={UserX} className="mt-3 w-full" onClick={handleUnassign}>Unassign Asset</Button>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>Not assigned to anyone</p>
                {can('MANAGE_ITAM') && (
                  <Button size="sm" icon={UserCheck} className="w-full" onClick={() => navigate(`/itam/assets/${id}/edit`)}>Assign Asset</Button>
                )}
              </div>
            )}
          </Card>

          {asset.licenseKey && (
            <Card>
              <CardHeader title="License Info" />
              <Row label="License Key" value={<code className="text-xs">{asset.licenseKey}</code>} />
              <Row label="Seats" value={asset.licenseCount} />
              <Row label="Used"  value={asset.licenseUsed ?? 0} />
              <Row label="Expiry" value={fmtDate(asset.expiryDate)} />
            </Card>
          )}

          {asset.notes && (
            <Card>
              <CardHeader title="Notes" />
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{asset.notes}</p>
            </Card>
          )}
        </div>
      </div>

      {/* History */}
      {asset.history?.length > 0 && (
        <Card>
          <CardHeader title="Asset History" icon={History} />
          <div className="space-y-0">
            {[...asset.history].reverse().map((h, i) => (
              <div key={i} className="flex gap-3 py-2.5" style={{ borderBottom: i < asset.history.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: 'var(--accent)' }} />
                <div className="flex-1">
                  <p className="text-xs" style={{ color: 'var(--text-primary)' }}>{h.note}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>by {h.by} · {h.at?.toDate ? format(h.at.toDate(), 'dd MMM yyyy HH:mm') : '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
