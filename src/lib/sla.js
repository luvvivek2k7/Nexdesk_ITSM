// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — SLA Calculation Engine
// Real business-hours-aware SLA tracking
// ─────────────────────────────────────────────────────────────────────────────
import { SLA_POLICIES } from './constants'

const BUSINESS_HOURS = { start: 9, end: 18 }   // 9 AM – 6 PM
const BUSINESS_DAYS  = [1, 2, 3, 4, 5]          // Mon–Fri

// ── Calculate elapsed business minutes between two dates ─────────────────────
export function businessMinutesBetween(start, end, excludeWeekends = true) {
  if (!start || !end || end <= start) return 0
  let elapsed = 0
  let current = new Date(start)

  while (current < end) {
    const day  = current.getDay()
    const hour = current.getHours()

    const isBusinessDay = !excludeWeekends || BUSINESS_DAYS.includes(day)
    const isBusinessHour = hour >= BUSINESS_HOURS.start && hour < BUSINESS_HOURS.end

    if (isBusinessDay && isBusinessHour) {
      // Add 1 minute, but don't go past end
      const nextMinute = new Date(current.getTime() + 60_000)
      elapsed += nextMinute <= end ? 1 : Math.round((end - current) / 60_000)
    }

    // Jump to next minute efficiently
    current = new Date(current.getTime() + 60_000)
  }
  return elapsed
}

// ── Fast approximation (used for dashboard display) ──────────────────────────
export function approxBusinessMinutes(start, end) {
  const totalMs = end - start
  const totalHours = totalMs / 3_600_000
  // Approximate: assume ~8 business hours per 24h (conservative)
  const businessFraction = 8 / 24
  return Math.round(totalHours * 60 * businessFraction)
}

// ── Main SLA status calculator ───────────────────────────────────────────────
export function calculateSLA(ticket, now = new Date()) {
  const policy = SLA_POLICIES[ticket.priority]
  if (!policy) return null

  const createdAt  = ticket.createdAt?.toDate?.() ?? new Date(ticket.createdAt)
  const resolvedAt = ticket.resolvedAt?.toDate?.() ?? (ticket.resolvedAt ? new Date(ticket.resolvedAt) : null)
  const effectiveEnd = resolvedAt ?? now

  // Response SLA
  const responseTargetMs  = policy.responseMinutes * 60_000
  const responseElapsedMs = effectiveEnd - createdAt
  const responseElapsedMin = Math.max(0, Math.round(responseElapsedMs / 60_000))
  const responsePct        = Math.min(100, (responseElapsedMin / policy.responseMinutes) * 100)

  // Resolution SLA
  const resolutionTargetMs  = policy.resolutionHours * 3_600_000
  const resolutionElapsedMs = effectiveEnd - createdAt
  const resolutionElapsedMin = Math.max(0, Math.round(resolutionElapsedMs / 60_000))
  const resolutionPct        = Math.min(100, (resolutionElapsedMin / (policy.resolutionHours * 60)) * 100)

  // Due dates
  const responseDue    = new Date(createdAt.getTime() + responseTargetMs)
  const resolutionDue  = new Date(createdAt.getTime() + resolutionTargetMs)

  const responseStatus    = getSLAStatus(responsePct)
  const resolutionStatus  = getSLAStatus(resolutionPct)

  // Time remaining
  const responseRemaining   = responseDue - now
  const resolutionRemaining = resolutionDue - now

  return {
    policy,
    response: {
      targetMinutes: policy.responseMinutes,
      elapsedMinutes: responseElapsedMin,
      percentage: Math.round(responsePct),
      status: responseStatus,
      dueAt: responseDue,
      remainingMs: responseRemaining,
      breached: responsePct >= 100,
    },
    resolution: {
      targetHours: policy.resolutionHours,
      elapsedMinutes: resolutionElapsedMin,
      percentage: Math.round(resolutionPct),
      status: resolutionStatus,
      dueAt: resolutionDue,
      remainingMs: resolutionRemaining,
      breached: resolutionPct >= 100,
    },
    overall: {
      status: getOverallStatus(responseStatus, resolutionStatus),
      percentage: Math.round(Math.max(responsePct, resolutionPct)),
    },
  }
}

// ── SLA status from percentage ────────────────────────────────────────────────
export function getSLAStatus(pct) {
  if (pct >= 100) return 'breached'
  if (pct >= 80)  return 'at_risk'
  if (pct >= 60)  return 'warning'
  return 'on_track'
}

export function getOverallStatus(s1, s2) {
  const rank = { breached: 3, at_risk: 2, warning: 1, on_track: 0 }
  return rank[s1] >= rank[s2] ? s1 : s2
}

// ── Format remaining time as human string ────────────────────────────────────
export function formatRemaining(ms) {
  if (ms <= 0) return 'Breached'
  const totalSec  = Math.floor(ms / 1000)
  const days  = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins  = Math.floor((totalSec % 3600) / 60)
  const secs  = totalSec % 60

  if (days > 0)  return `${days}d ${hours}h remaining`
  if (hours > 0) return `${hours}h ${mins}m remaining`
  if (mins > 0)  return `${mins}m ${secs}s remaining`
  return `${secs}s remaining`
}

// ── Format elapsed time ───────────────────────────────────────────────────────
export function formatElapsed(minutes) {
  if (minutes < 60)   return `${minutes}m`
  if (minutes < 1440) return `${Math.floor(minutes/60)}h ${minutes%60}m`
  return `${Math.floor(minutes/1440)}d ${Math.floor((minutes%1440)/60)}h`
}

// ── SLA color class (Tailwind) ────────────────────────────────────────────────
export function getSLAColorClass(status) {
  return {
    on_track: 'text-green-400',
    warning:  'text-yellow-400',
    at_risk:  'text-orange-400',
    breached: 'text-red-400',
  }[status] ?? 'text-gray-400'
}

export function getSLABgClass(status) {
  return {
    on_track: 'bg-green-500/10 border-green-500/20 text-green-400',
    warning:  'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    at_risk:  'bg-orange-500/10 border-orange-500/20 text-orange-400',
    breached: 'bg-red-500/10 border-red-500/20 text-red-400',
  }[status] ?? 'bg-gray-500/10 border-gray-500/20 text-gray-400'
}

export function getSLABarColor(status) {
  return {
    on_track: '#22c55e',
    warning:  '#eab308',
    at_risk:  '#f97316',
    breached: '#ef4444',
  }[status] ?? '#6b7280'
}
