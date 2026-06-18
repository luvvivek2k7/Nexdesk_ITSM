// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Auth Context  (Sprint 1 — Multi-Tenant, Allowlist, OrgId)
//
// Security model:
//  1. Only pre-created users (admin-created placeholders) can log in.
//  2. Super admin email is always allowed (bootstrap).
//  3. Every user doc carries orgId for multi-tenant isolation.
//  4. Placeholder users (isPlaceholder=true) are merged on first real login.
//  5. Inactive users (active=false) are rejected with "Account deactivated".
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  auth, db, signInWithGoogle, signOutUser, onAuthChange,
  doc, getDoc, setDoc, updateDoc, getDocs, collection,
  query, where, serverTimestamp,
} from '@/lib/firebase'
import { ROLES } from '@/lib/constants'

// ── Designated system Super Admin (always has access) ────────────────────────
const SUPER_ADMIN_EMAIL = 'luvvivek2k7@gmail.com'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null)
  const [profile,     setProfile]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [authError,   setAuthError]   = useState(null)  // 'denied' | 'deactivated' | null

  // ── Load profile — with allowlist enforcement ────────────────────────────
  const loadProfile = useCallback(async (firebaseUser) => {
    if (!firebaseUser) { setProfile(null); return }

    const email   = firebaseUser.email
    const uid     = firebaseUser.uid
    const userRef = doc(db, 'users', uid)

    try {
      // 1. Check if exact UID doc exists (returning user or already merged)
      const snap = await getDoc(userRef)

      if (snap.exists()) {
        const data = snap.data()

        // Block inactive users
        if (data.active === false) {
          await signOutUser()
          setAuthError('deactivated')
          setProfile(null)
          return
        }

        // Always ensure super admin email has correct role
        if (email === SUPER_ADMIN_EMAIL && data.role !== ROLES.SUPER_ADMIN) {
          await updateDoc(userRef, { role: ROLES.SUPER_ADMIN, updatedAt: serverTimestamp() })
          data.role = ROLES.SUPER_ADMIN
        }

        updateDoc(userRef, { lastSeenAt: serverTimestamp(), uid }).catch(() => {})
        setProfile({ id: uid, ...data })
        setAuthError(null)
        return
      }

      // 2. Super admin bootstrap (no existing doc)
      if (email === SUPER_ADMIN_EMAIL) {
        const saProfile = {
          uid, email,
          displayName:   firebaseUser.displayName ?? 'Vivekanand Jha',
          photoURL:      firebaseUser.photoURL ?? null,
          role:          ROLES.SUPER_ADMIN,
          orgId:         'system',
          orgName:       'NexDesk System',
          department:    'IT',
          phone:         '+91 8777390602',
          employeeId:    'SA-001',
          active:        true,
          isPlaceholder: false,
          createdAt:     serverTimestamp(),
          lastSeenAt:    serverTimestamp(),
          updatedAt:     serverTimestamp(),
          preferences:   { theme: 'dark', language: 'en', notifications: { email: true, push: true, sla: true } },
        }
        await setDoc(userRef, saProfile)
        setProfile({ id: uid, ...saProfile })
        setAuthError(null)
        return
      }

      // 3. No UID doc — search for placeholder by email only (single where = no composite index needed)
      let placeholderSnap
      try {
        placeholderSnap = await getDocs(
          query(collection(db, 'users'), where('email', '==', email.toLowerCase()))
        )
      } catch (queryErr) {
        console.warn('Placeholder query failed:', queryErr.message)
        // If query fails due to permissions, deny access
        await signOutUser()
        setAuthError('denied')
        setProfile(null)
        return
      }

      if (placeholderSnap.empty) {
        // No record found — this email is not allowlisted
        await signOutUser()
        setAuthError('denied')
        setProfile(null)
        return
      }

      // Found user record — check it's a placeholder (not an old/duplicate doc)
      const placeholder     = placeholderSnap.docs[0]
      const placeholderData = placeholder.data()

      // If found doc is active=false, block them
      if (placeholderData.active === false) {
        await signOutUser()
        setAuthError('deactivated')
        setProfile(null)
        return
      }

      // Merge placeholder into real Firebase UID doc
      const mergedProfile = {
        ...placeholderData,
        uid,
        email:         email.toLowerCase(),
        photoURL:      firebaseUser.photoURL ?? placeholderData.photoURL ?? null,
        displayName:   placeholderData.displayName || firebaseUser.displayName || email.split('@')[0],
        isPlaceholder: false,
        lastSeenAt:    serverTimestamp(),
        updatedAt:     serverTimestamp(),
        active:        true,
      }

      await setDoc(userRef, mergedProfile)

      // Remove old placeholder doc (best effort, don't block if fails)
      if (placeholder.id !== uid) {
        placeholder.ref.delete().catch(() => {})
      }

      setProfile({ id: uid, ...mergedProfile })
      setAuthError(null)

    } catch (err) {
      console.error('loadProfile error:', err)
      if (email === SUPER_ADMIN_EMAIL) {
        // Super admin fallback — offline mode
        setProfile({
          id: uid, uid, email,
          displayName: firebaseUser.displayName ?? 'Vivekanand Jha',
          role:        ROLES.SUPER_ADMIN,
          orgId:       'system',
          active:      true,
          _offline:    true,
        })
        setAuthError(null)
      } else {
        // For other users: show error but don't sign them out yet
        // They may be offline — let them retry
        setAuthError('error')
        setProfile(null)
      }
    }
  }, [])

  // ── Auth state listener ──────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        await loadProfile(firebaseUser)
      } else {
        setProfile(null)
        // Don't clear authError here — let the UI show the denial message
      }
      setLoading(false)
    })
    return unsub
  }, [loadProfile])

  // ── Sign in ──────────────────────────────────────────────────────────────
  const signIn = async () => {
    setAuthError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      const msg =
        err.code === 'auth/popup-closed-by-user'   ? 'Sign-in popup closed. Please try again.' :
        err.code === 'auth/network-request-failed'  ? 'Network error. Check your connection.' :
        err.code === 'auth/unauthorized-domain'     ? 'Domain not authorised in Firebase Console.' :
        err.message
      setAuthError(msg)
      throw err
    }
  }

  // ── Sign out ─────────────────────────────────────────────────────────────
  const signOut = async () => {
    await signOutUser()
    setUser(null)
    setProfile(null)
    setAuthError(null)
  }

  // ── Update own profile ───────────────────────────────────────────────────
  const updateProfile = async (updates) => {
    if (!user) throw new Error('Not signed in')
    await updateDoc(doc(db, 'users', user.uid), { ...updates, updatedAt: serverTimestamp() })
    setProfile(prev => ({ ...prev, ...updates }))
  }

  // ── Assign role to another user ──────────────────────────────────────────
  const assignRole = async (targetUserId, newRole) => {
    if (!can('ASSIGN_ROLES') && profile?.role !== ROLES.SUPER_ADMIN) {
      throw new Error('Insufficient permissions')
    }
    await updateDoc(doc(db, 'users', targetUserId), {
      role: newRole,
      updatedAt: serverTimestamp(),
    })
  }

  // ── Create pre-authorised placeholder user ───────────────────────────────
  // Admin creates this — user can then log in with their Google account (matching email)
  const createPlaceholderUser = async ({ email, displayName, role, department, phone, orgId, orgName, employeeId }) => {
    if (!isAdmin) throw new Error('Admin access required')

    const targetOrgId = orgId ?? profile?.orgId ?? 'system'

    // Check not already exists
    const existing = await getDocs(
      query(collection(db, 'users'), where('email', '==', email))
    )
    if (!existing.empty) throw new Error('User with this email already exists')

    const placeholderId = `ph_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
    const ref = doc(db, 'users', placeholderId)

    await setDoc(ref, {
      uid:           placeholderId,
      email:         email.toLowerCase().trim(),
      displayName:   displayName.trim(),
      photoURL:      null,
      role:          role ?? ROLES.USER,
      orgId:         targetOrgId,
      orgName:       orgName ?? profile?.orgName ?? '',
      department:    department ?? '',
      phone:         phone ?? '',
      employeeId:    employeeId ?? '',
      active:        true,
      isPlaceholder: true,
      allowedToLogin: true,
      createdBy:     profile?.uid,
      createdByName: profile?.displayName,
      createdAt:     serverTimestamp(),
      lastSeenAt:    null,
      updatedAt:     serverTimestamp(),
      preferences:   { theme: 'dark', language: 'en', notifications: { email: true, push: true, sla: true } },
    })
    return placeholderId
  }

  // ── Write audit log entry ────────────────────────────────────────────────
  const audit = async (action, module, target = null, meta = {}) => {
    if (!profile) return
    try {
      const { addDoc, collection: col } = await import('@/lib/firebase')
      await addDoc(col(db, 'audit_logs'), {
        actor:     profile.displayName,
        actorId:   profile.uid,
        actorRole: profile.role,
        orgId:     profile.orgId ?? 'system',
        action,
        module,
        target,
        meta,
        result:    'success',
        timestamp: serverTimestamp(),
      })
    } catch (e) {
      console.warn('Audit log write failed:', e)
    }
  }

  // ── Permission checker ───────────────────────────────────────────────────
  const can = useCallback((permission) => {
    if (!profile) return false
    const PERMS = {
      // System
      ASSIGN_ROLES:        [ROLES.SUPER_ADMIN],
      MANAGE_USERS:        [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN],
      MANAGE_SETTINGS:     [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN],
      ACCESS_ADMIN_PANEL:  [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN],
      MANAGE_ORG:          [ROLES.SUPER_ADMIN],
      // Tickets
      VIEW_ALL_TICKETS:    [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT, ROLES.MANAGER],
      CREATE_TICKET:       Object.values(ROLES),
      EDIT_ANY_TICKET:     [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT],
      DELETE_TICKET:       [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN],
      ASSIGN_TICKET:       [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT, ROLES.MANAGER],
      CLOSE_TICKET:        [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT],
      APPROVE_CHANGE:      [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER],
      MANAGE_SLA:          [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN],
      // ITAM
      VIEW_ASSETS:         [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT, ROLES.MANAGER],
      MANAGE_ASSETS:       [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT],
      // HRMS — HR and above
      VIEW_EMPLOYEES:      [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT, ROLES.MANAGER, ROLES.HR],
      MANAGE_EMPLOYEES:    [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.HR],
      VIEW_LEAVE:          [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER, ROLES.HR],
      APPROVE_LEAVE:       [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER, ROLES.HR],
      // IAM
      VIEW_ACCESS_REQUESTS:[ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER],
      APPROVE_ACCESS:      [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER],
      // FSO
      VIEW_WORK_ORDERS:    [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER, ROLES.FIELD_ENGINEER],
      MANAGE_WORK_ORDERS:  [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER, ROLES.FIELD_ENGINEER],
      // Visitors
      VIEW_VISITORS:       [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT, ROLES.MANAGER],
      MANAGE_VISITORS:     [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT, ROLES.MANAGER],
      // Reports
      VIEW_ALL_REPORTS:    [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER],
      VIEW_TEAM_REPORTS:   [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER, ROLES.IT_AGENT],
      // Admin
      MANAGE_WORKFLOWS:    [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN],
      MANAGE_GROUPS:       [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN],
      VIEW_AUDIT_LOGS:     [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN],
      MANAGE_ROLES:        [ROLES.SUPER_ADMIN],
    }
    return (PERMS[permission] ?? []).includes(profile.role)
  }, [profile])

  const hasRole    = useCallback((...roles) => roles.includes(profile?.role), [profile])
  const isAdmin    = hasRole(ROLES.SUPER_ADMIN, ROLES.IT_ADMIN)
  const isAgent    = hasRole(ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT)
  const isManager  = hasRole(ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER)
  const isHR       = hasRole(ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.HR, ROLES.MANAGER)
  const isFSO      = hasRole(ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.FIELD_ENGINEER, ROLES.MANAGER)
  const isSuper    = profile?.role === ROLES.SUPER_ADMIN

  const value = {
    user, profile, loading, authError,
    signIn, signOut,
    updateProfile, assignRole, createPlaceholderUser, audit,
    can, hasRole,
    isAdmin, isAgent, isManager, isHR, isFSO, isSuper,
    role:  profile?.role  ?? null,
    orgId: profile?.orgId ?? null,
    theme: profile?.preferences?.theme ?? 'dark',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
