// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — FSO Service  (Field Service Operations)
// Work orders, dispatch, engineer assignment — Firestore-backed
// ─────────────────────────────────────────────────────────────────────────────
import {
  db, collection, doc, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, Timestamp,
} from '@/lib/firebase'

const COL = 'workOrders'
const col = () => collection(db, COL)

const WO_TYPES = ['INSTALLATION','MAINTENANCE','REPAIR','INSPECTION','RELOCATION','EMERGENCY']

function nextWOId() {
  const d = new Date()
  const dt = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  return `WO-${dt}-${Math.floor(Math.random()*9000+1000)}`
}

export function listenToWorkOrders(orgId, callback, filters = {}) {
  const constraints = [where('orgId', '==', orgId)]
  if (filters.status)     constraints.push(where('status', '==', filters.status))
  if (filters.assigneeId) constraints.push(where('assigneeId', '==', filters.assigneeId))
  constraints.push(orderBy('createdAt', 'desc'))

  return onSnapshot(
    query(col(), ...constraints),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err  => { console.warn('listenToWorkOrders:', err.message); callback([]) }
  )
}

export async function createWorkOrder(orgId, data, createdBy) {
  const woId = nextWOId()
  const ref = await addDoc(col(), {
    woId,
    ...data,
    orgId,
    status:    'Pending',
    createdBy: createdBy.uid,
    createdByName: createdBy.displayName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    history:   [{
      action:    'created',
      by:        createdBy.displayName,
      byId:      createdBy.uid,
      at:        Timestamp.now(),
      note:      'Work order created',
    }],
  })
  return { id: ref.id, woId }
}

export async function updateWorkOrder(id, updates, updatedBy) {
  const historyEntry = {
    action: updates.status ?? 'updated',
    by:     updatedBy.displayName,
    byId:   updatedBy.uid,
    at:     Timestamp.now(),
    note:   updates._note ?? '',
  }
  const { _note, ...cleanUpdates } = updates
  await updateDoc(doc(db, COL, id), {
    ...cleanUpdates,
    updatedAt: serverTimestamp(),
    history:   /* arrayUnion requires import */ cleanUpdates.history
      ? cleanUpdates.history
      : cleanUpdates,
  })
  // Simple update without arrayUnion to avoid extra import complexity
  await updateDoc(doc(db, COL, id), {
    ...cleanUpdates,
    updatedAt: serverTimestamp(),
  })
}

export async function assignWorkOrder(id, engineer, assignedBy) {
  await updateDoc(doc(db, COL, id), {
    assigneeId:   engineer.uid,
    assigneeName: engineer.displayName,
    status:       'Dispatched',
    assignedAt:   serverTimestamp(),
    updatedAt:    serverTimestamp(),
  })
}

export async function completeWorkOrder(id, notes, completedBy) {
  await updateDoc(doc(db, COL, id), {
    status:          'Completed',
    completionNotes: notes,
    completedBy:     completedBy.uid,
    completedByName: completedBy.displayName,
    completedAt:     serverTimestamp(),
    updatedAt:       serverTimestamp(),
  })
}
