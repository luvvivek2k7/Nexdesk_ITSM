// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Asset Service (ITAM)
// Firestore CRUD for assets, assignments, lifecycle events
// ─────────────────────────────────────────────────────────────────────────────
import {
  db, collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy, limit,
  onSnapshot, serverTimestamp, Timestamp,
} from '@/lib/firebase'

const COL = 'assets'
const ref = () => collection(db, COL)

// ── Generate asset tag ────────────────────────────────────────────────────────
async function generateAssetTag(type) {
  const prefix = type.substring(0, 3).toUpperCase()
  const counterRef  = doc(db, 'meta', `asset_counter_${type}`)
  const counterSnap = await getDoc(counterRef)
  const seq = (counterSnap.exists() ? (counterSnap.data().count ?? 0) : 0) + 1
  await setDoc(counterRef, { count: seq }, { merge: true })
  return `${prefix}-${String(seq).padStart(5, '0')}`
}

// ── CREATE asset ──────────────────────────────────────────────────────────────
export async function createAsset(data, createdBy) {
  const assetTag = await generateAssetTag(data.type ?? 'OTHER')
  const asset = {
    assetTag,
    type:         data.type        ?? 'OTHER',
    name:         data.name,
    brand:        data.brand       ?? '',
    model:        data.model       ?? '',
    serialNumber: data.serialNumber ?? '',
    status:       data.status      ?? 'IN_STORE',
    location:     data.location    ?? '',
    department:   data.department  ?? '',
    assignedTo:   data.assignedTo  ?? null,   // userId
    assignedName: data.assignedName ?? null,
    purchaseDate: data.purchaseDate ?? null,
    warrantyEnd:  data.warrantyEnd  ?? null,
    purchaseCost: data.purchaseCost ?? null,
    vendor:       data.vendor       ?? '',
    invoiceNo:    data.invoiceNo    ?? '',
    notes:        data.notes        ?? '',
    // Software/License specific
    licenseKey:   data.licenseKey   ?? '',
    licenseCount: data.licenseCount ?? null,
    licenseUsed:  data.licenseUsed  ?? 0,
    expiryDate:   data.expiryDate   ?? null,
    // Audit
    createdBy:    createdBy.uid,
    createdByName: createdBy.displayName ?? createdBy.email,
    createdAt:    serverTimestamp(),
    updatedAt:    serverTimestamp(),
    history: [{
      action: 'created',
      by: createdBy.displayName ?? createdBy.email,
      byId: createdBy.uid,
      at: Timestamp.now(),
      note: 'Asset created',
    }],
  }
  const docRef = await addDoc(ref(), asset)
  return { id: docRef.id, ...asset }
}

// ── GET asset ─────────────────────────────────────────────────────────────────
export async function getAsset(id) {
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) throw new Error('Asset not found')
  return { id: snap.id, ...snap.data() }
}

// ── GET assets ────────────────────────────────────────────────────────────────
export async function getAssets({ type, status, assignedTo, department } = {}) {
  const constraints = [orderBy('createdAt', 'desc')]
  if (type)       constraints.unshift(where('type',       '==', type))
  if (status)     constraints.unshift(where('status',     '==', status))
  if (assignedTo) constraints.unshift(where('assignedTo', '==', assignedTo))
  if (department) constraints.unshift(where('department', '==', department))
  const snap = await getDocs(query(ref(), ...constraints))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── UPDATE asset ──────────────────────────────────────────────────────────────
export async function updateAsset(id, updates, updatedBy) {
  const assetRef = doc(db, COL, id)
  const existing = await getDoc(assetRef)
  if (!existing.exists()) throw new Error('Asset not found')
  const old = existing.data()
  const historyEntry = {
    action: 'updated',
    by: updatedBy?.displayName ?? updatedBy?.email ?? 'System',
    byId: updatedBy?.uid ?? 'system',
    at: Timestamp.now(),
    note: updates._note ?? 'Asset updated',
  }
  const { _note, ...cleanUpdates } = updates
  await updateDoc(assetRef, {
    ...cleanUpdates,
    updatedAt: serverTimestamp(),
    history: [...(old.history ?? []), historyEntry],
  })
  return { id, ...old, ...cleanUpdates }
}

// ── ASSIGN asset ──────────────────────────────────────────────────────────────
export async function assignAsset(id, { userId, userName }, assignedBy) {
  return updateAsset(id, {
    assignedTo: userId,
    assignedName: userName,
    status: 'ACTIVE',
    _note: `Assigned to ${userName}`,
  }, assignedBy)
}

// ── UNASSIGN asset ────────────────────────────────────────────────────────────
export async function unassignAsset(id, unassignedBy) {
  return updateAsset(id, {
    assignedTo: null,
    assignedName: null,
    status: 'IN_STORE',
    _note: 'Unassigned — returned to store',
  }, unassignedBy)
}

// ── DELETE asset ──────────────────────────────────────────────────────────────
export async function deleteAsset(id) {
  await deleteDoc(doc(db, COL, id))
}

// ── REAL-TIME listener ────────────────────────────────────────────────────────
export function listenToAssets(filters = {}, callback, onError) {
  const constraints = [orderBy('createdAt', 'desc'), limit(200)]
  if (filters.type)   constraints.unshift(where('type',   '==', filters.type))
  if (filters.status) constraints.unshift(where('status', '==', filters.status))
  const q = query(ref(), ...constraints)
  return onSnapshot(q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => { console.error('listenToAssets:', err); onError?.(err) }
  )
}

// ── STATS ─────────────────────────────────────────────────────────────────────
export async function getAssetStats() {
  const snap = await getDocs(query(ref(), orderBy('createdAt', 'desc'), limit(500)))
  const assets = snap.docs.map(d => d.data())
  const byType = {}
  const byStatus = {}
  let totalCost = 0
  let expiringSoon = 0
  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 86400000)

  assets.forEach(a => {
    byType[a.type]     = (byType[a.type]     ?? 0) + 1
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1
    if (a.purchaseCost) totalCost += Number(a.purchaseCost)
    const expDate = a.warrantyEnd || a.expiryDate
    if (expDate) {
      const d = new Date(expDate)
      if (d > now && d < in30) expiringSoon++
    }
  })

  return {
    total: assets.length,
    byType, byStatus, totalCost, expiringSoon,
    assigned: assets.filter(a => a.assignedTo).length,
    active:   assets.filter(a => a.status === 'ACTIVE').length,
  }
}
