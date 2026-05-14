// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Admin Settings Page (full)
// System config, language, SLA policies, integrations roadmap
// ─────────────────────────────────────────────────────────────────────────────
import { useState }  from 'react'
import { useAuth }   from '@/context/AuthContext'
import { useTheme }  from '@/context/ThemeContext'
import { db, doc, setDoc, serverTimestamp } from '@/lib/firebase'
import { ROLES }     from '@/lib/constants'
import {
  Card, CardHeader, Toggle, Button, Badge, Input, AIInsight,
} from '@/components/shared/index.jsx'
import { toast } from 'react-hot-toast'
import { Save, Globe, Bell, Shield, Link, RefreshCw } from 'lucide-react'

const LANGS = [
  { code:'en', name:'English', flag:'🇬🇧', dir:'ltr' },
  { code:'ta', name:'Tamil',   flag:'🇮🇳', dir:'ltr' },
  { code:'hi', name:'Hindi',   flag:'🇮🇳', dir:'ltr' },
  { code:'ar', name:'Arabic',  flag:'🇸🇦', dir:'rtl' },
  { code:'fr', name:'French',  flag:'🇫🇷', dir:'ltr' },
  { code:'de', name:'German',  flag:'🇩🇪', dir:'ltr' },
]

const SLA_DEFAULTS = {
  P1: { responseMinutes:60,  resolutionHours:4,  escalationHours:2  },
  P2: { responseMinutes:240, resolutionHours:8,  escalationHours:6  },
  P3: { responseMinutes:480, resolutionHours:24, escalationHours:16 },
  P4: { responseMinutes:1440,resolutionHours:72, escalationHours:48 },
}

export default function SettingsPage() {
  const { profile, role }      = useAuth()
  const { isDark, toggleTheme }= useTheme()
  const isSuperAdmin           = role === ROLES.SUPER_ADMIN

  const [lang,   setLang]   = useState('en')
  const [saving, setSaving] = useState(false)
  const [slaPolicies, setSlaPolicies] = useState(SLA_DEFAULTS)

  const [toggles, setToggles] = useState({
    emailNotif:       true,
    slaBreachAlerts:  true,
    autoEscalateP1:   true,
    notifyManagerOnBreach: true,
    autoAssign:       false,
    weekendSLAPause:  false,
    holidayAdjust:    true,
    twoFA:            false,
    auditLog:         true,
    apiAccess:        false,
    aiSuggestions:    true,
    darkModeDefault:  true,
  })

  const setToggle = (k, v) => setToggles(p => ({ ...p, [k]: v }))

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      await setDoc(doc(db, 'meta', 'settings'), {
        language:     lang,
        toggles,
        slaPolicies,
        updatedAt:    serverTimestamp(),
        updatedBy:    profile?.email,
      }, { merge: true })
      toast.success('Settings saved to Firestore')
    } catch (err) {
      toast.error('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSLAChange = (priority, field, value) => {
    setSlaPolicies(p => ({
      ...p,
      [priority]: { ...p[priority], [field]: Number(value) },
    }))
  }

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            System Settings
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Platform-wide configuration · Changes apply to all users
          </p>
        </div>
        <Button icon={Save} loading={saving} onClick={handleSaveSettings}>
          Save All
        </Button>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader title="Appearance" subtitle="Theme and display settings" />
        <Toggle
          label="Dark Mode"
          description="Use dark theme across all modules (default for all users)"
          enabled={isDark}
          onChange={toggleTheme}
        />
        <Toggle
          label="AI Suggestions"
          description="Show AI-powered ticket category and priority suggestions"
          enabled={toggles.aiSuggestions}
          onChange={v => setToggle('aiSuggestions', v)}
        />
      </Card>

      {/* Language */}
      <Card>
        <CardHeader
          title="Platform Language"
          subtitle="Default language for all users. Users can override in their profile."
        />
        <div className="grid grid-cols-3 gap-2">
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className="flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all"
              style={{
                background:  lang === l.code ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                borderColor: lang === l.code ? 'var(--accent)' : 'var(--border-subtle)',
                color:       lang === l.code ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              <span className="text-base">{l.flag}</span>
              <span className="text-xs font-medium">{l.name}</span>
              {l.dir === 'rtl' && (
                <span className="ml-auto text-[9px]" style={{ color: 'var(--text-muted)' }}>RTL</span>
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader title="Notifications & Alerts" />
        <Toggle label="Email Notifications"       description="Ticket updates and SLA alerts via email"              enabled={toggles.emailNotif}           onChange={v => setToggle('emailNotif', v)} />
        <Toggle label="SLA Breach Alerts"         description="Real-time alert when SLA reaches 70% elapsed"         enabled={toggles.slaBreachAlerts}       onChange={v => setToggle('slaBreachAlerts', v)} />
        <Toggle label="Auto-escalate P1 after 2h" description="Notify L2 team if P1 is unresolved after 2 hours"    enabled={toggles.autoEscalateP1}        onChange={v => setToggle('autoEscalateP1', v)} />
        <Toggle label="Notify manager on breach"  description="Email team manager when any SLA breaches"             enabled={toggles.notifyManagerOnBreach} onChange={v => setToggle('notifyManagerOnBreach', v)} />
      </Card>

      {/* SLA Policies */}
      <Card>
        <CardHeader
          title="SLA Policy Configuration"
          subtitle="Response and resolution targets by priority (in hours/minutes)"
        />
        <div className="space-y-4">
          {Object.entries(slaPolicies).map(([priority, policy]) => (
            <div
              key={priority}
              className="rounded-xl p-3"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  priority === 'P1' ? 'bg-red-500/15 text-red-400' :
                  priority === 'P2' ? 'bg-orange-500/15 text-orange-400' :
                  priority === 'P3' ? 'bg-amber-500/15 text-amber-400' :
                  'bg-blue-500/15 text-blue-400'
                }`}>
                  {priority}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {priority==='P1'?'Critical':priority==='P2'?'High':priority==='P3'?'Medium':'Low'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    Response (min)
                  </label>
                  <input
                    type="number"
                    value={policy.responseMinutes}
                    onChange={e => handleSLAChange(priority, 'responseMinutes', e.target.value)}
                    className="nd-input text-xs py-1.5"
                    min={5}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    Resolution (hrs)
                  </label>
                  <input
                    type="number"
                    value={policy.resolutionHours}
                    onChange={e => handleSLAChange(priority, 'resolutionHours', e.target.value)}
                    className="nd-input text-xs py-1.5"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    Escalation (hrs)
                  </label>
                  <input
                    type="number"
                    value={policy.escalationHours}
                    onChange={e => handleSLAChange(priority, 'escalationHours', e.target.value)}
                    className="nd-input text-xs py-1.5"
                    min={1}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Ticket workflow settings */}
      <Card>
        <CardHeader title="Ticket Workflow" />
        <Toggle label="Auto-Assignment Engine"   description="Auto-route tickets by category and agent availability" enabled={toggles.autoAssign}       onChange={v => setToggle('autoAssign', v)} />
        <Toggle label="Weekend SLA Pause"        description="Pause SLA timer on Saturday and Sunday"               enabled={toggles.weekendSLAPause}  onChange={v => setToggle('weekendSLAPause', v)} />
        <Toggle label="Holiday Adjustment"       description="Apply public holiday rules to SLA timers"             enabled={toggles.holidayAdjust}    onChange={v => setToggle('holidayAdjust', v)} />
      </Card>

      {/* Security */}
      <Card>
        <CardHeader title="Security" />
        <Toggle label="Two-Factor Authentication" description="Require 2FA for admin and agent logins (Phase 2)"   enabled={toggles.twoFA}     onChange={v => setToggle('twoFA', v)} />
        <Toggle label="Audit Logging"             description="Log all admin actions, role changes, data access"   enabled={toggles.auditLog}  onChange={v => setToggle('auditLog', v)} />
        <Toggle label="API Access"                description="Enable REST API for external system integration"     enabled={toggles.apiAccess} onChange={v => setToggle('apiAccess', v)} />
      </Card>

      {/* Integrations roadmap */}
      <Card>
        <CardHeader title="Integrations" subtitle="Live and upcoming platform connections" />
        <div className="grid grid-cols-1 gap-2">
          {[
            { name:'Firebase Auth (Google OAuth)', desc:'User authentication', status:'live',    color:'green'  },
            { name:'Firestore Database',           desc:'Real-time data store', status:'live',   color:'green'  },
            { name:'Firebase Hosting',             desc:'Global CDN hosting',   status:'live',   color:'green'  },
            { name:'Claude AI API',                desc:'AI suggestions, chatbot', status:'phase2', color:'blue' },
            { name:'Twilio Voice / SMS',           desc:'Voicebot, SMS alerts',  status:'phase3', color:'amber' },
            { name:'Google Maps API',              desc:'FSO technician tracking',status:'phase2', color:'blue' },
            { name:'SendGrid Email',               desc:'Transactional emails',   status:'phase2', color:'blue' },
            { name:'HRMS Integration',             desc:'Employee sync',          status:'phase3', color:'amber' },
            { name:'Payroll System',               desc:'Finance module',         status:'phase4', color:'gray'  },
          ].map(i => (
            <div key={i.name}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{i.name}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{i.desc}</p>
              </div>
              <Badge variant={i.color === 'green' ? 'green' : i.color === 'blue' ? 'blue' : i.color === 'amber' ? 'amber' : 'default'}>
                {i.status === 'live' ? '✅ Live' : i.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Firebase project info */}
      <Card>
        <CardHeader title="Firebase Project" subtitle="Current deployment info" />
        <div className="space-y-0 text-xs">
          {[
            { label:'Project',  value: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'Not configured' },
            { label:'Auth Domain', value: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'Not configured' },
            { label:'Environment', value: import.meta.env.MODE ?? 'production' },
            { label:'Version',  value: '1.0.0 — Phase 1 ITSM' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{value}</span>
            </div>
          ))}
        </div>
      </Card>

      <Button icon={Save} loading={saving} onClick={handleSaveSettings} className="w-full">
        Save All Settings
      </Button>
    </div>
  )
}
