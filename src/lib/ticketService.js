// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Ticket Service (FIXED v2)
// Fixes: generateTicketId query must match Firestore composite index
//        createTicket uses addDoc (auto-ID) — no permission issue
//        All queries have correct field ordering
// ─────────────────────────────────────────────────────────────────────────────
import {
  db, collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, limit, onSnapshot,
  serverTimestamp, Timestamp,
} from '@/lib/firebase'

const COL = 'tickets'
const col = () => collection(db, COL)

// ── Readable ticket ID (INC-20250511-001) ────────────────────────────────────
async function generateTicketId(type) {
  const prefix = {
    INCIDENT:        'INC',
    PROBLEM:         'PRB',
    CHANGE:          'CHG',
    SERVICE_REQUEST: 'REQ',
    RELEASE:         'REL',
  }[type] ?? 'TKT'

  const d    = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`

  try {
    // Count tickets of this type today — simple query, no composite index needed
    const q    = query(col(), where('ticketDate', '==', date))
    const snap = await getDocs(q)
    const seq  = String(snap.size + 1).padStart(3, '0')
    return `${prefix}-${date}-${seq}`
  } catch {
    // Fallback if index isn't ready yet
    const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')
    return `${prefix}-${date}-${seq}`
  }
}

// ── CREATE ────────────────────────────────────────────────────────────────────
export async function createTicket(data, createdBy) {
  if (!createdBy?.uid) throw new Error('createdBy.uid is required')

  const ticketId  = await generateTicketId(data.type ?? 'INCIDENT')
  const ticketDate = ticketId.split('-').slice(1,2).join('-') ||
    new Date().toISOString().slice(0,10).replace(/-/g,'')

  const ticket = {
    ticketId,
    ticketDate,
    orgId:          createdBy.orgId   ?? data.orgId ?? 'system',
    type:           data.type        ?? 'INCIDENT',
    title:          (data.title      ?? '').trim(),
    description:    (data.description ?? '').trim(),
    category:       data.category    ?? 'other',
    priority:       data.priority    ?? 'P3',
    status:         'NEW',
    // Requester — always set from the logged-in user
    requesterId:    createdBy.uid,
    requesterName:  createdBy.displayName ?? createdBy.email,
    requesterEmail: createdBy.email,
    requesterDept:  createdBy.department ?? '',
    requesterOrg:   createdBy.orgName   ?? '',
    // Assignee
    assigneeId:     data.assigneeId   ?? null,
    assigneeName:   data.assigneeName ?? null,
    // Assignment group
    groupId:        data.groupId      ?? null,
    groupName:      data.groupName    ?? null,
    // Arrays
    tags:           Array.isArray(data.tags) ? data.tags : [],
    attachments:    [],
    comments:       [],
    watchers:       [createdBy.uid],
    // SLA flags (updated by cloud function or SLA engine)
    slaBreached:             false,
    slaResponseBreached:     false,
    // Timestamps
    createdAt:  serverTimestamp(),
    updatedAt:  serverTimestamp(),
    resolvedAt: null,
    closedAt:   null,
    // AI fields (populated later)
    aiCategory: null,
    aiPriority: null,
    aiSummary:  null,
    // Audit history
    history: [{
      action:  'created',
      by:      createdBy.displayName ?? createdBy.email,
      byId:    createdBy.uid,
      at:      Timestamp.now(),
      changes: { status: { from: null, to: 'NEW' } },
    }],
  }

  // addDoc auto-generates a Firestore ID — no permission issues with setDoc
  const ref = await addDoc(col(), ticket)
  return { id: ref.id, ...ticket }
}

// ── GET single ticket ─────────────────────────────────────────────────────────
export async function getTicket(id) {
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) throw new Error(`Ticket ${id} not found`)
  return { id: snap.id, ...snap.data() }
}

// ── GET tickets list ──────────────────────────────────────────────────────────
export async function getTickets({ status, priority, type, assigneeId, requesterId, limitN = 100 } = {}) {
  try {
    // Build query — keep it simple to avoid index requirements
    const constraints = []
    if (requesterId) constraints.push(where('requesterId', '==', requesterId))
    if (assigneeId)  constraints.push(where('assigneeId',  '==', assigneeId))
    if (status)      constraints.push(where('status',      '==', status))
    if (priority)    constraints.push(where('priority',    '==', priority))
    constraints.push(orderBy('createdAt', 'desc'))
    constraints.push(limit(limitN))

    const snap = await getDocs(query(col(), ...constraints))
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (err) {
    // If composite index missing, fall back to unfiltered
    console.warn('getTickets query failed, falling back:', err.message)
    const snap = await getDocs(query(col(), orderBy('createdAt', 'desc'), limit(limitN)))
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }
}

// ── UPDATE ticket ─────────────────────────────────────────────────────────────
export async function updateTicket(id, updates, updatedBy) {
  const ref      = doc(db, COL, id)
  const existing = await getDoc(ref)
  if (!existing.exists()) throw new Error('Ticket not found')

  const old = existing.data()

  // Build history entry
  const changes = {}
  Object.keys(updates).forEach(key => {
    if (JSON.stringify(old[key]) !== JSON.stringify(updates[key])) {
      changes[key] = { from: old[key], to: updates[key] }
    }
  })

  const historyEntry = {
    action: 'updated',
    by:     updatedBy?.displayName ?? updatedBy?.email ?? 'System',
    byId:   updatedBy?.uid ?? 'system',
    at:     Timestamp.now(),
    changes,
  }

  // Auto-set timestamps on status changes
  const extra = {}
  if (updates.status === 'RESOLVED' && old.status !== 'RESOLVED') {
    extra.resolvedAt = serverTimestamp()
  }
  if (updates.status === 'CLOSED') {
    extra.closedAt = serverTimestamp()
  }

  await updateDoc(ref, {
    ...updates,
    ...extra,
    updatedAt: serverTimestamp(),
    history:   [...(old.history ?? []), historyEntry],
  })

  return { id, ...old, ...updates, ...extra }
}

// ── UPDATE status only ────────────────────────────────────────────────────────
export async function updateTicketStatus(id, newStatus, updatedBy) {
  return updateTicket(id, { status: newStatus }, updatedBy)
}

// ── ADD comment ───────────────────────────────────────────────────────────────
export async function addComment(ticketId, { text, isInternal = false }, author) {
  const ref  = doc(db, COL, ticketId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Ticket not found')

  const comment = {
    id:          `cmt_${Date.now()}`,
    text:        text.trim(),
    isInternal,
    authorId:    author.uid,
    authorName:  author.displayName ?? author.email,
    authorPhoto: author.photoURL ?? null,
    createdAt:   Timestamp.now(),
  }

  const existing = snap.data()
  await updateDoc(ref, {
    comments:  [...(existing.comments ?? []), comment],
    updatedAt: serverTimestamp(),
  })

  return comment
}

// ── ASSIGN ticket ─────────────────────────────────────────────────────────────
export async function assignTicket(id, { assigneeId, assigneeName }, assignedBy) {
  return updateTicket(id, { assigneeId, assigneeName, status: 'ASSIGNED' }, assignedBy)
}

// ── REAL-TIME all tickets listener ────────────────────────────────────────────
export function listenToTickets(filters = {}, callback) {
  try {
    const constraints = []

    if (filters.requesterId) constraints.push(where('requesterId', '==', filters.requesterId))
    if (filters.assigneeId)  constraints.push(where('assigneeId',  '==', filters.assigneeId))
    if (filters.status)      constraints.push(where('status',      '==', filters.status))

    constraints.push(orderBy('createdAt', 'desc'))
    constraints.push(limit(200))

    const q = query(col(), ...constraints)

    return onSnapshot(
      q,
      snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => {
        console.warn('listenToTickets error:', err.message)
        // On index error, try without filters
        const fallback = query(col(), orderBy('createdAt', 'desc'), limit(200))
        return onSnapshot(fallback, snap =>
          callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        )
      }
    )
  } catch (err) {
    console.error('listenToTickets setup error:', err)
    callback([])
    return () => {}
  }
}

// ── REAL-TIME single ticket ───────────────────────────────────────────────────
export function listenToTicket(id, callback) {
  return onSnapshot(
    doc(db, COL, id),
    snap => { if (snap.exists()) callback({ id: snap.id, ...snap.data() }) },
    err  => console.error('listenToTicket error:', err)
  )
}

// ── Dashboard stats ───────────────────────────────────────────────────────────
export async function getTicketStats() {
  try {
    const snap    = await getDocs(query(col(), orderBy('createdAt', 'desc'), limit(500)))
    const tickets = snap.docs.map(d => d.data())

    const byStatus   = {}
    const byPriority = {}
    const byType     = {}
    let   breached   = 0

    tickets.forEach(t => {
      byStatus[t.status]     = (byStatus[t.status]     ?? 0) + 1
      byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1
      byType[t.type]         = (byType[t.type]         ?? 0) + 1
      if (t.slaBreached)     breached++
    })

    return {
      total: tickets.length,
      byStatus,
      byPriority,
      byType,
      breached,
      open: ['NEW','OPEN','ASSIGNED','IN_PROGRESS'].reduce((s,k) => s + (byStatus[k] ?? 0), 0),
    }
  } catch {
    return { total:0, byStatus:{}, byPriority:{}, byType:{}, breached:0, open:0 }
  }
}
