// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Asset Form Page (Create / Edit)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Save } from 'lucide-react'
import { createAsset, updateAsset, getAsset } from '@/lib/assetService'
import { ASSET_TYPES, ASSET_STATUS } from '@/lib/constants'
import { Card, Button, Spinner } from '@/components/shared/index.jsx'
import { useAuth } from '@/context/AuthContext'

const EMPTY = {
  type: 'LAPTOP', name: '', brand: '', model: '', serialNumber: '',
  status: 'IN_STORE', location: '', department: '', assignedTo: '', assignedName: '',
  purchaseDate: '', warrantyEnd: '', purchaseCost: '', vendor: '', invoiceNo: '',
  licenseKey: '', licenseCount: '', expiryDate: '', notes: '',
}

export default function AssetFormPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { user, profile } = useAuth()
  const isEdit    = Boolean(id) && id !== 'new'
  const [form,    setForm]    = useState(EMPTY)
  const [loading, setLoading] = useState(isEdit)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    if (!isEdit) return
    getAsset(id).then(a => { setForm({ ...EMPTY, ...a }); setLoading(false) }).catch(() => { toast.error('Asset not found'); navigate('/itam/assets') })
  }, [id])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const isSoftware = ['SOFTWARE','LICENSE','CLOUD'].includes(form.type)

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Asset name is required'); return }
    setSaving(true)
    try {
      const actor = { uid: user.uid, displayName: profile?.displayName ?? user.email, email: user.email }
      if (isEdit) {
        await updateAsset(id, { ...form, _note: 'Asset details updated' }, actor)
        toast.success('Asset updated')
      } else {
        const asset = await createAsset(form, actor)
        toast.success(`Asset ${asset.assetTag} created`)
      }
      navigate('/itam/assets')
    } catch (e) { console.error(e); toast.error('Failed to save asset') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  const F = ({ label, children, span }) => (
    <div style={span ? { gridColumn: `span ${span}` } : {}}>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  )

  const inp = (k, placeholder = '') => (
    <input value={form[k]} onChange={e => set(k, e.target.value)} placeholder={placeholder}
      className="nd-input w-full" style={{ color: 'var(--text-primary)' }} />
  )

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)]"><ArrowLeft size={16} style={{ color: 'var(--text-muted)' }} /></button>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{isEdit ? 'Edit Asset' : 'Add New Asset'}</h1>
      </div>

      <Card>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Basic Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <F label="Asset Type *">
            <select value={form.type} onChange={e => set('type', e.target.value)} className="nd-input w-full">
              {Object.entries(ASSET_TYPES).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
          </F>
          <F label="Status">
            <select value={form.status} onChange={e => set('status', e.target.value)} className="nd-input w-full">
              {Object.entries(ASSET_STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </F>
          <F label="Asset Name *" span={2}>{inp('name', 'e.g. Dell Latitude 5540 — Ravi Kumar')}</F>
          <F label="Brand">{inp('brand', 'e.g. Dell, HP, Lenovo')}</F>
          <F label="Model">{inp('model', 'e.g. Latitude 5540')}</F>
          <F label="Serial Number">{inp('serialNumber', 'S/N from device')}</F>
          <F label="Location">{inp('location', 'e.g. Chennai HQ - Floor 2')}</F>
          <F label="Department">{inp('department', 'e.g. IT, HR, Finance')}</F>
          <F label="Assigned To (Name)">{inp('assignedName', 'User display name')}</F>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Purchase & Warranty</h2>
        <div className="grid grid-cols-2 gap-4">
          <F label="Purchase Date"><input type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} className="nd-input w-full" /></F>
          <F label="Warranty End / Expiry"><input type="date" value={form.warrantyEnd || form.expiryDate} onChange={e => set(isSoftware ? 'expiryDate' : 'warrantyEnd', e.target.value)} className="nd-input w-full" /></F>
          <F label="Purchase Cost (₹)">{inp('purchaseCost', '0')}</F>
          <F label="Vendor / Supplier">{inp('vendor', 'e.g. Redington India')}</F>
          <F label="Invoice / PO Number">{inp('invoiceNo', 'INV-2024-001')}</F>
        </div>
      </Card>

      {isSoftware && (
        <Card>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>License Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="License Key" span={2}>{inp('licenseKey', 'XXXXX-XXXXX-XXXXX-XXXXX')}</F>
            <F label="License Count (seats)">{inp('licenseCount', 'e.g. 50')}</F>
            <F label="Expiry Date"><input type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} className="nd-input w-full" /></F>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Notes</h2>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes about this asset…"
          rows={3} className="nd-input w-full resize-none" />
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
        <Button icon={Save} loading={saving} onClick={handleSubmit}>{isEdit ? 'Save Changes' : 'Create Asset'}</Button>
      </div>
    </div>
  )
}
