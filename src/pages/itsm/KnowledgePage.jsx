// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Knowledge Base Page
// Full searchable article library with categories, ratings, and related links
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ThumbsUp, Eye, BookOpen, Plus, ChevronRight, Tag } from 'lucide-react'
import { Card, CardHeader, Badge, Button, AIInsight, EmptyState } from '@/components/shared/index.jsx'
import { useAuth } from '@/context/AuthContext'
import { ROLES } from '@/lib/constants'

const ARTICLES = [
  {
    id: 1,
    title: 'VPN Troubleshooting — Common Issues & Fixes',
    cat: 'Network',
    excerpt: 'Step-by-step guide to resolve VPN connection drops, authentication failures, and slow throughput on Windows and Mac.',
    views: 1234, helpful: 94, tags: ['vpn', 'network', 'remote', 'windows', 'mac'],
    sections: ['Cannot connect', 'Connection drops', 'Slow speed', 'Authentication error'],
  },
  {
    id: 2,
    title: 'Self-Service Password Reset — Step by Step',
    cat: 'Access',
    excerpt: 'How to reset your Active Directory, SAP, or application password without raising a ticket.',
    views: 892, helpful: 98, tags: ['password', 'access', 'account', 'self-service'],
    sections: ['AD password', 'SAP password', 'MFA reset', 'Locked account'],
  },
  {
    id: 3,
    title: 'Setting up Exchange ActiveSync on iPhone & Android',
    cat: 'Email',
    excerpt: 'Configure corporate email on mobile devices with step-by-step screenshots for iOS 17 and Android 14.',
    views: 678, helpful: 89, tags: ['email', 'mobile', 'activesync', 'iphone', 'android'],
    sections: ['iOS setup', 'Android setup', 'Troubleshooting sync', 'SSL certificate errors'],
  },
  {
    id: 4,
    title: 'Installing Microsoft 365 Apps — Complete Guide',
    cat: 'Software',
    excerpt: 'How to install Word, Excel, Outlook, and Teams from the company portal on Windows and Mac.',
    views: 543, helpful: 91, tags: ['office', 'm365', 'install', 'word', 'excel', 'teams'],
    sections: ['Windows install', 'Mac install', 'Activation', 'License errors'],
  },
  {
    id: 5,
    title: 'Adding Network Printers on Windows & Mac',
    cat: 'Hardware',
    excerpt: 'Step-by-step guide to add a network printer by IP address or via the IT portal.',
    views: 421, helpful: 85, tags: ['printer', 'hardware', 'network', 'windows', 'mac'],
    sections: ['Windows 11', 'Windows 10', 'macOS', 'Print queue issues'],
  },
  {
    id: 6,
    title: 'Microsoft Teams — Audio, Video & Meeting Issues',
    cat: 'Software',
    excerpt: 'Resolve echo, no audio, camera not working, and meeting join problems in Microsoft Teams.',
    views: 389, helpful: 88, tags: ['teams', 'audio', 'video', 'meetings', 'microsoft'],
    sections: ['No audio', 'Echo feedback', 'Camera not working', 'Cannot join meeting'],
  },
  {
    id: 7,
    title: 'How to Request VPN Access for Remote Work',
    cat: 'Access',
    excerpt: 'Process for requesting corporate VPN access as a new joiner or contractor.',
    views: 312, helpful: 96, tags: ['vpn', 'access', 'remote', 'new joiner', 'contractor'],
    sections: ['Eligibility', 'Request process', 'Setup after approval', 'FAQ'],
  },
  {
    id: 8,
    title: 'Cloud Storage — OneDrive & SharePoint Guide',
    cat: 'Software',
    excerpt: 'Set up OneDrive sync, share files on SharePoint, and manage storage quota.',
    views: 267, helpful: 92, tags: ['cloud', 'onedrive', 'sharepoint', 'storage', 'sync'],
    sections: ['OneDrive setup', 'SharePoint access', 'Sharing files', 'Storage limits'],
  },
  {
    id: 9,
    title: 'Multi-Factor Authentication (MFA) Setup Guide',
    cat: 'Security',
    excerpt: 'Enable and configure MFA using Microsoft Authenticator or Google Authenticator.',
    views: 198, helpful: 97, tags: ['mfa', '2fa', 'security', 'authenticator', 'otp'],
    sections: ['Microsoft Authenticator', 'Google Authenticator', 'Backup codes', 'New device setup'],
  },
  {
    id: 10,
    title: 'Reporting a Phishing or Suspicious Email',
    cat: 'Security',
    excerpt: 'How to identify phishing emails and report them to the security team immediately.',
    views: 156, helpful: 99, tags: ['phishing', 'security', 'email', 'scam', 'report'],
    sections: ['Identify phishing', 'How to report', 'Do not click', 'What happens next'],
  },
  {
    id: 11,
    title: 'Laptop Refresh Cycle — When & How to Request',
    cat: 'Hardware',
    excerpt: 'Understand the 3-year laptop refresh policy and how to initiate your upgrade request.',
    views: 134, helpful: 82, tags: ['laptop', 'hardware', 'refresh', 'upgrade', 'policy'],
    sections: ['Eligibility check', 'Requesting a refresh', 'Data migration', 'Return old device'],
  },
  {
    id: 12,
    title: 'NexDesk — How to Raise and Track Tickets',
    cat: 'Platform',
    excerpt: 'Getting started with NexDesk: raise incidents, track requests, use the service catalog, and read notifications.',
    views: 89, helpful: 95, tags: ['nexdesk', 'itsm', 'ticket', 'help', 'platform'],
    sections: ['Raise a ticket', 'Track progress', 'Add comments', 'Service catalog', 'Notifications'],
  },
]

const CATEGORIES = ['All', ...new Set(ARTICLES.map(a => a.cat))]

export default function KnowledgePage() {
  const navigate           = useNavigate()
  const { role }           = useAuth()
  const [search,  setSearch]  = useState('')
  const [activeCat, setActiveCat] = useState('All')
  const [selected, setSelected]   = useState(null)

  const filtered = ARTICLES.filter(a => {
    const matchCat    = activeCat === 'All' || a.cat === activeCat
    const matchSearch = !search.trim() ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.excerpt.toLowerCase().includes(search.toLowerCase()) ||
      a.tags.some(t => t.includes(search.toLowerCase()))
    return matchCat && matchSearch
  })

  // Article detail view
  if (selected) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
          ← Back to Knowledge Base
        </Button>
        <Card>
          <div className="flex items-start gap-3 mb-4">
            <Badge variant="blue">{selected.cat}</Badge>
          </div>
          <h1 className="text-base font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {selected.title}
          </h1>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
            {selected.excerpt}
          </p>
          <div className="space-y-1 mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Contents
            </p>
            {selected.sections.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm py-1.5 rounded-lg px-2 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors">
                <ChevronRight size={12} style={{ color: 'var(--accent)' }} />
                <span style={{ color: 'var(--text-primary)' }}>{s}</span>
              </div>
            ))}
          </div>
          <AIInsight type="info">
            This article is a placeholder for Phase 1. Full article editor with rich text, images, and version history is coming in Phase 2.
          </AIInsight>
          <div className="flex items-center gap-3 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Eye size={11} /> {selected.views} views
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <ThumbsUp size={11} /> {selected.helpful}% helpful
            </div>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => navigate('/itsm/tickets/new')}>
              Still need help? Raise ticket
            </Button>
          </div>
        </Card>
        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          <Tag size={12} style={{ color: 'var(--text-muted)' }} />
          {selected.tags.map(tag => (
            <span key={tag}
              className="px-2 py-0.5 rounded-full text-[11px] cursor-pointer"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
              onClick={() => { setSearch(tag); setSelected(null) }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Knowledge Base</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {ARTICLES.length} articles · Search before raising a ticket — save time.
          </p>
        </div>
        {[ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT].includes(role) && (
          <Button size="sm" icon={Plus}>New Article</Button>
        )}
      </div>

      {/* Search bar */}
      <div
        className="flex items-center gap-2 rounded-xl px-4 py-3"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search articles, topics, tags…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm flex-1"
          style={{ color: 'var(--text-primary)' }}
          autoFocus
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs px-2 py-0.5 rounded-md"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
            Clear
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCat(cat)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
            style={{
              background:  activeCat === cat ? 'var(--accent-subtle)' : 'transparent',
              borderColor: activeCat === cat ? 'var(--accent-border)' : 'var(--border-default)',
              color:       activeCat === cat ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            {cat} {cat !== 'All' && `(${ARTICLES.filter(a => a.cat === cat).length})`}
          </button>
        ))}
      </div>

      {/* Article grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No articles found"
          description={`No articles match "${search}". Try different keywords.`}
          action={
            <Button size="sm" onClick={() => navigate('/itsm/tickets/new')}>
              Raise a ticket instead
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(article => (
            <button
              key={article.id}
              onClick={() => setSelected(article)}
              className="rounded-xl p-4 text-left transition-all duration-150 group"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'var(--bg-surface)' }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <Badge variant="blue" className="text-[10px] flex-shrink-0">{article.cat}</Badge>
                <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
                  style={{ color: 'var(--accent)' }} />
              </div>
              <h3
                className="text-sm font-semibold mb-1.5 leading-snug"
                style={{ color: 'var(--text-primary)' }}
              >
                {article.title}
              </h3>
              <p className="text-[11px] leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>
                {article.excerpt.substring(0, 100)}…
              </p>
              <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1"><Eye size={10} />{article.views.toLocaleString()}</span>
                <span className="flex items-center gap-1"><ThumbsUp size={10} />{article.helpful}%</span>
                <span className="flex flex-wrap gap-1 ml-auto">
                  {article.tags.slice(0, 2).map(t => (
                    <span key={t} className="px-1.5 py-0.5 rounded-full"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                      {t}
                    </span>
                  ))}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Still need help? */}
      <div
        className="rounded-xl p-4 flex items-center justify-between gap-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Can't find what you need?
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Raise a support ticket and an IT agent will help you.
          </p>
        </div>
        <Button size="sm" onClick={() => navigate('/itsm/tickets/new')}>
          Raise Ticket
        </Button>
      </div>
    </div>
  )
}
