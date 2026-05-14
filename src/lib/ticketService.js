// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Ticket Service  v2
// Full CRUD + history + notifications on every state change
// ─────────────────────────────────────────────────────────────────────────────
import {
  db, collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy, limit,
  onSnapshot, serverTimestamp, Timestamp,
} from '@/lib/firebase'
import { TICKET_STATUS } from '@/lib/constants'
import { sendNotification } from '@/lib/assignmentService'

const COLLECTION = 'tickets'
const ref = () => collection(db, COLLECTION)

// ── Ticket ID counter (meta collection, permission-safe) ─────────────────────
async function generateTicketId(type) {
  const prefix = { INCIDENT:'INC', PROBLEM:'PRB', CHANGE:'CHG', SERVICE_REQUEST:'REQ', RELEASE:'REL' }[type] ?? 'TKT'
  const today  = new Date()
  const date   = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`
  const cRef   = doc(db, 'meta', `counter_${type}_${date}`)
  const cSnap  = await getDoc(cRef)
  const seq    = (cSnap.exists() ? (cSnap.data().count ?? 0) : 0) + 1
  await setDoc(cRef, { count: seq, type, date }, { merge: true })
  return `${prefix}-${date}-${String(seq).padStart(3,'0')}`
}

// ── Notify helper ─────────────────────────────────────────────────────────────
async function notifyUsers(ticket, eventType, actor) {
  try {
    const targets = new Set()
    if (ticket.requesterId)                    targets.add(ticket.requesterId)
    if (ticket.assigneeId)                     targets.add(ticket.assigneeId)
    if (ticket.watchers?.length) ticket.watchers.forEach(w => targets.add(w))
    // Remove actor from notifications (they triggered the action)
    if (actor?.uid) targets.delete(actor.uid)

    const msgs = {
      status_changed:  { title: `Ticket ${ticket.ticketId} status updated`, body: `Status changed to ${ticket.status} by ${actor?.displayName ?? 'System'}` },
      assigned:        { title: `Ticket ${ticket.ticketId} assigned to you`, body: `${actor?.displayName ?? 'System'} assigned this ticket to ${ticket.assigneeName}` },
      comment_added:   { title: `New comment on ${ticket.ticketId}`, body: `${actor?.displayName ?? 'System'} commented on your ticket` },
      ticket_created:  { title: `Ticket ${ticket.ticketId} created`, body: `Your ticket has been received and is being processed` },
      sla_breach:      { title: `SLA Breach: ${ticket.ticketId}`, body: `This ticket has exceeded its SLA target` },
    }
    const msg = msgs[eventType] ?? { title: `Update on ${ticket.ticketId}`, body: `Ticket was updated` }
    if (targets.size === 0) return
    await sendNotification({
      userIds:   [...targets],
      type:      eventType,
      title:     msg.title,
      body:      msg.body,
      ticketId:  ticket.id ?? null,
      ticketRef: ticket.ticketId ?? null,
    })
  } catch (e) { console.warn('Notification failed (non-fatal):', e) }
}

// ── CREATE ticket ─────────────────────────────────────────────────────────────
export async function createTicket(data, createdBy) {
  const ticketId   = await generateTicketId(data.type ?? 'INCIDENT')
  const today      = new Date()
  const ticketDate = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`

  const ticket = {
    ticketId, ticketDate,
    type:         data.type        ?? 'INCIDENT',
    title:        data.title,
    description:  data.description ?? '',
    category:     data.category    ?? 'other',
    priority:     data.priority    ?? 'P3',
    status:       'NEW',
    requesterId:  createdBy.uid,
    requesterName: createdBy.displayName ?? createdBy.email,
    requesterEmail: createdBy.email,
    assigneeId:   data.assigneeId   ?? null,
    assigneeName: data.assigneeName ?? null,
    assignmentGroupId:   data.assignmentGroupId   ?? null,
    assignmentGroupName: data.assignmentGroupName ?? null,
    tags:         data.tags ?? [],
    attachments:  [],
    comments:     [],
    watchers:     [createdBy.uid],
    slaBreached:  false,
    slaResponseBreached: false,
    createdAt:    serverTimestamp(),
    updatedAt:    serverTimestamp(),
    resolvedAt:   null,
    closedAt:     null,
    history: [{
      action:  'created',
      by:      createdBy.displayName ?? createdBy.email,
      byId:    createdBy.uid,
      at:      Timestamp.now(),
      changes: { status: { from: null, to: 'NEW' } },
    }],
  }

  const docRef = await addDoc(ref(), ticket)
  const created = { id: docRef.id, ...ticket }

  // Notify requester
  await notifyUsers(created, 'ticket_created', null)

  // Notify assignee if pre-assigned
  if (data.assigneeId) {
    await sendNotification({
      userIds:   [data.assigneeId],
      type:      'assigned',
      title:     `Ticket ${ticketId} assigned to you`,
      body:      `${createdBy.displayName} created and assigned this ticket to you`,
      ticketId:  docRef.id,
      ticketRef: ticketId,
    })
  }

  return created
}

// ── GET single ticket ─────────────────────────────────────────────────────────
export async function getTicket(id) {
  const snap = await getDoc(doc(db, COLLECTION, id))
  if (!snap.exists()) throw new Error('Ticket not found')
  return { id: snap.id, ...snap.data() }
}

// ── UPDATE ticket (with full history + notifications) ─────────────────────────
export async function updateTicket(id, updates, updatedBy) {
  const ticketRef = doc(db, COLLECTION, id)
  const existing  = await getDoc(ticketRef)
  if (!existing.exists()) throw new Error('Ticket not found')

  const old = existing.data()
  const changes = {}
  Object.keys(updates).forEach(key => {
    if (JSON.stringify(old[key]) !== JSON.stringify(updates[key])) {
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

  if (updates.status === 'RESOLVED' && old.status !== 'RESOLVED') updates.resolvedAt = serverTimestamp()
  if (updates.status === 'CLOSED')                                 updates.closedAt   = serverTimestamp()

  await updateDoc(ticketRef, {
    ...updates,
    updatedAt: serverTimestamp(),
    history:   [...(old.history ?? []), historyEntry],
  })

  const updated = { id, ...old, ...updates }

  // Determine notification event
  let eventType = 'ticket_updated'
  if (changes.status)     eventType = 'status_changed'
  if (changes.assigneeId) eventType = 'assigned'

  await notifyUsers(updated, eventType, updatedBy)

  // Extra: notify NEW assignee specifically
  if (changes.assigneeId && updates.assigneeId && updates.assigneeId !== old.assigneeId) {
    await sendNotification({
      userIds:   [updates.assigneeId],
      type:      'assigned',
      title:     `Ticket ${old.ticketId} assigned to you`,
      body:      `${updatedBy?.displayName ?? 'System'} assigned this ticket to you`,
      ticketId:  id,
      ticketRef: old.ticketId,
    })
  }

  return updated
}

// ── UPDATE status ─────────────────────────────────────────────────────────────
export async function updateTicketStatus(id, newStatus, updatedBy) {
  if (!TICKET_STATUS[newStatus]) throw new Error(`Invalid status: ${newStatus}`)
  return updateTicket(id, { status: newStatus }, updatedBy)
}

// ── ASSIGN ticket (group + individual) ───────────────────────────────────────
export async function assignTicket(id, { assigneeId, assigneeName, assignmentGroupId, assignmentGroupName }, assignedBy) {
  return updateTicket(id, {
    assigneeId, assigneeName,
    assignmentGroupId:   assignmentGroupId   ?? null,
    assignmentGroupName: assignmentGroupName ?? null,
    status: 'ASSIGNED',
  }, assignedBy)
}

// ── ADD comment (with notification) ──────────────────────────────────────────
export async function addComment(ticketId, { text, isInternal = false }, author) {
  const ticketRef = doc(db, COLLECTION, ticketId)
  const snap      = await getDoc(ticketRef)
  if (!snap.exists()) throw new Error('Ticket not found')

  const comment = {
    id:          `cmt_${Date.now()}`,
    text, isInternal,
    authorId:    author.uid,
    authorName:  author.displayName ?? author.email,
    authorPhoto: author.photoURL ?? null,
    createdAt:   Timestamp.now(),
  }

  const existing = snap.data()
  await updateDoc(ticketRef, {
    comments:  [...(existing.comments ?? []), comment],
    updatedAt: serverTimestamp(),
  })

  // Notify (skip internal notes from going to requester)
  if (!isInternal) {
    const ticket = { id: ticketId, ...existing }
    await notifyUsers(ticket, 'comment_added', author)
  }

  return comment
}

// ── REAL-TIME listeners ───────────────────────────────────────────────────────
export function listenToTickets(filters = {}, callback, onError) {
  const constraints = [orderBy('createdAt', 'desc'), limit(200)]
  if (filters.status)             constraints.unshift(where('status',             '==', filters.status))
  if (filters.priority)           constraints.unshift(where('priority',           '==', filters.priority))
  if (filters.type)               constraints.unshift(where('type',               '==', filters.type))
  if (filters.assigneeId)         constraints.unshift(where('assigneeId',         '==', filters.assigneeId))
  if (filters.requesterId)        constraints.unshift(where('requesterId',        '==', filters.requesterId))
  if (filters.assignmentGroupId)  constraints.unshift(where('assignmentGroupId',  '==', filters.assignmentGroupId))
  const q = query(ref(), ...constraints)
  return onSnapshot(q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err  => { console.error('listenToTickets:', err); onError?.(err) }
  )
}

export function listenToTicket(id, callback, onError) {
  return onSnapshot(doc(db, COLLECTION, id),
    snap => { if (snap.exists()) callback({ id: snap.id, ...snap.data() }) },
    err  => { console.error('listenToTicket:', err); onError?.(err) }
  )
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export async function getTicketStats() {
  const all = await getDocs(query(ref(), orderBy('createdAt', 'desc'), limit(500)))
  const tickets = all.docs.map(d => d.data())
  const byStatus = {}, byPriority = {}, byType = {}
  let breached = 0, resolvedToday = 0
  const today = new Date().toDateString()
  tickets.forEach(t => {
    byStatus[t.status]     = (byStatus[t.status]     ?? 0) + 1
    byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1
    byType[t.type]         = (byType[t.type]         ?? 0) + 1
    if (t.slaBreached) breached++
    if (t.status === 'RESOLVED' && t.resolvedAt?.toDate?.()?.toDateString?.() === today) resolvedToday++
  })
  return {
    total: tickets.length, byStatus, byPriority, byType, breached, resolvedToday,
    open: (byStatus.NEW??0)+(byStatus.OPEN??0)+(byStatus.ASSIGNED??0)+(byStatus.IN_PROGRESS??0),
  }
}
