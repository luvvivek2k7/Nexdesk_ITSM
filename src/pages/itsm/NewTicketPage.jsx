// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — New Ticket Page  v2
// Assignment Group → Member picker, AI suggestions, full validation
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import { toast }               from 'react-hot-toast'
import { ArrowLeft, Sparkles, Send, Users, ChevronDown } from 'lucide-react'
import { useAuth }          from '@/context/AuthContext'
import { createTicket }     from '@/lib/ticketService'
import { getGroups }        from '@/lib/assignmentService'
import { CATEGORIES, TICKET_TYPES, SLA_POLICIES, ROLES } from '@/lib/constants'
import { Card, CardHeader, Button, Input, Select, Textarea, AIInsight, PriorityBadge } from '@/components/shared/index.jsx'

const PRIORITY_DESC = {
  P1: 'Complete outage. All users affected. Respond within 1 hour.',
  P2: 'Major function impaired. Many users affected. Respond within 4 hours.',
  P3: 'Partial loss. Workaround available. Respond within 8 hours.',
  P4: 'Minor issue or enhancement. Respond within 24 hours.',
}

function suggestCategory(title = '', desc = '') {
  const text = (title + ' ' + desc).toLowerCase()
  if (/network|vpn|wifi|internet|bandwidth|latency/.test(text))     return { cat:'network',  priority:'P2' }
  if (/password|login|access|permission|locked|credential/.test(text)) return { cat:'access',   priority:'P3' }
  if (/laptop|desktop|monitor|keyboard|printer|hardware/.test(text)) return { cat:'hardware', priority:'P3' }
  if (/email|outlook|calendar|teams|zoom/.test(text))               return { cat:'email',    priority:'P3' }
  if (/virus|malware|phishing|security|breach|hack/.test(text))     return { cat:'security', priority:'P1' }
  if (/server|database|crash|outage|down/.test(text))               return { cat:'server',   priority:'P1' }
  if (/install|software|application|update/.test(text))             return { cat:'software', priority:'P3' }
  return null
}

export default function NewTicketPage() {
  const navigate = useNavigate()
  const { user, profile, isAgent } = useAuth()

  const [form, setForm] = useState({
    type: 'INCIDENT', title: '', description: '',
    category: 'other', priority: 'P3', tags: '',
    assignmentGroupId: '', assignmentGroupName: '',
    assigneeId: '', assigneeName: '',
  })
  const [groups,       setGroups]       = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [errors,       setErrors]       = useState({})

  // Load assignment groups for agents/admins
  useEffect(() => {
    if (isAgent) {
      getGroups().then(setGroups).catch(console.error)
    }
  }, [isAgent])

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => ({ ...p, [k]: null }))
    if (k === 'title' || k === 'description') {
      const suggestion = suggestCategory(k === 'title' ? v : form.title, k === 'description' ? v : form.description)
      if (suggestion && (k === 'title' ? v : form.title).length > 10) setAiSuggestion(suggestion)
    }
  }

  const handleGroupChange = (groupId) => {
    const group = groups.find(g => g.id === groupId)
    setSelectedGroup(group ?? null)
    setForm(p => ({
      ...p,
      assignmentGroupId:   groupId,
      assignmentGroupName: group?.name ?? '',
      assigneeId:   '',
      assigneeName: '',
    }))
  }

  const handleMemberSelect = (uid) => {
    const member = selectedGroup?.members?.find(m => m.uid === uid)
    setForm(p => ({
      ...p,
      assigneeId:   member?.uid  ?? '',
      assigneeName: member?.name ?? '',
    }))
  }

  const applyAI = () => {
    if (!aiSuggestion) return
    setForm(p => ({ ...p, category: aiSuggestion.cat, priority: aiSuggestion.priority }))
    setAiSuggestion(null)
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
        { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) },
        { uid: user.uid, displayName: profile?.displayName, email: user.email }
      )
      toast.success(`Ticket ${ticket.ticketId} created!`)
      navigate(`/itsm/tickets/${ticket.id}`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to create ticket')
      setSaving(false)
    }
  }

  const sla = SLA_POLICIES[form.priority]

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate(-1)}>Back</Button>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Raise New Ticket</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>AI will suggest category and priority as you type.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">

          {/* Ticket Type */}
          <Card>
            <CardHeader title="Ticket Type" />
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(TICKET_TYPES).map(([key, meta]) => (
                <button key={key} onClick={() => set('type', key)}
                  className={`p-3 rounded-xl text-left text-xs font-medium border transition-all ${
                    form.type === key ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-[var(--border-default)] hover:border-[var(--border-strong)] text-[var(--text-secondary)]'
                  }`}>
                  <div className="font-semibold" style={{ color: form.type === key ? undefined : 'var(--text-primary)' }}>{meta.label}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Issue Details */}
          <Card>
            <CardHeader title="Issue Details" />
            <div className="space-y-4">
              <div>
                <Input label="Title *" placeholder="Brief, specific description of the issue"
                  value={form.title} onChange={e => set('title', e.target.value)} error={errors.title} />
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{form.title.length}/200</p>
              </div>
              <Textarea label="Description *"
                placeholder="What happened, when, impact, steps to reproduce, error messages…"
                rows={5} value={form.description}
                onChange={e => set('description', e.target.value)} error={errors.description} />
            </div>
          </Card>

          {/* AI Suggestion */}
          {aiSuggestion && (
            <AIInsight type="info">
              <div className="flex items-center justify-between gap-3">
                <span>
                  <strong className="text-blue-400">AI Suggestion:</strong>{' '}
                  Looks like a <strong>{CATEGORIES.find(c => c.id === aiSuggestion.cat)?.label}</strong>{' '}
                  issue with priority <strong>{aiSuggestion.priority}</strong>.
                </span>
                <Button size="sm" icon={Sparkles} onClick={applyAI}>Apply</Button>
              </div>
            </AIInsight>
          )}

          {/* Classification */}
          <Card>
            <CardHeader title="Classification" />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Category" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </Select>
              <Select label="Priority" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {Object.entries(SLA_POLICIES).map(([key, p]) => (
                  <option key={key} value={key}>{key} — {p.label.split('—')[1]?.trim() ?? p.label}</option>
                ))}
              </Select>
            </div>
            <div className="mt-3">
              <AIInsight type={form.priority === 'P1' ? 'danger' : form.priority === 'P2' ? 'warning' : 'info'}>
                {PRIORITY_DESC[form.priority]}
              </AIInsight>
            </div>
            <div className="mt-3">
              <Input label="Tags (comma-separated)" placeholder="e.g. network, vpn, remote-work"
                value={form.tags} onChange={e => set('tags', e.target.value)} />
            </div>
          </Card>

          {/* Assignment — agents/admins only */}
          {isAgent && (
            <Card>
              <CardHeader title="Assignment" subtitle="Assign to a group and optionally a specific member" />
              <div className="space-y-3">

                {/* Group picker */}
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Assignment Group</label>
                  <select value={form.assignmentGroupId} onChange={e => handleGroupChange(e.target.value)}
                    className="nd-input w-full">
                    <option value="">— Unassigned (auto-route) —</option>
                    {groups.filter(g => g.active).map(g => (
                      <option key={g.id} value={g.id}>{g.name}{g.description ? ` — ${g.description}` : ''}</option>
                    ))}
                  </select>
                </div>

                {/* Member picker — only shown when group selected and has members */}
                {selectedGroup && (selectedGroup.members?.length ?? 0) > 0 && (
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>
                      Assignee — {selectedGroup.name} ({selectedGroup.members.length} members)
                    </label>
                    <select value={form.assigneeId} onChange={e => handleMemberSelect(e.target.value)}
                      className="nd-input w-full">
                      <option value="">— Select member (optional) —</option>
                      {selectedGroup.members.map(m => (
                        <option key={m.uid} value={m.uid}>{m.name} ({m.email})</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedGroup && (selectedGroup.members?.length ?? 0) === 0 && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    This group has no members yet. Add members in Admin → Assignment Groups.
                  </p>
                )}

                {/* Show selected assignee */}
                {form.assigneeName && (
                  <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: 'var(--accent)' }}>
                      {form.assigneeName[0]}
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{form.assigneeName}</span>
                    <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{form.assignmentGroupName}</span>
                    <button onClick={() => setForm(p => ({ ...p, assigneeId:'', assigneeName:'' }))}
                      className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>✕</button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Submit */}
          <div className="flex items-center gap-3 pb-6">
            <Button loading={saving} icon={Send} onClick={handleSubmit} className="px-6">
              {saving ? 'Creating ticket…' : 'Submit Ticket'}
            </Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="SLA Preview" />
            <div className="space-y-3">
              {[
                { label: 'Priority',          value: <PriorityBadge priority={form.priority} /> },
                { label: 'First Response',     value: sla?.responseMinutes >= 60 ? `${sla.responseMinutes/60}h` : `${sla?.responseMinutes}m` },
                { label: 'Resolution Target',  value: `${sla?.resolutionHours}h` },
                { label: 'Escalation After',   value: `${sla?.escalationHours}h` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Tips" />
            <ul className="space-y-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <li>• Be specific — "VPN down from Chennai office" vs "VPN broken"</li>
              <li>• Include error messages or screenshots</li>
              <li>• List affected users or systems</li>
              <li>• Mention any recent changes that may have caused the issue</li>
            </ul>
          </Card>

          <Card>
            <CardHeader title="Related KB" subtitle="Before submitting, check:" />
            <div className="space-y-2">
              {['VPN Troubleshooting Guide', 'Password Reset Self-Service', 'Common Software Errors'].map(t => (
                <button key={t} onClick={() => navigate('/itsm/knowledge')}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg"
                  style={{ color: 'var(--accent)', background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>
                  📖 {t}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
