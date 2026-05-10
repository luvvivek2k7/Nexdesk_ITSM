// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — New Ticket Page
// Smart form: AI category/priority suggestion, validation, Firestore save
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast }       from 'react-hot-toast'
import { ArrowLeft, Sparkles, Mic, Send } from 'lucide-react'
import { useAuth }          from '@/context/AuthContext'
import { createTicket }     from '@/lib/ticketService'
import { CATEGORIES, TICKET_TYPES, SLA_POLICIES } from '@/lib/constants'
import {
  Card, CardHeader, Button, Input, Select, Textarea, AIInsight, PriorityBadge,
} from '@/components/shared/index.jsx'

const PRIORITY_DESCRIPTIONS = {
  P1: 'Complete outage. All users affected. Respond within 1 hour.',
  P2: 'Major function impaired. Many users affected. Respond within 4 hours.',
  P3: 'Partial loss. Workaround available. Respond within 8 hours.',
  P4: 'Minor issue or enhancement. No impact. Respond within 24 hours.',
}

// Simple AI category suggestion based on keywords
function suggestCategory(title = '', desc = '') {
  const text = (title + ' ' + desc).toLowerCase()
  if (/network|vpn|wifi|internet|bandwidth|latency|slow connection/.test(text)) return { cat: 'network',  priority: 'P2' }
  if (/password|login|access|permission|account|locked|credential/.test(text))  return { cat: 'access',   priority: 'P3' }
  if (/laptop|desktop|monitor|keyboard|mouse|printer|hardware/.test(text))      return { cat: 'hardware', priority: 'P3' }
  if (/email|outlook|calendar|teams|zoom|meeting/.test(text))                   return { cat: 'email',    priority: 'P3' }
  if (/virus|malware|ransomware|phishing|security|breach|hack/.test(text))      return { cat: 'security', priority: 'P1' }
  if (/server|database|db|sql|crash|outage|down/.test(text))                    return { cat: 'server',   priority: 'P1' }
  if (/install|software|application|app|update|upgrade/.test(text))             return { cat: 'software', priority: 'P3' }
  return null
}

export default function NewTicketPage() {
  const navigate = useNavigate()
  const { user, profile, isAdmin, isAgent } = useAuth()

  const [form, setForm] = useState({
    type:        'INCIDENT',
    title:       '',
    description: '',
    category:    'other',
    priority:    'P3',
    assigneeId:  '',
    assigneeName:'',
    tags:        '',
  })
  const [aiSuggestion, setAISuggestion] = useState(null)
  const [saving, setSaving]             = useState(false)
  const [errors, setErrors]             = useState({})

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => ({ ...p, [k]: null }))

    // Trigger AI suggestion on title/description change
    if (k === 'title' || k === 'description') {
      const val = k === 'title' ? v : form.title
      const suggestion = suggestCategory(val, k === 'description' ? v : form.description)
      if (suggestion && val.length > 10) setAISuggestion(suggestion)
    }
  }

  const applyAISuggestion = () => {
    if (!aiSuggestion) return
    setForm(p => ({ ...p, category: aiSuggestion.cat, priority: aiSuggestion.priority }))
    setAISuggestion(null)
    toast.success('AI suggestion applied')
  }

  const validate = () => {
    const errs = {}
    if (!form.title.trim())       errs.title       = 'Title is required'
    if (!form.description.trim()) errs.description = 'Description is required'
    if (form.title.length > 200)  errs.title       = 'Title must be under 200 characters'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const ticket = await createTicket(
        {
          ...form,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        },
        { uid: user.uid, displayName: profile?.displayName, email: user.email }
      )
      toast.success(`Ticket ${ticket.ticketId} created!`)
      navigate(`/itsm/tickets/${ticket.id}`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to create ticket. Please try again.')
      setSaving(false)
    }
  }

  const slaPolicy = SLA_POLICIES[form.priority]

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate(-1)}>
          Back
        </Button>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Raise New Ticket
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Fill in the details below. AI will suggest category and priority.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* ── Main form ── */}
        <div className="md:col-span-2 space-y-4">

          {/* Type selector */}
          <Card>
            <CardHeader title="Ticket Type" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(TICKET_TYPES).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => set('type', key)}
                  className={`p-3 rounded-xl text-left transition-all duration-150 border text-xs font-medium ${
                    form.type === key
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-[var(--border-default)] hover:border-[var(--border-strong)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="font-semibold mb-0.5" style={{ color: form.type === key ? undefined : 'var(--text-primary)' }}>
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
                  placeholder="Brief, specific description of the issue"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  error={errors.title}
                />
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  {form.title.length}/200 characters
                </p>
              </div>

              <Textarea
                label="Description *"
                placeholder="Provide full details: what happened, when, impact, steps to reproduce, error messages…"
                rows={5}
                value={form.description}
                onChange={e => set('description', e.target.value)}
                error={errors.description}
              />

              {/* Voice input button */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" icon={Mic} className="text-xs">
                  Voice to Text (Twilio — Phase 2)
                </Button>
              </div>
            </div>
          </Card>

          {/* AI Suggestion */}
          {aiSuggestion && (
            <AIInsight type="info">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong className="text-blue-400">AI Suggestion:</strong>{' '}
                  Based on your description, this looks like a{' '}
                  <strong>{CATEGORIES.find(c => c.id === aiSuggestion.cat)?.label}</strong>{' '}
                  issue with priority <PriorityBadge priority={aiSuggestion.priority} />.
                </div>
                <Button size="sm" icon={Sparkles} onClick={applyAISuggestion}>
                  Apply
                </Button>
              </div>
            </AIInsight>
          )}

          {/* Category & Priority */}
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
                {Object.entries(SLA_POLICIES).map(([key, p]) => (
                  <option key={key} value={key}>{key} — {p.label.split('—')[1]?.trim() ?? p.label}</option>
                ))}
              </Select>
            </div>

            <div className="mt-3">
              <AIInsight type={form.priority === 'P1' ? 'danger' : form.priority === 'P2' ? 'warning' : 'info'}>
                {PRIORITY_DESCRIPTIONS[form.priority]}
              </AIInsight>
            </div>

            <div className="mt-3">
              <Input
                label="Tags (comma-separated)"
                placeholder="e.g. network, vpn, remote-work"
                value={form.tags}
                onChange={e => set('tags', e.target.value)}
              />
            </div>
          </Card>

          {/* Agent-only: Assignment */}
          {isAgent && (
            <Card>
              <CardHeader title="Assignment" subtitle="Optional — leave blank for auto-assignment" />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Assignee ID"
                  placeholder="User UID from Firebase"
                  value={form.assigneeId}
                  onChange={e => set('assigneeId', e.target.value)}
                />
                <Input
                  label="Assignee Name"
                  placeholder="Display name"
                  value={form.assigneeName}
                  onChange={e => set('assigneeName', e.target.value)}
                />
              </div>
            </Card>
          )}

          {/* Submit */}
          <div className="flex items-center gap-3 pb-6">
            <Button
              loading={saving}
              icon={Send}
              onClick={handleSubmit}
              className="px-6"
            >
              {saving ? 'Creating ticket…' : 'Submit Ticket'}
            </Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </div>

        {/* ── Right panel: SLA preview ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="SLA Preview" />
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-muted)' }}>Priority</span>
                <PriorityBadge priority={form.priority} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-muted)' }}>First Response</span>
                <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {slaPolicy?.responseMinutes >= 60
                    ? `${slaPolicy.responseMinutes / 60}h`
                    : `${slaPolicy?.responseMinutes}m`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-muted)' }}>Resolution Target</span>
                <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {slaPolicy?.resolutionHours}h
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-muted)' }}>Escalation After</span>
                <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {slaPolicy?.escalationHours}h
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Tips" />
            <ul className="space-y-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <li>• Be specific — "Cannot access VPN from Chennai office" vs "VPN broken"</li>
              <li>• Include error messages or screenshots where possible</li>
              <li>• List affected users or systems</li>
              <li>• Mention any recent changes that may have caused the issue</li>
            </ul>
          </Card>

          <Card>
            <CardHeader title="Related KB" subtitle="Before submitting, check:" />
            <div className="space-y-2">
              {['VPN Troubleshooting Guide', 'Password Reset Self-Service', 'Common Software Errors'].map(title => (
                <button
                  key={title}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg transition-colors"
                  style={{ color: 'var(--accent)', background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}
                  onClick={() => navigate('/itsm/knowledge')}
                >
                  📖 {title}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
