// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Auth Context  (FIXED v2)
// Key fixes:
//  1. luvvivek2k7@gmail.com is hardcoded as SUPER_ADMIN on first login
//  2. Profile update uses try/catch with detailed error reporting
//  3. loadProfile is more resilient — handles missing Firestore doc gracefully
//  4. can() checks PERMISSIONS[permission] correctly (was passing full array)
//  5. isAgent / isAdmin computed correctly every render
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  auth, db, signInWithGoogle, signOutUser, onAuthChange,
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
} from '@/lib/firebase'
import { ROLES, PERMISSIONS } from '@/lib/constants'

// ── The designated Super Admin email ─────────────────────────────────────────
const SUPER_ADMIN_EMAIL = 'luvvivek2k7@gmail.com'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // ── Determine role for a new user ─────────────────────────────────────────
  const determineRole = async (firebaseUser) => {
    // Hardcoded super admin email always gets super_admin
    if (firebaseUser.email === SUPER_ADMIN_EMAIL) {
      return ROLES.SUPER_ADMIN
    }
    // First user ever (by meta/stats doc not existing) also gets super_admin
    try {
      const statsSnap = await getDoc(doc(db, 'meta', 'stats'))
      if (!statsSnap.exists() || (statsSnap.data()?.totalUsers ?? 0) === 0) {
        return ROLES.SUPER_ADMIN
      }
    } catch (e) {
      console.warn('Could not check meta/stats:', e)
    }
    return ROLES.USER
  }

  // ── Load or create Firestore user profile ────────────────────────────────
  const loadProfile = useCallback(async (firebaseUser) => {
    if (!firebaseUser) { setProfile(null); return }

    const userRef = doc(db, 'users', firebaseUser.uid)

    try {
      const snap = await getDoc(userRef)

      if (snap.exists()) {
        const data = snap.data()

        // If this is the super admin email but role isn't set right, fix it
        if (
          firebaseUser.email === SUPER_ADMIN_EMAIL &&
          data.role !== ROLES.SUPER_ADMIN
        ) {
          await updateDoc(userRef, {
            role:      ROLES.SUPER_ADMIN,
            updatedAt: serverTimestamp(),
          })
          data.role = ROLES.SUPER_ADMIN
        }

        // Update last seen silently
        updateDoc(userRef, { lastSeenAt: serverTimestamp() }).catch(() => {})

        setProfile({ id: snap.id, ...data })
      } else {
        // New user — create profile
        const role = await determineRole(firebaseUser)

        const newProfile = {
          uid:         firebaseUser.uid,
          email:       firebaseUser.email,
          displayName: firebaseUser.displayName ?? firebaseUser.email.split('@')[0],
          photoURL:    firebaseUser.photoURL ?? null,
          role,
          department:  '',
          phone:       '',
          createdAt:   serverTimestamp(),
          lastSeenAt:  serverTimestamp(),
          updatedAt:   serverTimestamp(),
          preferences: {
            theme:         'dark',
            language:      'en',
            notifications: { email: true, push: true, sla: true },
          },
          active: true,
        }

        await setDoc(userRef, newProfile)

        // Increment total users counter
        const statsRef  = doc(db, 'meta', 'stats')
        const statsSnap = await getDoc(statsRef)
        await setDoc(statsRef, {
          totalUsers: (statsSnap.data()?.totalUsers ?? 0) + 1,
        }, { merge: true })

        setProfile({ id: firebaseUser.uid, ...newProfile })
      }
    } catch (err) {
      console.error('loadProfile error:', err)
      // Don't block the app — set minimal profile from Firebase auth
      setProfile({
        id:          firebaseUser.uid,
        uid:         firebaseUser.uid,
        email:       firebaseUser.email,
        displayName: firebaseUser.displayName ?? 'User',
        photoURL:    firebaseUser.photoURL ?? null,
        role:        firebaseUser.email === SUPER_ADMIN_EMAIL
                       ? ROLES.SUPER_ADMIN
                       : ROLES.USER,
        preferences: { theme: 'dark', language: 'en' },
        active:      true,
        _offline:    true, // flag so UI can show a warning
      })
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
      }
      setLoading(false)
    })
    return unsub
  }, [loadProfile])

  // ── Sign in ──────────────────────────────────────────────────────────────
  const signIn = async () => {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      const msg =
        err.code === 'auth/popup-closed-by-user'  ? 'Sign-in popup was closed. Please try again.' :
        err.code === 'auth/network-request-failed' ? 'Network error. Check your connection.' :
        err.code === 'auth/unauthorized-domain'    ? 'This domain is not authorised. Add it in Firebase Console → Authentication → Settings → Authorised domains.' :
        err.message
      setError(msg)
      throw err
    }
  }

  // ── Sign out ─────────────────────────────────────────────────────────────
  const signOut = async () => {
    await signOutUser()
    setUser(null)
    setProfile(null)
  }

  // ── Update own profile ───────────────────────────────────────────────────
  const updateProfile = async (updates) => {
    if (!user) throw new Error('Not signed in')
    const userRef = doc(db, 'users', user.uid)
    try {
      await updateDoc(userRef, { ...updates, updatedAt: serverTimestamp() })
      setProfile(prev => ({ ...prev, ...updates }))
    } catch (err) {
      console.error('updateProfile error:', err)
      throw new Error(
        err.code === 'permission-denied'
          ? 'Permission denied. Make sure Firestore rules are deployed.'
          : `Update failed: ${err.message}`
      )
    }
  }

  // ── Assign role to another user (Super Admin / IT Admin only) ────────────
  const assignRole = async (targetUserId, newRole) => {
    if (!can('ASSIGN_ROLES') && !can('MANAGE_USERS')) {
      throw new Error('Insufficient permissions to assign roles')
    }
    const ref = doc(db, 'users', targetUserId)
    try {
      await updateDoc(ref, { role: newRole, updatedAt: serverTimestamp() })
    } catch (err) {
      throw new Error(`Role assignment failed: ${err.message}`)
    }
  }

  // ── Create a test user manually (Super Admin only) ───────────────────────
  const createTestUser = async ({ email, displayName, role, department }) => {
    if (profile?.role !== ROLES.SUPER_ADMIN) {
      throw new Error('Only Super Admin can create test users')
    }
    // Creates a placeholder user doc (will be populated on their first login)
    const placeholderId = `placeholder_${Date.now()}`
    const ref = doc(db, 'users', placeholderId)
    await setDoc(ref, {
      uid:         placeholderId,
      email,
      displayName,
      role:        role ?? ROLES.USER,
      department:  department ?? '',
      phone:       '',
      photoURL:    null,
      createdAt:   serverTimestamp(),
      lastSeenAt:  null,
      updatedAt:   serverTimestamp(),
      preferences: { theme: 'dark', language: 'en', notifications: { email: true, push: true, sla: true } },
      active:      true,
      isPlaceholder: true, // will merge on real login
    })
    return placeholderId
  }

  // ── Permission checker ───────────────────────────────────────────────────
  const can = useCallback((permission) => {
    if (!profile) return false
    const allowed = PERMISSIONS[permission]
    if (!Array.isArray(allowed)) return false
    return allowed.includes(profile.role)
  }, [profile])

  const hasRole = useCallback((...roles) => {
    return roles.includes(profile?.role)
  }, [profile])

  // Computed role flags
  const isAdmin   = hasRole(ROLES.SUPER_ADMIN, ROLES.IT_ADMIN)
  const isAgent   = hasRole(ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_AGENT)
  const isManager = hasRole(ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.MANAGER)

  const value = {
    user,
    profile,
    loading,
    error,
    signIn,
    signOut,
    updateProfile,
    assignRole,
    createTestUser,
    can,
    hasRole,
    isAdmin,
    isAgent,
    isManager,
    role:  profile?.role ?? null,
    theme: profile?.preferences?.theme ?? 'dark',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
