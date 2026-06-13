// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Visitor Management Service
// Pre-registration, check-in, check-out, badge tracking — Firestore-backed
// ─────────────────────────────────────────────────────────────────────────────
import {
  db, collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, Timestamp,
} from '@/lib/firebase'

const COL = 'visitors'
const col = () => collection(db, COL)

function nextVisitorId() {
  const d = new Date()
  return `VIS-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*900+100)}`
}

function nextBadgeNumber() {
  return `B-${Math.floor(Math.random()*900+100)}`
}

export function listenToVisitors(orgId, callback, dateStr = null) {
  const constraints = [where('orgId', '==', orgId)]
  if (dateStr) constraints.push(where('visitDate', '==', dateStr))
  constraints.push(orderBy('createdAt', 'desc'))
  constraints.push(limit(100))

  return onSnapshot(
    query(col(), ...constraints),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err  => { console.warn('listenToVisitors:', err.message); callback([]) }
  )
}

export async function preRegisterVisitor(orgId, data, registeredBy) {
  const visitorId = nextVisitorId()
  const ref = await addDoc(col(), {
    visitorId,
    ...data,
    orgId,
    status:         'Pre-Registered',
    badge:          null,
    checkinTime:    null,
    checkoutTime:   null,
    registeredBy:   registeredBy.uid,
    registeredByName: registeredBy.displayName,
    createdAt:      serverTimestamp(),
    updatedAt:      serverTimestamp(),
  })
  return { id: ref.id, visitorId }
}

export async function checkInVisitor(id, checkedInBy) {
  const badge = nextBadgeNumber()
  await updateDoc(doc(db, COL, id), {
    status:       'Checked In',
    badge,
    checkinTime:  serverTimestamp(),
    checkedInBy:  checkedInBy.uid,
    checkedInByName: checkedInBy.displayName,
    updatedAt:    serverTimestamp(),
  })
  return badge
}

export async function checkOutVisitor(id, checkedOutBy) {
  await updateDoc(doc(db, COL, id), {
    status:        'Checked Out',
    checkoutTime:  serverTimestamp(),
    checkedOutBy:  checkedOutBy.uid,
    checkedOutByName: checkedOutBy.displayName,
    updatedAt:     serverTimestamp(),
  })
}

export async function revokeVisitorBadge(id) {
  await updateDoc(doc(db, COL, id), {
    status:    'Badge Revoked',
    badge:     null,
    updatedAt: serverTimestamp(),
  })
}
