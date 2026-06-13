// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — HRMS Service
// Employee lifecycle, leave requests, onboarding — Firestore-backed
// ─────────────────────────────────────────────────────────────────────────────
import {
  db, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
} from '@/lib/firebase'

const EMP = 'employees'
const LVE = 'leave_requests'

// ─── EMPLOYEES ────────────────────────────────────────────────────────────────

export function listenToEmployees(orgId, callback) {
  return onSnapshot(
    query(collection(db, EMP),
      where('orgId', '==', orgId),
      orderBy('name', 'asc')
    ),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err  => { console.warn('listenToEmployees:', err.message); callback([]) }
  )
}

export async function createEmployee(orgId, data, createdBy) {
  const empId = `EMP-${Date.now().toString(36).toUpperCase()}`
  const ref = await addDoc(collection(db, EMP), {
    ...data,
    orgId,
    employeeId:    empId,
    status:        data.status ?? 'Active',
    onboardingStep:'pending_it',  // triggers IT provisioning flow
    createdBy,
    createdAt:     serverTimestamp(),
    updatedAt:     serverTimestamp(),
  })
  return ref.id
}

export async function updateEmployee(id, updates) {
  await updateDoc(doc(db, EMP, id), { ...updates, updatedAt: serverTimestamp() })
}

export async function deactivateEmployee(id) {
  await updateDoc(doc(db, EMP, id), { status: 'Inactive', active: false, updatedAt: serverTimestamp() })
}

// Get employees by department — used by ITSM for requester lookup
export async function getEmployeesByDept(orgId, department) {
  try {
    const snap = await getDocs(
      query(collection(db, EMP),
        where('orgId', '==', orgId),
        where('department', '==', department),
        where('status', '==', 'Active'),
        orderBy('name', 'asc')
      )
    )
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch { return [] }
}

// ─── LEAVE REQUESTS ───────────────────────────────────────────────────────────

export function listenToLeaveRequests(orgId, callback, employeeId = null) {
  const constraints = [where('orgId', '==', orgId), orderBy('createdAt', 'desc')]
  if (employeeId) constraints.splice(1, 0, where('employeeId', '==', employeeId))

  return onSnapshot(
    query(collection(db, LVE), ...constraints),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err  => { console.warn('listenToLeaveRequests:', err.message); callback([]) }
  )
}

export async function createLeaveRequest(orgId, data, requester) {
  return addDoc(collection(db, LVE), {
    ...data,
    orgId,
    requesterId:   requester.uid,
    requesterName: requester.displayName,
    status:        'Pending',
    createdAt:     serverTimestamp(),
    updatedAt:     serverTimestamp(),
  })
}

export async function updateLeaveStatus(id, status, approvedBy) {
  await updateDoc(doc(db, LVE, id), {
    status,
    approvedBy:    approvedBy.uid,
    approvedByName:approvedBy.displayName,
    decidedAt:     serverTimestamp(),
    updatedAt:     serverTimestamp(),
  })
}
