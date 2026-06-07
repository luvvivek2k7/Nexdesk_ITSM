// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — About / Support Page
// Developer info, phase roadmap, copyright & legal
// ─────────────────────────────────────────────────────────────────────────────
import { Card, CardHeader, Badge } from '@/components/shared/index.jsx'
import { Mail, Phone, Globe, Github, Shield } from 'lucide-react'

const PHASES = [
  {
    phase: 'Phase 1', status: 'complete', date: 'Jan 2026',
    items: ['ITSM Core — Incidents, Requests, Changes', 'Google SSO Authentication', 'SLA Engine (P1–P4)', 'Ticket Assignment & Routing', 'Knowledge Base', 'Service Catalog'],
  },
  {
    phase: 'Phase 2', status: 'live', date: 'May 2026',
    items: ['ITAM — Asset & CMDB Management', 'IAM — Access Governance & Approvals', 'HRMS — Onboarding & Leave', 'FSO — Field Service Dispatch', 'Visitor Management & Badging', 'Workflow Automation Designer', 'Assignment Groups & Auto-routing', 'Reports & Analytics Dashboard'],
  },
  {
    phase: 'Phase 3', status: 'planned', date: 'Q3 2026',
    items: ['Claude AI Chatbot — NLP ticket creation', 'Payroll Integration (Greythr / Zoho)', 'Mobile App (React Native)', 'Google Maps FSO dispatch', 'Advanced predictive analytics', 'ServiceNow / Jira bidirectional sync'],
  },
]

const STACK = [
  ['Frontend',        'React 18 + Vite + TailwindCSS'],
  ['Backend',         'Firebase Firestore (NoSQL)'],
  ['Authentication',  'Google SSO (Firebase Auth)'],
  ['Hosting',         'Firebase Hosting (Global CDN)'],
  ['CI/CD',           'GitHub Actions → Firebase Deploy'],
  ['Charts',          'Recharts'],
  ['Version',         '2.1.0 — Phase 2 Live'],
  ['License',         'Proprietary — All Rights Reserved'],
]

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">

      {/* Hero */}
      <div className="rounded-2xl p-8 text-center relative overflow-hidden"
        style={{ background:'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)', border:'1px solid var(--border-default)' }}>
        <div className="absolute inset-0 opacity-20"
          style={{ background:'radial-gradient(ellipse at 50% 0%, #3b62f5 0%, transparent 65%)' }} />
        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl font-black text-white"
            style={{ background:'linear-gradient(135deg,#3b62f5,#7c3aed)' }}>N</div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-3"
            style={{ background:'var(--bg-surface)', border:'1px solid var(--border-default)', color:'var(--text-muted)' }}>
            NexDesk ITSM · v2.1.0 · Phase 2 Live
          </div>
          <h1 className="text-2xl font-extrabold mb-2" style={{ color:'var(--text-primary)' }}>
            Digital Workplace Hub
          </h1>
          <p className="text-sm max-w-lg mx-auto" style={{ color:'var(--text-secondary)' }}>
            A comprehensive ITSM platform built for modern enterprise IT teams — incidents, assets,
            identity governance, field services, and HR operations in one unified platform.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Developer */}
        <Card>
          <CardHeader title="👨‍💻 Developer & Owner" />
          <div className="flex items-center gap-4 mb-5 p-3 rounded-xl"
            style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-black text-white flex-shrink-0"
              style={{ background:'linear-gradient(135deg,#3b62f5,#7c3aed)' }}>VJ</div>
            <div>
              <div className="text-base font-bold" style={{ color:'var(--text-primary)' }}>Vivekanand Jha</div>
              <div className="text-xs" style={{ color:'var(--text-muted)' }}>Solution Architect · EUC & ITSM Specialist</div>
              <div className="mt-1.5">
                <Badge variant="blue">18+ yrs Endpoint Mgmt</Badge>
              </div>
            </div>
          </div>
          <div className="space-y-2.5">
            {[
              { Icon: Mail,   label: 'luvvivek2k7@gmail.com',             href: 'mailto:luvvivek2k7@gmail.com' },
              { Icon: Phone,  label: '+91 8777390602',                    href: 'tel:+918777390602' },
              { Icon: Globe,  label: 'vivek-thehiddentruth.blogspot.com', href: 'https://vivek-thehiddentruth.blogspot.com' },
              { Icon: Github, label: 'github.com/luvvivek2k7',            href: 'https://github.com/luvvivek2k7' },
            ].map(({ Icon, label, href }) => (
              <a key={href} href={href} target="_blank" rel="noreferrer"
                className="flex items-center gap-3 text-sm hover:opacity-80 transition-opacity"
                style={{ color:'var(--accent)' }}>
                <Icon size={14} style={{ color:'var(--text-muted)', flexShrink:0 }} />
                {label}
              </a>
            ))}
          </div>
        </Card>

        {/* Stack */}
        <Card>
          <CardHeader title="📦 Platform Stack" />
          <div className="space-y-0">
            {STACK.map(([k, v]) => (
              <div key={k} className="flex justify-between py-2"
                style={{ borderBottom:'1px solid var(--border-subtle)', fontSize:12 }}>
                <span style={{ color:'var(--text-muted)' }}>{k}</span>
                <span style={{ color:'var(--text-primary)', fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Roadmap */}
      <Card>
        <CardHeader title="🗺️ Phase Roadmap" />
        <div className="grid grid-cols-3 gap-4">
          {PHASES.map(p => (
            <div key={p.phase} className="rounded-xl p-4"
              style={{ background:'var(--bg-elevated)', border:`1px solid ${p.status==='live'?'rgba(59,98,245,0.4)':p.status==='complete'?'rgba(34,197,94,0.3)':'var(--border-subtle)'}` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm" style={{ color:'var(--text-primary)' }}>{p.phase}</span>
                <Badge variant={p.status==='live'?'blue':p.status==='complete'?'green':'default'}>
                  {p.status==='live'?'● Live':p.status==='complete'?'✓ Complete':'Planned'}
                </Badge>
              </div>
              <div className="text-xs mb-3" style={{ color:'var(--text-muted)' }}>{p.date}</div>
              <ul className="space-y-1">
                {p.items.map(item => (
                  <li key={item} className="text-xs flex gap-1.5" style={{ color:'var(--text-secondary)' }}>
                    <span style={{ color: p.status==='planned'?'var(--text-muted)':'var(--accent)', flexShrink:0 }}>
                      {p.status==='planned'?'○':'✓'}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      {/* Copyright */}
      <div className="rounded-2xl p-6"
        style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-default)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} style={{ color:'var(--accent)' }} />
          <h2 className="text-sm font-bold" style={{ color:'var(--text-primary)' }}>
            Copyright &amp; Legal Notice
          </h2>
        </div>
        <div className="text-xs leading-relaxed space-y-3" style={{ color:'var(--text-secondary)' }}>
          <p>
            <strong style={{ color:'var(--text-primary)' }}>Copyright © 2024–2026 Vivekanand Jha. All Rights Reserved.</strong>
          </p>
          <p>
            NexDesk ITSM ("the Software") is the proprietary intellectual property of Vivekanand Jha.
            This Software, including all source code, design assets, data models, workflows, and documentation,
            is protected under applicable copyright laws of India and international treaties.
          </p>
          <p>
            <strong style={{ color:'var(--text-primary)' }}>Restrictions: </strong>
            Unauthorized copying, reproduction, modification, distribution, sublicensing, or use of this Software —
            in whole or in part — is strictly prohibited without prior written permission from the copyright holder.
            Any unauthorized use constitutes copyright infringement and may result in civil and criminal liability
            under the Copyright Act, 1957 (India) and applicable international law.
          </p>
          <p>
            <strong style={{ color:'var(--text-primary)' }}>Permitted Use: </strong>
            This Software is deployed for internal organizational use only. Access is granted solely to authorized
            users as defined by the system administrator. No right, title, or interest in the Software is
            transferred to any user by virtue of authorized access.
          </p>
          <p>
            <strong style={{ color:'var(--text-primary)' }}>Third-Party Components: </strong>
            This Software incorporates open-source libraries (Firebase SDK, React, Recharts, Lucide Icons, etc.)
            which remain subject to their respective licenses. Use of this Software does not grant rights to those
            components beyond what their respective licenses permit.
          </p>
          <p>
            <strong style={{ color:'var(--text-primary)' }}>Disclaimer: </strong>
            This Software is provided "as is" without warranty of any kind, express or implied.
            The developer shall not be liable for any damages arising from its use.
          </p>
          <p style={{ color:'var(--text-muted)' }}>
            For licensing enquiries: <a href="mailto:luvvivek2k7@gmail.com" style={{ color:'var(--accent)' }}>luvvivek2k7@gmail.com</a> · +91 8777390602
          </p>
        </div>
      </div>

    </div>
  )
}
