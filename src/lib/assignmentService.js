// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Assignment Group Service
// CRUD for assignment groups + member management + notification dispatch
// ─────────────────────────────────────────────────────────────────────────────
import {
  db, collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy, onSnapshot,
  serverTimestamp, Timestamp,
} from '@/lib/firebase'

const COL = 'assignment_groups'

// ── CREATE group ──────────────────────────────────────────────────────────────
export async function createGroup(data, createdBy) {
  const ref = await addDoc(collection(db, COL), {
    name:        data.name,
    description: data.description ?? '',
    category:    data.category ?? '',      // auto-route tickets of this category
    type:        data.type ?? '',          // auto-route tickets of this type
    members:     data.members ?? [],       // [{ uid, name, email, role }]
    active:      true,
    createdBy:   createdBy.uid,
    createdByName: createdBy.displayName ?? createdBy.email,
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
  })
  return ref.id
}

// ── GET all groups ────────────────────────────────────────────────────────────
export async function getGroups(orgId = null) {
  try {
    const q    = orgId ? query(collection(db, COL), where('orgId', '==', orgId)) : collection(db, COL)
    const snap = await getDocs(q)
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    return data.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
  } catch (err) { console.warn('getGroups:', err.message); return [] }
}

// ── GET single group ──────────────────────────────────────────────────────────
export async function getGroup(id) {
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) throw new Error('Group not found')
  return { id: snap.id, ...snap.data() }
}

// ── UPDATE group ──────────────────────────────────────────────────────────────
export async function updateGroup(id, updates) {
  await updateDoc(doc(db, COL, id), { ...updates, updatedAt: serverTimestamp() })
}

// ── DELETE group ──────────────────────────────────────────────────────────────
export async function deleteGroup(id) {
  await deleteDoc(doc(db, COL, id))
}

// ── ADD member to group ───────────────────────────────────────────────────────
export async function addMember(groupId, member) {
  const ref  = doc(db, COL, groupId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Group not found')
  const existing = snap.data().members ?? []
  if (existing.find(m => m.uid === member.uid)) throw new Error('User already in group')
  await updateDoc(ref, {
    members:   [...existing, { uid: member.uid, name: member.name, email: member.email, role: member.role ?? 'agent' }],
    updatedAt: serverTimestamp(),
  })
}

// ── REMOVE member ─────────────────────────────────────────────────────────────
export async function removeMember(groupId, uid) {
  const ref  = doc(db, COL, groupId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Group not found')
  await updateDoc(ref, {
    members:   (snap.data().members ?? []).filter(m => m.uid !== uid),
    updatedAt: serverTimestamp(),
  })
}

// ── Real-time listener ────────────────────────────────────────────────────────
export function listenToGroups(callback, onError, orgId = null) {
  // Sort client-side to avoid composite index requirement until indexes deploy
  const q = orgId
    ? query(collection(db, COL), where('orgId', '==', orgId))
    : collection(db, COL)

  return onSnapshot(q,
    snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      data.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
      callback(data)
    },
    err => { console.warn('listenToGroups:', err.message); onError?.(err) }
  )
}

// ── NOTIFICATION dispatch ─────────────────────────────────────────────────────
// Creates notification docs in Firestore for each target uid
export async function sendNotification({ userIds, type, title, body, ticketId, ticketRef }) {
  const batch = userIds.map(uid =>
    addDoc(collection(db, 'notifications'), {
      userId:    uid,
      type,
      title,
      body,
      ticketId:  ticketId ?? null,
      ticketRef: ticketRef ?? null,
      read:      false,
      createdAt: serverTimestamp(),
    })
  )
  await Promise.all(batch)
}
