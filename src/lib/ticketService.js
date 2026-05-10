// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Ticket Service
// All Firestore operations for tickets: create, read, update, real-time listen
// ─────────────────────────────────────────────────────────────────────────────
import {
  db, collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, limit, onSnapshot,
  serverTimestamp, Timestamp,
} from '@/lib/firebase'
import { TICKET_STATUS } from '@/lib/constants'

const COLLECTION = 'tickets'
const ref = () => collection(db, COLLECTION)

// ── ID generator (readable: INC-YYYYMMDD-NNN) ────────────────────────────────
async function generateTicketId(type) {
  const prefix = {
    INCIDENT:        'INC',
    PROBLEM:         'PRB',
    CHANGE:          'CHG',
    SERVICE_REQUEST: 'REQ',
    RELEASE:         'REL',
  }[type] ?? 'TKT'

  const today = new Date()
  const date  = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`

  // Count today's tickets of this type
  const q     = query(ref(), where('ticketDate', '==', date), where('type', '==', type))
  const snap  = await getDocs(q)
  const seq   = String(snap.size + 1).padStart(3, '0')

  return `${prefix}-${date}-${seq}`
}

// ── CREATE ticket ─────────────────────────────────────────────────────────────
export async function createTicket(data, createdBy) {
  const ticketId  = await generateTicketId(data.type)
  const today     = new Date()
  const ticketDate = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`

  const ticket = {
    ticketId,
    ticketDate,
    type:         data.type       ?? 'INCIDENT',
    title:        data.title,
    description:  data.description ?? '',
    category:     data.category   ?? 'other',
    priority:     data.priority   ?? 'P3',
    status:       'NEW',
    requesterId:  createdBy.uid,
    requesterName:createdBy.displayName ?? createdBy.email,
    requesterEmail:createdBy.email,
    assigneeId:   data.assigneeId ?? null,
    assigneeName: data.assigneeName ?? null,
    tags:         data.tags ?? [],
    attachments:  [],
    comments:     [],
    watchers:     [createdBy.uid],
    // SLA
    slaBreached:  false,
    slaResponseBreached: false,
    // Timestamps
    createdAt:    serverTimestamp(),
    updatedAt:    serverTimestamp(),
    resolvedAt:   null,
    closedAt:     null,
    // AI fields
    aiCategory:   null,
    aiPriority:   null,
    aiSummary:    null,
    // Audit
    history: [{
      action:    'created',
      by:        createdBy.displayName ?? createdBy.email,
      byId:      createdBy.uid,
      at:        Timestamp.now(),
      changes:   { status: { from: null, to: 'NEW' } },
    }],
  }

  const docRef = await addDoc(ref(), ticket)
  return { id: docRef.id, ticketId, ...ticket }
}

// ── GET single ticket ─────────────────────────────────────────────────────────
export async function getTicket(id) {
  const snap = await getDoc(doc(db, COLLECTION, id))
  if (!snap.exists()) throw new Error('Ticket not found')
  return { id: snap.id, ...snap.data() }
}

// ── GET tickets (with filters) ────────────────────────────────────────────────
export async function getTickets({ status, priority, type, assigneeId, requesterId, limitN = 50 } = {}) {
  const constraints = [orderBy('createdAt', 'desc')]

  if (status)      constraints.unshift(where('status',      '==', status))
  if (priority)    constraints.unshift(where('priority',    '==', priority))
  if (type)        constraints.unshift(where('type',        '==', type))
  if (assigneeId)  constraints.unshift(where('assigneeId',  '==', assigneeId))
  if (requesterId) constraints.unshift(where('requesterId', '==', requesterId))

  constraints.push(limit(limitN))

  const snap = await getDocs(query(ref(), ...constraints))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── UPDATE ticket ─────────────────────────────────────────────────────────────
export async function updateTicket(id, updates, updatedBy) {
  const ticketRef = doc(db, COLLECTION, id)
  const existing  = await getDoc(ticketRef)
  if (!existing.exists()) throw new Error('Ticket not found')

  const old = existing.data()

  // Build history entry
  const changes = {}
  Object.keys(updates).forEach(key => {
    if (old[key] !== updates[key]) {
      changes[key] = { from: old[key], to: updates[key] }
    }
  })

  const historyEntry = {
    action:  'updated',
    by:      updatedBy?.displayName ?? updatedBy?.email ?? 'System',
    byId:    updatedBy?.uid ?? 'system',
    at:      Timestamp.now(),
    changes,
  }

  // Special timestamps
  if (updates.status === 'RESOLVED' && old.status !== 'RESOLVED') {
    updates.resolvedAt = serverTimestamp()
  }
  if (updates.status === 'CLOSED') {
    updates.closedAt = serverTimestamp()
  }

  await updateDoc(ticketRef, {
    ...updates,
    updatedAt: serverTimestamp(),
    history:   [...(old.history ?? []), historyEntry],
  })

  return { id, ...old, ...updates }
}

// ── UPDATE status ─────────────────────────────────────────────────────────────
export async function updateTicketStatus(id, newStatus, updatedBy) {
  const allowed = TICKET_STATUS[newStatus]
  if (!allowed) throw new Error(`Invalid status: ${newStatus}`)
  return updateTicket(id, { status: newStatus }, updatedBy)
}

// ── ADD comment ───────────────────────────────────────────────────────────────
export async function addComment(ticketId, { text, isInternal = false }, author) {
  const ticketRef = doc(db, COLLECTION, ticketId)
  const snap      = await getDoc(ticketRef)
  if (!snap.exists()) throw new Error('Ticket not found')

  const comment = {
    id:         `cmt_${Date.now()}`,
    text,
    isInternal,
    authorId:   author.uid,
    authorName: author.displayName ?? author.email,
    authorPhoto:author.photoURL ?? null,
    createdAt:  Timestamp.now(),
  }

  const existing = snap.data()
  await updateDoc(ticketRef, {
    comments:  [...(existing.comments ?? []), comment],
    updatedAt: serverTimestamp(),
  })

  return comment
}

// ── ASSIGN ticket ─────────────────────────────────────────────────────────────
export async function assignTicket(id, { assigneeId, assigneeName }, assignedBy) {
  return updateTicket(id, {
    assigneeId,
    assigneeName,
    status: 'ASSIGNED',
  }, assignedBy)
}

// ── REAL-TIME listener ────────────────────────────────────────────────────────
export function listenToTickets(filters = {}, callback) {
  const constraints = [orderBy('createdAt', 'desc'), limit(100)]

  if (filters.status)     constraints.unshift(where('status',     '==', filters.status))
  if (filters.priority)   constraints.unshift(where('priority',   '==', filters.priority))
  if (filters.type)       constraints.unshift(where('type',       '==', filters.type))
  if (filters.assigneeId) constraints.unshift(where('assigneeId', '==', filters.assigneeId))

  const q = query(ref(), ...constraints)
  return onSnapshot(q, (snap) => {
    const tickets = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(tickets)
  })
}

// ── REAL-TIME single ticket listener ─────────────────────────────────────────
export function listenToTicket(id, callback) {
  return onSnapshot(doc(db, COLLECTION, id), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() })
  })
}

// ── Dashboard stats (aggregated) ──────────────────────────────────────────────
export async function getTicketStats() {
  const all = await getDocs(query(ref(), orderBy('createdAt', 'desc'), limit(500)))
  const tickets = all.docs.map(d => d.data())

  const byStatus   = {}
  const byPriority = {}
  const byType     = {}
  let   breached   = 0
  let   resolvedToday = 0
  const today      = new Date().toDateString()

  tickets.forEach(t => {
    byStatus[t.status]     = (byStatus[t.status]     ?? 0) + 1
    byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1
    byType[t.type]         = (byType[t.type]         ?? 0) + 1
    if (t.slaBreached)     breached++
    if (t.status === 'RESOLVED' && t.resolvedAt?.toDate?.()?.toDateString?.() === today) resolvedToday++
  })

  return {
    total:       tickets.length,
    byStatus,
    byPriority,
    byType,
    breached,
    resolvedToday,
    open: (byStatus.NEW ?? 0) + (byStatus.OPEN ?? 0) + (byStatus.ASSIGNED ?? 0) + (byStatus.IN_PROGRESS ?? 0),
  }
}
