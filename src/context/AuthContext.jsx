// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Auth Context (FIXED v3)
// Key changes from v2:
//  1. Whitelist enforcement — if user doc doesn't exist AND they're not the
//     super admin email, set profile.notWhitelisted = true so App can redirect
//     to AccessDeniedPage instead of auto-creating a USER account for anyone.
//  2. Placeholder merging — when a whitelisted placeholder user signs in with
//     their real Google account, the placeholder doc is merged/replaced.
//  3. All other logic unchanged from v2.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  auth, db, signInWithGoogle, signOutUser, onAuthChange,
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
  collection, query, where, getDocs,
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

  // ── Load or create Firestore user profile ────────────────────────────────
  const loadProfile = useCallback(async (firebaseUser) => {
    if (!firebaseUser) { setProfile(null); return }

    const userRef = doc(db, 'users', firebaseUser.uid)

    try {
      const snap = await getDoc(userRef)

      if (snap.exists()) {
        const data = snap.data()

        // Deactivated user — block access
        if (data.active === false) {
          setProfile({ ...data, id: snap.id, notWhitelisted: true, deactivated: true })
          return
        }

        // Super admin email always keeps super_admin role
        if (firebaseUser.email === SUPER_ADMIN_EMAIL && data.role !== ROLES.SUPER_ADMIN) {
          await updateDoc(userRef, { role: ROLES.SUPER_ADMIN, updatedAt: serverTimestamp() })
          data.role = ROLES.SUPER_ADMIN
        }

        updateDoc(userRef, { lastSeenAt: serverTimestamp() }).catch(() => {})
        setProfile({ id: snap.id, ...data })
        return
      }

      // ── User doc does NOT exist ───────────────────────────────────────────
      // Check if there's a placeholder doc matching this email
      const placeholderQuery = query(
        collection(db, 'users'),
        where('email', '==', firebaseUser.email),
        where('isPlaceholder', '==', true)
      )
      const placeholderSnap = await getDocs(placeholderQuery)

      if (!placeholderSnap.empty) {
        // Found a placeholder — promote it to a real user doc
        const placeholder    = placeholderSnap.docs[0]
        const placeholderData = placeholder.data()

        // Create real doc under actual UID
        const realProfile = {
          ...placeholderData,
          uid:           firebaseUser.uid,
          photoURL:      firebaseUser.photoURL ?? null,
          displayName:   firebaseUser.displayName ?? placeholderData.displayName,
          isPlaceholder: false,
          lastSeenAt:    serverTimestamp(),
          updatedAt:     serverTimestamp(),
          active:        true,
        }
        await setDoc(userRef, realProfile)

        // Delete old placeholder doc (best effort)
        try {
          const { deleteDoc } = await import('@/lib/firebase')
          await deleteDoc(placeholder.ref)
        } catch {}

        setProfile({ id: firebaseUser.uid, ...realProfile })
        return
      }

      // ── No doc, no placeholder ────────────────────────────────────────────
      // Only auto-create if this is the designated super admin email.
      // Everyone else gets blocked with notWhitelisted = true.
      if (firebaseUser.email === SUPER_ADMIN_EMAIL) {
        const newProfile = {
          uid:         firebaseUser.uid,
          email:       firebaseUser.email,
          displayName: firebaseUser.displayName ?? 'Super Admin',
          photoURL:    firebaseUser.photoURL ?? null,
          role:        ROLES.SUPER_ADMIN,
          department:  '',
          phone:       '',
          createdAt:   serverTimestamp(),
          lastSeenAt:  serverTimestamp(),
          updatedAt:   serverTimestamp(),
          preferences: { theme: 'dark', language: 'en', notifications: { email: true, push: true, sla: true } },
          active:      true,
        }
        await setDoc(userRef, newProfile)
        setProfile({ id: firebaseUser.uid, ...newProfile })
        return
      }

      // Not whitelisted — set flag so App redirects to AccessDeniedPage
      setProfile({
        id:              firebaseUser.uid,
        uid:             firebaseUser.uid,
        email:           firebaseUser.email,
        displayName:     firebaseUser.displayName ?? firebaseUser.email,
        photoURL:        firebaseUser.photoURL ?? null,
        role:            null,
        notWhitelisted:  true,
      })

    } catch (err) {
      console.error('loadProfile error:', err)
      // On permission error, the user is likely not whitelisted
      // (Firestore rules denied the read because user doc doesn't exist)
      setProfile({
        id:             firebaseUser.uid,
        uid:            firebaseUser.uid,
        email:          firebaseUser.email,
        displayName:    firebaseUser.displayName ?? 'User',
        photoURL:       firebaseUser.photoURL ?? null,
        role:           firebaseUser.email === SUPER_ADMIN_EMAIL ? ROLES.SUPER_ADMIN : null,
        notWhitelisted: firebaseUser.email !== SUPER_ADMIN_EMAIL,
        _error:         err.message,
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
        err.code === 'auth/popup-closed-by-user'   ? 'Sign-in popup was closed. Please try again.' :
        err.code === 'auth/network-request-failed'  ? 'Network error. Check your connection.' :
        err.code === 'auth/unauthorized-domain'     ? 'This domain is not authorised. Add it in Firebase Console → Authentication → Settings → Authorised domains.' :
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

  // ── Assign role ──────────────────────────────────────────────────────────
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

  // ── Permission checker ───────────────────────────────────────────────────
  const can = useCallback((permission) => {
    if (!profile || profile.notWhitelisted) return false
    const allowed = PERMISSIONS[permission]
    if (!Array.isArray(allowed)) return false
    return allowed.includes(profile.role)
  }, [profile])

  const hasRole = useCallback((...roles) => {
    if (!profile || profile.notWhitelisted) return false
    return roles.includes(profile?.role)
  }, [profile])

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
