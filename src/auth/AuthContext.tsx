import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/auth'

// ── Detect invite / recovery flow before Supabase clears the hash ────────────
// window.location.hash is available synchronously on first load.
const _hashParams = new URLSearchParams(window.location.hash.slice(1))
const INITIAL_HASH_TYPE = _hashParams.get('type') // 'invite' | 'recovery' | null

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  session: Session | null
  /** True while the initial session is being resolved */
  loading: boolean
  /** True when the user arrived via an invite link and must set a password */
  needsPasswordSetup: boolean
  /** True when the admin has revoked this user's access */
  isRevoked: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  /** Called by AcceptInvitePage once the password has been set */
  clearPasswordSetup: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(
    INITIAL_HASH_TYPE === 'invite',
  )
  // Prevent double-fetching the profile on rapid auth state changes
  const fetchingProfile = useRef(false)

  useEffect(() => {
    // Resolve the initial session (handles hash tokens automatically)
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        loadProfile(s.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s)
        setUser(s?.user ?? null)
        if (s?.user) {
          loadProfile(s.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string) {
    if (fetchingProfile.current) return
    fetchingProfile.current = true
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setProfile(data ?? null)
    } finally {
      fetchingProfile.current = false
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  function clearPasswordSetup() {
    // Clear the hash from the URL without causing a reload
    history.replaceState(null, '', window.location.pathname + window.location.search)
    setNeedsPasswordSetup(false)
  }

  const isRevoked = profile?.is_revoked === true

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        needsPasswordSetup,
        isRevoked,
        signIn,
        signOut,
        clearPasswordSetup,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
