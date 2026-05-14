// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — New Ticket Page (FIXED)
// Fixes: ticket creation now works, requesterId set correctly, AI suggestion
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast }       from 'react-hot-toast'
import { ArrowLeft, Sparkles, Mic, Send, Info } from 'lucide-react'
import { useAuth }          from '@/context/AuthContext'
import { createTicket }     from '@/lib/ticketService'
import { CATEGORIES, TICKET_TYPES, SLA_POLICIES, ROLES } from '@/lib/constants'
import {
  Card, CardHeader, Button, Input, Select, Textarea, AIInsight, PriorityBadge,
} from '@/components/shared/index.jsx'

const PRIORITY_INFO = {
  P1: { label:'P1 — Critical', color:'text-red-400',    info:'Complete outage. Response: 1h. Resolution: 4h.' },
  P2: { label:'P2 — High',     color:'text-orange-400', info:'Major function impaired. Response: 4h. Resolution: 8h.' },
  P3: { label:'P3 — Medium',   color:'text-amber-400',  info:'Partial loss, workaround available. Response: 8h. Resolution: 24h.' },
  P4: { label:'P4 — Low',      color:'text-blue-400',   info:'Minor issue or enhancement. Response: 24h. Resolution: 72h.' },
}

// Simple keyword-based AI category suggestion
function suggestFromText(title = '', desc = '') {
  const t = (title + ' ' + desc).toLowerCase()
  if (/network|vpn|wifi|internet|bandwidth|latency|slow connection|ethernet/.test(t)) return { cat:'network',  priority:'P2' }
  if (/password|login|access|permission|account|locked|credential|mfa|2fa/.test(t)) return { cat:'access',   priority:'P3' }
  if (/laptop|desktop|monitor|keyboard|mouse|printer|hardware|screen|battery/.test(t)) return { cat:'hardware', priority:'P3' }
  if (/email|outlook|calendar|teams|zoom|meeting|exchange/.test(t)) return { cat:'email', priority:'P3' }
  if (/virus|malware|ransomware|phishing|security|breach|hack|threat/.test(t)) return { cat:'security', priority:'P1' }
  if (/server|database|db|sql|crash|outage|down|application/.test(t)) return { cat:'server', priority:'P1' }
  if (/install|software|application|app|update|upgrade|license/.test(t)) return { cat:'software', priority:'P3' }
  if (/hr|leave|payroll|onboard|offboard|policy/.test(t)) return { cat:'hr', priority:'P4' }
  return null
}

export default function NewTicketPage() {
  const navigate             = useNavigate()
  const [searchParams]       = useSearchParams()
  const { user, profile, isAdmin, isAgent } = useAuth()

  const [form, setForm] = useState({
    type:         searchParams.get('type')     ?? 'INCIDENT',
    title:        searchParams.get('title')    ?? '',
    description:  '',
    category:     searchParams.get('category') ?? 'other',
    priority:     'P3',
    assigneeId:   '',
    assigneeName: '',
    tags:         '',
  })
  const [aiSuggestion, setAISuggestion] = useState(null)
  const [saving, setSaving]             = useState(false)
  const [errors, setErrors]             = useState({})

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => ({ ...p, [k]: null }))
    // Trigger AI suggestion on title change
    if ((k === 'title' || k === 'description') && v.length > 8) {
      const s = suggestFromText(
        k === 'title' ? v : form.title,
        k === 'description' ? v : form.description
      )
      if (s) setAISuggestion(s)
    }
  }

  const validate = () => {
    const e = {}
    if (!form.title.trim())       e.title       = 'Title is required'
    if (!form.description.trim()) e.description = 'Please describe the issue'
    if (form.title.length > 200)  e.title       = 'Max 200 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) { toast.error('Please fix the errors below'); return }
    if (!user)       { toast.error('You must be signed in'); return }

    setSaving(true)
    try {
      const ticket = await createTicket(
        {
          ...form,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        },
        {
          uid:         user.uid,
          displayName: profile?.displayName ?? user.email,
          email:       user.email,
        }
      )
      toast.success(`✅ Ticket ${ticket.ticketId} created!`)
      navigate(`/itsm/tickets/${ticket.id}`)
    } catch (err) {
      console.error('createTicket error:', err)
      // Show specific error
      if (err.code === 'permission-denied') {
        toast.error('Permission denied — Firestore rules may not be deployed. Run: firebase deploy --only firestore')
      } else {
        toast.error(`Failed to create ticket: ${err.message}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const applyAI = () => {
    if (!aiSuggestion) return
    setForm(p => ({ ...p, category: aiSuggestion.cat, priority: aiSuggestion.priority }))
    setAISuggestion(null)
    toast.success('AI suggestion applied')
  }

  const sla = SLA_POLICIES[form.priority]

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in pb-10">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate(-1)}>
          Back
        </Button>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Raise New Ticket
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Submitting as <strong style={{ color: 'var(--text-primary)' }}>{profile?.displayName ?? user?.email}</strong>
            {' · '}Role: <strong style={{ color: 'var(--accent)' }}>{profile?.role}</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* ── Main form ── */}
        <div className="md:col-span-2 space-y-4">

          {/* Type */}
          <Card>
            <CardHeader title="Ticket Type" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(TICKET_TYPES).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => set('type', key)}
                  className="p-3 rounded-xl text-left transition-all border text-xs"
                  style={{
                    border: `1px solid ${form.type === key ? 'var(--accent)' : 'var(--border-default)'}`,
                    background: form.type === key ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                    color: form.type === key ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  <div className="font-semibold" style={{ color: form.type === key ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {meta.label}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Title & Description */}
          <Card>
            <CardHeader title="Issue Details" />
            <div className="space-y-4">
              <div>
                <Input
                  label="Title *"
                  placeholder="Brief, specific description — e.g. VPN drops every 30 minutes"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  error={errors.title}
                />
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  {form.title.length}/200
                </p>
              </div>

              <Textarea
                label="Description *"
                placeholder="Describe the issue in detail: what happened, when it started, how many users are affected, any error messages, steps to reproduce…"
                rows={5}
                value={form.description}
                onChange={e => set('description', e.target.value)}
                error={errors.description}
              />
            </div>
          </Card>

          {/* AI suggestion banner */}
          {aiSuggestion && (
            <AIInsight type="info">
              <div className="flex items-center justify-between gap-3">
                <span>
                  <strong className="text-blue-400">AI Suggestion:</strong>{' '}
                  Category <strong>{CATEGORIES.find(c => c.id === aiSuggestion.cat)?.label ?? aiSuggestion.cat}</strong>,
                  Priority <strong>{aiSuggestion.priority}</strong>
                </span>
                <Button size="sm" icon={Sparkles} onClick={applyAI}>Apply</Button>
              </div>
            </AIInsight>
          )}

          {/* Classification */}
          <Card>
            <CardHeader title="Classification" />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Category"
                value={form.category}
                onChange={e => set('category', e.target.value)}
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </Select>

              <Select
                label="Priority"
                value={form.priority}
                onChange={e => set('priority', e.target.value)}
              >
                {Object.entries(PRIORITY_INFO).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </Select>
            </div>

            <div className="mt-3">
              <AIInsight type={form.priority === 'P1' ? 'danger' : form.priority === 'P2' ? 'warning' : 'info'}>
                {PRIORITY_INFO[form.priority]?.info}
              </AIInsight>
            </div>

            <div className="mt-3">
              <Input
                label="Tags (optional, comma-separated)"
                placeholder="e.g. vpn, remote-work, urgent"
                value={form.tags}
                onChange={e => set('tags', e.target.value)}
              />
            </div>
          </Card>

          {/* Agent-only assignment */}
          {isAgent && (
            <Card>
              <CardHeader title="Assignment" subtitle="Leave blank for auto-assignment" />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Assignee Name"
                  placeholder="e.g. Ravi Kumar"
                  value={form.assigneeName}
                  onChange={e => set('assigneeName', e.target.value)}
                />
                <Input
                  label="Assignee User ID"
                  placeholder="Firebase UID"
                  value={form.assigneeId}
                  onChange={e => set('assigneeId', e.target.value)}
                />
              </div>
            </Card>
          )}

          {/* Submit */}
          <div className="flex items-center gap-3 pb-4">
            <Button loading={saving} icon={Send} onClick={handleSubmit} className="px-6">
              {saving ? 'Creating…' : 'Submit Ticket'}
            </Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="SLA Preview" />
            <div className="space-y-2.5">
              {[
                { label:'Priority',          value: form.priority },
                { label:'First Response',    value: sla ? `${sla.responseMinutes >= 60 ? sla.responseMinutes/60+'h' : sla.responseMinutes+'m'}` : '—' },
                { label:'Resolution Target', value: sla ? `${sla.resolutionHours}h` : '—' },
                { label:'Escalation After',  value: sla ? `${sla.escalationHours}h` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Writing Tips" />
            <ul className="space-y-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <li>• Be specific — include error messages</li>
              <li>• State how many users are affected</li>
              <li>• Mention when it started</li>
              <li>• List what you've already tried</li>
              <li>• Include screenshots if possible</li>
            </ul>
          </Card>

          <Card>
            <CardHeader title="Check KB First" subtitle="Self-service may resolve faster" />
            <div className="space-y-1.5">
              {['VPN Troubleshooting', 'Password Reset Guide', 'Teams Audio Fix', 'Software Install'].map(a => (
                <button key={a} onClick={() => navigate('/itsm/knowledge')}
                  className="w-full text-left text-xs px-2.5 py-2 rounded-lg transition-colors"
                  style={{ color: 'var(--accent)', background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>
                  📖 {a}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
