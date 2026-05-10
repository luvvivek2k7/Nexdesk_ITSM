// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Service Catalog Page
// Browse and request IT services with category filters and SLA preview
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Search, Star, ArrowRight } from 'lucide-react'
import { Card, CardHeader, AIInsight, Badge } from '@/components/shared/index.jsx'

const CATALOG = [
  // Hardware
  { id:'laptop-req',     group:'Hardware',  name:'Laptop Request',           desc:'New or replacement laptop. Specify model preference.',        sla:'3 business days', icon:'💻', popular:true,  type:'SERVICE_REQUEST', cat:'hardware'  },
  { id:'desktop-req',    group:'Hardware',  name:'Desktop / Workstation',    desc:'Desktop setup or replacement for office use.',                sla:'3 business days', icon:'🖥',  popular:false, type:'SERVICE_REQUEST', cat:'hardware'  },
  { id:'printer-setup',  group:'Hardware',  name:'Printer Setup',            desc:'Add or replace a network printer.',                           sla:'1 business day',  icon:'🖨',  popular:false, type:'SERVICE_REQUEST', cat:'hardware'  },
  { id:'peripheral',     group:'Hardware',  name:'Peripheral Request',       desc:'Mouse, keyboard, headset, webcam, docking station.',          sla:'2 business days', icon:'🖱',  popular:false, type:'SERVICE_REQUEST', cat:'hardware'  },
  // Access & Identity
  { id:'vpn-access',     group:'Access',    name:'VPN Access',               desc:'Remote access VPN credentials and setup.',                    sla:'2 hours',         icon:'🔐', popular:true,  type:'SERVICE_REQUEST', cat:'access'    },
  { id:'password-reset', group:'Access',    name:'Password Reset',           desc:'Self-service or agent-assisted password reset.',              sla:'30 minutes',      icon:'🔑', popular:true,  type:'SERVICE_REQUEST', cat:'access'    },
  { id:'new-user',       group:'Access',    name:'New User Provisioning',    desc:'Create accounts for new joiners across all systems.',         sla:'4 hours',         icon:'👤', popular:false, type:'SERVICE_REQUEST', cat:'access'    },
  { id:'access-revoke',  group:'Access',    name:'Access Revocation',        desc:'Remove access for leavers or role changes.',                  sla:'2 hours',         icon:'🚫', popular:false, type:'SERVICE_REQUEST', cat:'access'    },
  { id:'mfa-setup',      group:'Access',    name:'MFA / 2FA Setup',          desc:'Set up multi-factor authentication for any service.',         sla:'1 hour',          icon:'🛡', popular:false, type:'SERVICE_REQUEST', cat:'access'    },
  // Software
  { id:'software-inst',  group:'Software',  name:'Software Installation',    desc:'Licensed software deployment to your device.',                sla:'4 hours',         icon:'📦', popular:true,  type:'SERVICE_REQUEST', cat:'software'  },
  { id:'license-req',    group:'Software',  name:'License Request',          desc:'Request a new software license for approved tools.',          sla:'24 hours',        icon:'📋', popular:false, type:'SERVICE_REQUEST', cat:'software'  },
  { id:'m365-support',   group:'Software',  name:'Microsoft 365 Support',    desc:'Outlook, Teams, Word, Excel, SharePoint issues.',             sla:'4 hours',         icon:'📊', popular:true,  type:'INCIDENT',        cat:'software'  },
  // Network
  { id:'network-point',  group:'Network',   name:'Network Point Request',    desc:'New ethernet port or Wi-Fi access point.',                    sla:'2 business days', icon:'📡', popular:false, type:'SERVICE_REQUEST', cat:'network'   },
  { id:'vpn-trouble',    group:'Network',   name:'VPN Troubleshooting',      desc:'VPN connection issues — drops, slow, or refused.',            sla:'2 hours',         icon:'🌐', popular:true,  type:'INCIDENT',        cat:'network'   },
  { id:'wifi-issue',     group:'Network',   name:'Wi-Fi Connectivity',       desc:'Wireless connectivity issues in office or meeting rooms.',    sla:'2 hours',         icon:'📶', popular:false, type:'INCIDENT',        cat:'network'   },
  // Email & Comms
  { id:'email-setup',    group:'Email',     name:'Email Configuration',      desc:'Set up email on phone, Outlook, or new device.',              sla:'4 hours',         icon:'📧', popular:false, type:'SERVICE_REQUEST', cat:'email'     },
  { id:'email-trouble',  group:'Email',     name:'Email Not Working',        desc:'Cannot send, receive, or sync email.',                        sla:'2 hours',         icon:'✉️', popular:false, type:'INCIDENT',        cat:'email'     },
  { id:'teams-support',  group:'Email',     name:'Teams / Meetings',         desc:'Microsoft Teams audio, video, or meeting issues.',            sla:'2 hours',         icon:'💬', popular:false, type:'INCIDENT',        cat:'email'     },
  // Cloud & Server
  { id:'cloud-access',   group:'Cloud',     name:'Cloud Resource Access',    desc:'AWS, Azure, or GCP resource access or provisioning.',         sla:'8 hours',         icon:'☁️', popular:false, type:'SERVICE_REQUEST', cat:'server'    },
  { id:'server-issue',   group:'Cloud',     name:'Server / Application Down',desc:'Critical service outage or application unavailability.',      sla:'1 hour',          icon:'🖥',  popular:false, type:'INCIDENT',        cat:'server'    },
  // Security
  { id:'security-review',group:'Security',  name:'Security Review Request',  desc:'Request a security assessment for a new system or change.',   sla:'2 business days', icon:'🔒', popular:false, type:'SERVICE_REQUEST', cat:'security'  },
  { id:'phishing-report',group:'Security',  name:'Report Phishing Email',    desc:'Report a suspicious email or potential security threat.',     sla:'30 minutes',      icon:'🎣', popular:false, type:'INCIDENT',        cat:'security'  },
]

const GROUPS = ['All', ...new Set(CATALOG.map(c => c.group))]

export default function ServiceCatalogPage() {
  const navigate       = useNavigate()
  const [activeGroup, setActiveGroup] = useState('All')
  const [search,      setSearch]      = useState('')

  const filtered = CATALOG.filter(item => {
    const matchGroup  = activeGroup === 'All' || item.group === activeGroup
    const matchSearch = !search.trim() ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.desc.toLowerCase().includes(search.toLowerCase())
    return matchGroup && matchSearch
  })

  const popular = CATALOG.filter(c => c.popular)

  const handleRequest = (item) => {
    navigate(`/itsm/tickets/new?type=${item.type}&category=${item.cat}&title=${encodeURIComponent(item.name)}`)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Service Catalog</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Browse {CATALOG.length} services. SLA countdown starts on submission.
        </p>
      </div>

      {/* AI recommendation */}
      <AIInsight type="info">
        <strong>AI Recommends:</strong> Based on recent activity, <strong>VPN Access</strong>, <strong>Password Reset</strong> and <strong>Microsoft 365 Support</strong> are trending this week.
        Check the Knowledge Base first — 34% of requests resolve without a ticket.
      </AIInsight>

      {/* Popular items */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Star size={13} style={{ color: 'var(--warning)' }} />
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Most Requested
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {popular.map(item => (
            <button
              key={item.id}
              onClick={() => handleRequest(item)}
              className="rounded-xl p-3.5 text-left transition-all hover:scale-[1.02] hover:shadow-lg"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid rgba(59,98,245,0.2)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,98,245,0.45)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(59,98,245,0.2)' }}
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
              <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                <Clock size={9} />
                {item.sla}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 min-w-48"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search services…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm flex-1"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {GROUPS.map(g => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
              style={{
                background:   activeGroup === g ? 'var(--accent-subtle)' : 'transparent',
                borderColor:  activeGroup === g ? 'var(--accent-border)' : 'var(--border-default)',
                color:        activeGroup === g ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Full catalog grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(item => (
          <button
            key={item.id}
            onClick={() => handleRequest(item)}
            className="rounded-xl p-4 text-left transition-all duration-150 group"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'var(--bg-surface)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight mb-1" style={{ color: 'var(--text-primary)' }}>
                    {item.name}
                  </p>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {item.desc}
                  </p>
                </div>
              </div>
              <ArrowRight
                size={14}
                className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--accent)' }}
              />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="default" className="text-[10px] flex items-center gap-1">
                <Clock size={9} /> {item.sla}
              </Badge>
              <Badge variant={item.type === 'INCIDENT' ? 'red' : 'blue'} className="text-[10px]">
                {item.type === 'INCIDENT' ? 'Incident' : 'Request'}
              </Badge>
              {item.popular && (
                <Badge variant="amber" className="text-[10px]">Popular</Badge>
              )}
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
          No services match your search. Try a different term or browse all categories.
        </div>
      )}
    </div>
  )
}
