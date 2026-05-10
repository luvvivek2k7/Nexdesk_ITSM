import { useState } from 'react'
import { useAuth }  from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { Card, CardHeader, Toggle, Button, Badge } from '@/components/shared/index.jsx'
import { toast } from 'react-hot-toast'

const LANGS = [
  { code:'en', name:'English',  flag:'🇬🇧' },
  { code:'ta', name:'Tamil',    flag:'🇮🇳' },
  { code:'hi', name:'Hindi',    flag:'🇮🇳' },
  { code:'ar', name:'Arabic',   flag:'🇸🇦' },
  { code:'fr', name:'French',   flag:'🇫🇷' },
  { code:'de', name:'German',   flag:'🇩🇪' },
]

export default function SettingsPage() {
  const { profile, updateProfile } = useAuth()
  const { isDark, toggleTheme }    = useTheme()
  const [lang, setLang]            = useState(profile?.preferences?.language ?? 'en')
  const [notifs, setNotifs]        = useState(profile?.preferences?.notifications ?? { email: true, push: true, sla: true })

  const save = async () => {
    await updateProfile({ preferences: { ...profile?.preferences, language: lang, notifications: notifs } })
    toast.success('Settings saved')
  }

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>

      {/* Theme */}
      <Card>
        <CardHeader title="Appearance" />
        <Toggle
          label="Dark Mode"
          description="Use dark theme across all modules"
          enabled={isDark}
          onChange={toggleTheme}
        />
      </Card>

      {/* Language */}
      <Card>
        <CardHeader title="Language" subtitle="Platform display language" />
        <div className="grid grid-cols-3 gap-2">
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className="flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all"
              style={{
                background: lang === l.code ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                borderColor: lang === l.code ? 'var(--accent)' : 'var(--border-subtle)',
                color: lang === l.code ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              <span>{l.flag}</span>
              <span className="text-xs font-medium">{l.name}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader title="Notifications" />
        <Toggle label="Email Notifications"  description="Ticket updates and SLA alerts via email" enabled={notifs.email} onChange={v => setNotifs(p => ({...p, email: v}))} />
        <Toggle label="Push Notifications"   description="Browser push for real-time alerts"       enabled={notifs.push}  onChange={v => setNotifs(p => ({...p, push:  v}))} />
        <Toggle label="SLA Breach Alerts"    description="Immediate alert when SLA is at risk"     enabled={notifs.sla}   onChange={v => setNotifs(p => ({...p, sla:   v}))} />
      </Card>

      {/* Integrations roadmap */}
      <Card>
        <CardHeader title="Integrations" subtitle="Phase 2 and beyond" />
        <div className="grid grid-cols-2 gap-2">
          {[
            { name:'Twilio Voice/SMS', status:'Phase 3' },
            { name:'Claude AI API',    status:'Phase 2' },
            { name:'Google Maps FSO',  status:'Phase 2' },
            { name:'ERP / SAP',        status:'Phase 4' },
            { name:'Payroll System',   status:'Phase 3' },
            { name:'HRMS',             status:'Phase 3' },
          ].map(i => (
            <div key={i.name} className="rounded-lg p-2.5 flex items-center justify-between"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{i.name}</span>
              <Badge variant="default">{i.status}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Button onClick={save}>Save Settings</Button>
    </div>
  )
}
