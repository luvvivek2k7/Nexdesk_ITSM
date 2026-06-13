// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — IAM Service  (Identity & Access Management)
// Access requests, approvals, entitlements — Firestore-backed
// ─────────────────────────────────────────────────────────────────────────────
import {
  db, collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, onSnapshot, serverTimestamp, Timestamp,
} from '@/lib/firebase'

const COL = 'accessRequests'
const col = () => collection(db, COL)

export function listenToAccessRequests(orgId, callback, filters = {}) {
  const constraints = [where('orgId', '==', orgId)]
  if (filters.requesterId) constraints.push(where('requesterId', '==', filters.requesterId))
  if (filters.status)      constraints.push(where('status',      '==', filters.status))
  constraints.push(orderBy('createdAt', 'desc'))

  return onSnapshot(
    query(col(), ...constraints),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err  => { console.warn('listenToAccessRequests:', err.message); callback([]) }
  )
}

export async function createAccessRequest(orgId, data, requester) {
  const reqId = `AR-${Date.now().toString(36).toUpperCase()}`
  const ref = await addDoc(col(), {
    reqId,
    ...data,
    orgId,
    requesterId:   requester.uid,
    requesterName: requester.displayName,
    requesterDept: requester.department ?? '',
    status:        'Pending',
    riskScore:     calculateRisk(data),
    createdAt:     serverTimestamp(),
    updatedAt:     serverTimestamp(),
    timeline: [{
      action:  'submitted',
      by:      requester.displayName,
      byId:    requester.uid,
      at:      Timestamp.now(),
    }],
  })
  return { id: ref.id, reqId }
}

export async function approveRequest(id, approver, comment = '') {
  await updateDoc(doc(db, COL, id), {
    status:          'Approved',
    approverId:      approver.uid,
    approverName:    approver.displayName,
    approvalComment: comment,
    decidedAt:       serverTimestamp(),
    updatedAt:       serverTimestamp(),
  })
}

export async function rejectRequest(id, approver, reason = '') {
  await updateDoc(doc(db, COL, id), {
    status:       'Rejected',
    approverId:   approver.uid,
    approverName: approver.displayName,
    rejectReason: reason,
    decidedAt:    serverTimestamp(),
    updatedAt:    serverTimestamp(),
  })
}

// Basic risk scoring — higher = more review needed
function calculateRisk(data) {
  let score = 0
  if (data.accessLevel === 'Admin')     score += 40
  if (data.accessLevel === 'Read-Write') score += 20
  if (data.duration    === 'Permanent') score += 20
  if (data.system?.toLowerCase().includes('prod')) score += 20
  return Math.min(score, 100)
}
