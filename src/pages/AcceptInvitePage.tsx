import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

type PageState = 'form' | 'expired' | 'success'

function BrandHeader() {
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <p className="text-gray-900 text-sm font-semibold leading-tight">TrackWise Portal</p>
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  const { user, clearPasswordSetup } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pageState, setPageState] = useState<PageState>('form')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        const msg = updateError.message.toLowerCase()
        if (
          msg.includes('expired') ||
          msg.includes('invalid') ||
          msg.includes('token')
        ) {
          setPageState('expired')
          return
        }
        throw updateError
      }
      setPageState('success')
      setTimeout(() => clearPasswordSetup(), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password')
    } finally {
      setLoading(false)
    }
  }

  // ── Expired link ────────────────────────────────────────────────────────────
  if (pageState === 'expired') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <BrandHeader />
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-gray-900 mb-2">Invite link expired</h1>
            <p className="text-sm text-gray-500 mb-6">
              Invite links are valid for <span className="font-semibold">24 hours</span>.
              This one has expired.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
              <p className="text-sm font-semibold text-amber-800 mb-1">What to do</p>
              <p className="text-sm text-amber-700">
                Contact your admin and ask them to resend the invite to{' '}
                <span className="font-semibold">{user?.email}</span>.
                A fresh link will be sent to your email.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <BrandHeader />
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, #10b981, #0d9488)' }}>
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-gray-900 mb-2">Account activated!</h1>
            <p className="text-sm text-gray-500">Redirecting you to the app…</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Set password form ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <BrandHeader />

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to TrackWise!</h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            You've been invited to the TrackWise Portal.<br />
            Set a password to activate your account.
          </p>
          {user?.email && (
            <span className="inline-block mt-3 px-3 py-1 text-xs font-medium text-violet-700 bg-violet-100 rounded-full">
              {user.email}
            </span>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                placeholder="Minimum 8 characters"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Re-enter password"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm mt-1"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
            >
              {loading ? 'Activating account…' : 'Set password & continue'}
            </button>
          </form>
        </div>

        <div className="mt-4 bg-violet-50 border border-violet-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-violet-700 mb-1">Keep in mind</p>
          <ul className="text-xs text-violet-600 space-y-1 list-disc list-inside">
            <li>Invite links expire after <span className="font-semibold">24 hours</span></li>
            <li>Password must be at least 8 characters</li>
            <li>Contact your admin if you need a new invite</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
