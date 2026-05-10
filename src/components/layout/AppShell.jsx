// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — App Shell
// Persistent layout: icon rail + sidebar + topbar + content outlet
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import IconNav    from './IconNav'
import Sidebar    from './Sidebar'
import Topbar     from './Topbar'
import AIWidget   from '@/components/shared/AIWidget'

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()

  // Close sidebar on small screens when route changes
  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* ── Icon rail (always visible) ── */}
      <IconNav onToggleSidebar={() => setSidebarOpen(p => !p)} />

      {/* ── Sidebar ── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="flex-shrink-0 overflow-hidden"
          >
            <Sidebar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(p => !p)} />
        <main
          className="flex-1 overflow-y-auto p-4 md:p-5"
          style={{ background: 'var(--bg-base)' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── Persistent AI Widget ── */}
      <AIWidget />
    </div>
  )
}
