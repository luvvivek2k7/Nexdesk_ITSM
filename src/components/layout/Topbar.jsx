// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Topbar
// Global header: breadcrumb, search, new ticket, persona badge, user menu
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation }    from 'react-router-dom'
import {
  Search, Plus, Bell, ChevronDown, LogOut,
  User, Settings, Sun, Moon,
} from 'lucide-react'
import { useAuth }  from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { ROLE_META } from '@/lib/constants'
import clsx from 'clsx'

// Build breadcrumb from path
function useBreadcrumb() {
  const location = useLocation()
  const parts = location.pathname.split('/').filter(Boolean)
  return parts.map((p, i) => ({
    label: p.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    path:  '/' + parts.slice(0, i + 1).join('/'),
    last:  i === parts.length - 1,
  }))
}

export default function Topbar({ onToggleSidebar }) {
  const navigate    = useNavigate()
  const { profile, signOut } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const breadcrumb  = useBreadcrumb()
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const menuRef = useRef(null)

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const roleMeta = ROLE_META[profile?.role]

  return (
    <header
      className="flex items-center gap-3 px-4 flex-shrink-0 z-10"
      style={{
        height: 52,
        background:  'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
        {breadcrumb.map((crumb, i) => (
          <span key={crumb.path} className="flex items-center gap-1">
            {i > 0 && <span style={{ color: 'var(--text-muted)' }} className="text-xs">/</span>}
            <button
              onClick={() => !crumb.last && navigate(crumb.path)}
              className={clsx(
                'text-[13px] transition-colors whitespace-nowrap',
                crumb.last
                  ? 'font-semibold cursor-default'
                  : 'hover:text-blue-400 cursor-pointer',
              )}
              style={{ color: crumb.last ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              {crumb.label}
            </button>
          </span>
        ))}
      </nav>

      {/* Search */}
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all duration-150"
        style={{
          background:  'var(--bg-elevated)',
          border:      '1px solid var(--border-default)',
          width:       180,
        }}
      >
        <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search…"
          value={searchVal}
          onChange={e => setSearchVal(e.target.value)}
          className="bg-transparent border-none outline-none text-xs flex-1"
          style={{ color: 'var(--text-primary)' }}
        />
        <kbd
          className="text-[10px] px-1 rounded hidden sm:block"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-hover)' }}
        >
          ⌘K
        </kbd>
      </div>

      {/* New Ticket */}
      <button
        onClick={() => navigate('/itsm/tickets/new')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all duration-150 flex-shrink-0"
        style={{ background: 'var(--accent)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
      >
        <Plus size={13} />
        <span className="hidden sm:inline">New Ticket</span>
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 flex-shrink-0"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        title={isDark ? 'Light mode' : 'Dark mode'}
      >
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      {/* Notifications */}
      <button
        onClick={() => navigate('/notifications')}
        className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 flex-shrink-0"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <Bell size={15} />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
      </button>

      {/* User menu */}
      <div className="relative flex-shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(p => !p)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all duration-150"
          style={{ border: '1px solid var(--border-default)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {/* Avatar */}
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#3b62f5,#7c3aed)' }}
          >
            {profile?.photoURL
              ? <img src={profile.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
              : <span className="text-white text-[10px] font-bold">
                  {profile?.displayName?.charAt(0) ?? 'U'}
                </span>
            }
          </div>

          {/* Name + role */}
          <div className="hidden md:block text-left">
            <p className="text-xs font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
              {profile?.displayName?.split(' ')[0] ?? 'User'}
            </p>
            {roleMeta && (
              <p className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>
                {roleMeta.label}
              </p>
            )}
          </div>

          <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} className={clsx('transition-transform', menuOpen && 'rotate-180')} />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1.5 w-52 rounded-xl overflow-hidden z-50 py-1"
            style={{
              background:  'var(--bg-elevated)',
              border:      '1px solid var(--border-default)',
              boxShadow:   '0 8px 30px rgba(0,0,0,0.25)',
            }}
          >
            {/* Persona badge */}
            {roleMeta && (
              <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {profile?.displayName}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {profile?.email}
                </p>
                <span
                  className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{
                    background: `var(--accent-subtle)`,
                    color: 'var(--accent)',
                    border: '1px solid var(--accent-border)',
                  }}
                >
                  {roleMeta.label}
                </span>
              </div>
            )}

            <MenuAction icon={User}     label="Profile"         onClick={() => { navigate('/profile');         setMenuOpen(false) }} />
            <MenuAction icon={Settings} label="Settings"        onClick={() => { navigate('/admin/settings'); setMenuOpen(false) }} />
            <MenuAction icon={isDark ? Sun : Moon} label={isDark ? 'Light Mode' : 'Dark Mode'} onClick={() => { toggleTheme(); setMenuOpen(false) }} />

            <div className="h-px my-1" style={{ background: 'var(--border-subtle)' }} />

            <MenuAction icon={LogOut} label="Sign Out" onClick={signOut} danger />
          </div>
        )}
      </div>
    </header>
  )
}

function MenuAction({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors"
      style={{ color: danger ? 'var(--danger)' : 'var(--text-secondary)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}
