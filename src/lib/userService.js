// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — User Service  (shared across all modules)
// Single source of truth for user lookups, org-scoped queries
// ─────────────────────────────────────────────────────────────────────────────
import {
  db, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
} from '@/lib/firebase'

const COL = 'users'
const col = () => collection(db, COL)

// ── GET single user ───────────────────────────────────────────────────────────
export async function getUser(uid) {
  const snap = await getDoc(doc(db, COL, uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// ── LISTEN to users in an org ─────────────────────────────────────────────────
export function listenToUsers(orgId, callback, role = null) {
  const constraints = [
    where('orgId', '==', orgId),
    where('active', '==', true),
  ]
  if (role) constraints.push(where('role', '==', role))
  constraints.push(orderBy('displayName', 'asc'))

  return onSnapshot(
    query(col(), ...constraints),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err  => { console.warn('listenToUsers error:', err.message); callback([]) }
  )
}

// ── GET all users in org (one-time) ──────────────────────────────────────────
export async function getUsersByOrg(orgId) {
  try {
    const snap = await getDocs(
      query(col(), where('orgId', '==', orgId), where('active', '==', true), orderBy('displayName', 'asc'))
    )
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch { return [] }
}

// ── GET agents (IT staff who can be assigned tickets) ─────────────────────────
export async function getAgents(orgId) {
  try {
    const snap = await getDocs(
      query(col(),
        where('orgId', '==', orgId),
        where('active', '==', true),
        where('role', 'in', ['super_admin', 'it_admin', 'it_agent']),
        orderBy('displayName', 'asc')
      )
    )
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch { return [] }
}

// ── GET field engineers ───────────────────────────────────────────────────────
export async function getFieldEngineers(orgId) {
  try {
    const snap = await getDocs(
      query(col(),
        where('orgId', '==', orgId),
        where('active', '==', true),
        where('role', '==', 'field_engineer'),
        orderBy('displayName', 'asc')
      )
    )
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch { return [] }
}

// ── UPDATE user ───────────────────────────────────────────────────────────────
export async function updateUser(uid, updates) {
  await updateDoc(doc(db, COL, uid), { ...updates, updatedAt: serverTimestamp() })
}

// ── DEACTIVATE user ───────────────────────────────────────────────────────────
export async function deactivateUser(uid) {
  await updateDoc(doc(db, COL, uid), { active: false, updatedAt: serverTimestamp() })
}

// ── REACTIVATE user ───────────────────────────────────────────────────────────
export async function reactivateUser(uid) {
  await updateDoc(doc(db, COL, uid), { active: true, updatedAt: serverTimestamp() })
}

// ── Search users by name or email ─────────────────────────────────────────────
// Firestore doesn't support full-text; we fetch and filter client-side for now
export async function searchUsers(orgId, term) {
  const all = await getUsersByOrg(orgId)
  const q   = term.toLowerCase()
  return all.filter(u =>
    u.displayName?.toLowerCase().includes(q) ||
    u.email?.toLowerCase().includes(q) ||
    u.department?.toLowerCase().includes(q)
  )
}
