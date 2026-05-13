// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Auth Context
// Handles Google OAuth, Firestore user profiles, role/persona management
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  auth, db, signInWithGoogle, signOutUser, onAuthChange,
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
} from '@/lib/firebase'
import { ROLES, PERMISSIONS } from '@/lib/constants'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)   // Firebase user
  const [profile, setProfile] = useState(null)   // Firestore profile + role
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // ── Load or create Firestore profile ────────────────────────────────────────
  const loadProfile = useCallback(async (firebaseUser) => {
    if (!firebaseUser) { setProfile(null); return }

    const ref  = doc(db, 'users', firebaseUser.uid)
    const snap = await getDoc(ref)

    if (snap.exists()) {
      // Update last seen
      await updateDoc(ref, { lastSeenAt: serverTimestamp() })
      // Re-read full doc to get latest data (including active status)
      const fresh = await getDoc(ref)
      setProfile({ id: fresh.id, ...fresh.data() })
    } else {
      // First time — create profile
      // Check for pending invite first, then fall back to first-user/default logic
      const inviteRef  = doc(db, 'invites', firebaseUser.email?.toLowerCase?.() ?? '')
      const inviteSnap = await getDoc(inviteRef)
      const pendingInvite = inviteSnap.exists() ? inviteSnap.data() : null

      // First user ever gets SUPER_ADMIN, others get invited role or USER
      const statsRef     = doc(db, 'meta', 'stats')
      const allUsersSnap = await getDoc(statsRef)
      const isFirstUser  = !allUsersSnap.exists() || !(allUsersSnap.data()?.totalUsers)

      const newProfile = {
        uid:         firebaseUser.uid,
        email:       firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL:    firebaseUser.photoURL,
        role:        isFirstUser ? ROLES.SUPER_ADMIN : (pendingInvite?.role ?? ROLES.USER),
        department:  pendingInvite?.department ?? '',
        phone:       '',
        createdAt:   serverTimestamp(),
        lastSeenAt:  serverTimestamp(),
        preferences: {
          theme:    'dark',
          language: 'en',
          notifications: { email: true, push: true, sla: true },
        },
        active: true,
        status: 'active',
      }

      // Write user doc first, then update stats
      await setDoc(ref, newProfile)

      // Bump meta stats
      await setDoc(statsRef, {
        totalUsers: (allUsersSnap.data()?.totalUsers ?? 0) + 1,
        lastUserAt: serverTimestamp(),
      }, { merge: true })

      // Mark invite as accepted
      if (pendingInvite) {
        await setDoc(inviteRef, { status: 'accepted', acceptedAt: serverTimestamp() }, { merge: true })
      }

      setProfile({ id: firebaseUser.uid, ...newProfile })
    }
  }, [])

  // ── Auth state listener ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        await loadProfile(firebaseUser).catch(console.error)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [loadProfile])

  // ── Sign in ──────────────────────────────────────────────────────────────────
  const signIn = async () => {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  // ── Sign out ─────────────────────────────────────────────────────────────────
  const signOut = async () => {
    await signOutUser()
    setUser(null)
    setProfile(null)
  }

  // ── Update profile ────────────────────────────────────────────────────────────
  const updateProfile = async (updates) => {
    if (!user) return
    // Strip role from updates — role changes must go through assignRole()
    const { role: _role, ...safeUpdates } = updates
    const ref = doc(db, 'users', user.uid)
    await updateDoc(ref, { ...safeUpdates, updatedAt: serverTimestamp() })
    // Re-read from Firestore so local state is always in sync with DB
    const snap = await getDoc(ref)
    if (snap.exists()) setProfile({ id: snap.id, ...snap.data() })
  }

  // ── Assign role (Super Admin only) ────────────────────────────────────────────
  const assignRole = async (targetUserId, newRole) => {
    if (!can('ASSIGN_ROLES')) throw new Error('Insufficient permissions')
    const ref = doc(db, 'users', targetUserId)
    await updateDoc(ref, { role: newRole, updatedAt: serverTimestamp() })
  }

  // ── Permission checker ────────────────────────────────────────────────────────
  const can = useCallback((permission) => {
    if (!profile) return false
    const allowed = PERMISSIONS[permission]
    return Array.isArray(allowed) && allowed.includes(profile.role)
  }, [profile])

  const hasRole = useCallback((...roles) => {
    return roles.includes(profile?.role)
  }, [profile])

  const isAdmin = hasRole(ROLES.SUPER_ADMIN, ROLES.IT_ADMIN)
  const isAgent = hasRole(ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT)

  const value = {
    user, profile, loading, error,
    signIn, signOut, updateProfile, assignRole,
    can, hasRole, isAdmin, isAgent,
    role: profile?.role,
    theme: profile?.preferences?.theme ?? 'dark',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
