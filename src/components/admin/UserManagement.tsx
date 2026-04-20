import { useState, useEffect, Fragment, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../types/auth'

const INP =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function formatDateTime(iso: string | null) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function UserManagement() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  const [resending, setResending] = useState<string | null>(null)
  const [resendMsg, setResendMsg] = useState<Record<string, string>>({})

  const [managing, setManaging] = useState<string | null>(null)
  const [manageMsg, setManageMsg] = useState<Record<string, string>>({})

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoadingUsers(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('invited_at', { ascending: false, nullsFirst: false })
    if (!error && data) setUsers(data as Profile[])
    setLoadingUsers(false)
  }

  async function handleInvite(e: FormEvent) {
    e.preventDefault()
    setInviteError('')
    setInviteSuccess('')
    setInviting(true)
    try {
      const { data: json, error: fnError } = await supabase.functions.invoke('invite-user', {
        body: { email: email.trim(), name: name.trim() },
      })
      if (fnError) throw new Error(fnError.message)
      if (json?.error) throw new Error(json.error)
      setInviteSuccess(`Invite sent to ${email}. They have 24 hours to accept it.`)
      setName('')
      setEmail('')
      fetchUsers()
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  async function handleResend(user: Profile) {
    setResending(user.id)
    setResendMsg({})
    try {
      const { data: json, error: fnError } = await supabase.functions.invoke('invite-user', {
        body: { email: user.email, name: user.name },
      })
      if (fnError) throw new Error(fnError.message)
      if (json?.error) throw new Error(json.error)
      setResendMsg({ [user.id]: `Invite resent to ${user.email}` })
      fetchUsers()
    } catch (err) {
      setResendMsg({ [user.id]: err instanceof Error ? err.message : 'Failed' })
    } finally {
      setResending(null)
    }
  }

  async function handleManage(user: Profile, action: 'revoke' | 'restore') {
    setManaging(user.id)
    setManageMsg({})
    try {
      const { data: json, error: fnError } = await supabase.functions.invoke('manage-user', {
        body: { userId: user.id, action },
      })
      if (fnError) throw new Error(fnError.message)
      if (json?.error) throw new Error(json.error)
      setManageMsg({
        [user.id]: action === 'revoke'
          ? `${user.name || user.email} has been revoked.`
          : `${user.name || user.email} has been restored.`,
      })
      fetchUsers()
    } catch (err) {
      setManageMsg({ [user.id]: err instanceof Error ? err.message : 'Failed' })
    } finally {
      setManaging(null)
    }
  }

  const activeCount  = users.filter((u) => u.status === 'active'  && !u.is_revoked).length
  const pendingCount = users.filter((u) => u.status === 'pending' && !u.is_revoked).length
  const revokedCount = users.filter((u) => u.is_revoked).length

  return (
    <div className="max-w-4xl">

      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <circle cx="9" cy="7" r="4" />
            <path d="M3 21v-1a6 6 0 0112 0v1M16 11a4 4 0 010 8m4-7.5a4 4 0 010 8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-400 mt-0.5">Invite and manage team member access</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
          <p className="text-2xl font-extrabold">{users.length}</p>
          <p className="text-xs opacity-80 mt-0.5 font-medium">Total members</p>
        </div>
        <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #10b981, #0d9488)' }}>
          <p className="text-2xl font-extrabold">{activeCount}</p>
          <p className="text-xs opacity-80 mt-0.5 font-medium">Active</p>
        </div>
        <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
          <p className="text-2xl font-extrabold">{pendingCount}</p>
          <p className="text-xs opacity-80 mt-0.5 font-medium">Pending invite</p>
        </div>
        <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #f43f5e, #dc2626)' }}>
          <p className="text-2xl font-extrabold">{revokedCount}</p>
          <p className="text-xs opacity-80 mt-0.5 font-medium">Revoked</p>
        </div>
      </div>

      {/* Invite form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 rounded-full bg-violet-500" />
          <h3 className="text-sm font-semibold text-gray-800">Invite a new member</h3>
        </div>
        <form onSubmit={handleInvite} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Full name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                required placeholder="Jane Smith" className={INP} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="jane@example.com" className={INP} />
            </div>
          </div>

          {inviteError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {inviteError}
            </p>
          )}
          {inviteSuccess && (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              {inviteSuccess}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={inviting}
              className="px-6 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
            >
              {inviting ? 'Sending invite…' : 'Send invite'}
            </button>
          </div>
        </form>
      </div>

      {/* Members table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-violet-500" />
            <h3 className="text-sm font-semibold text-gray-800">All members</h3>
          </div>
          <button onClick={fetchUsers}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-violet-600 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.13-3.36M20 15a9 9 0 01-14.13 3.36" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Refresh
          </button>
        </div>

        {loadingUsers ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">Loading…</div>
        ) : users.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">No members yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-violet-100" style={{ background: 'linear-gradient(135deg, #f5f3ff, #faf5ff)' }}>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-violet-700">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-violet-700">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-violet-700">Role</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-violet-700">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-violet-700 whitespace-nowrap">Invited on</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-violet-700 whitespace-nowrap">Last sign in</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <Fragment key={u.id}>
                    <tr className={`border-b border-gray-50 last:border-0 transition-colors ${
                      u.is_revoked ? 'bg-red-50/60 opacity-75' : 'hover:bg-violet-50/40'
                    }`}>
                      <td className="px-6 py-3.5 text-sm text-gray-900 font-medium">{u.name || '—'}</td>
                      <td className="px-6 py-3.5 text-sm text-gray-500">{u.email}</td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          u.role === 'admin'
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        {u.is_revoked ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />Revoked
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                            u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              u.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
                            }`} />
                            {u.status === 'active' ? 'Active' : 'Pending invite'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-gray-400">{formatDate(u.invited_at)}</td>
                      <td className="px-6 py-3.5 text-xs text-gray-400">
                        {u.is_revoked && u.revoked_at
                          ? `Revoked ${formatDate(u.revoked_at)}`
                          : formatDateTime(u.last_sign_in_at)}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!u.is_revoked && u.status === 'pending' && (
                            <button onClick={() => handleResend(u)} disabled={resending === u.id}
                              className="px-3 py-1 text-xs border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 disabled:opacity-50 transition-colors">
                              {resending === u.id ? 'Resending…' : 'Resend invite'}
                            </button>
                          )}
                          {u.role !== 'admin' && (
                            u.is_revoked ? (
                              <button onClick={() => handleManage(u, 'restore')} disabled={managing === u.id}
                                className="px-3 py-1 text-xs border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 disabled:opacity-50 transition-colors">
                                {managing === u.id ? 'Restoring…' : 'Restore'}
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  if (confirm(`Revoke access for ${u.name || u.email}? They will be immediately signed out.`))
                                    handleManage(u, 'revoke')
                                }}
                                disabled={managing === u.id}
                                className="px-3 py-1 text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
                                {managing === u.id ? 'Revoking…' : 'Revoke'}
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                    {(resendMsg[u.id] || manageMsg[u.id]) && (
                      <tr className="bg-violet-50/50">
                        <td colSpan={7} className="px-6 py-2 text-xs text-violet-600 italic">
                          {resendMsg[u.id] || manageMsg[u.id]}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
