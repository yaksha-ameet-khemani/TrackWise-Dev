import { Tab } from '../types'
import { useAuth } from '../auth/AuthContext'

interface Props {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  entryCount: number
}

const TABS: {
  key: Tab
  label: (n: number) => string
  adminOnly?: boolean
  icon: React.ReactNode
}[] = [
  {
    key: 'dashboard',
    label: () => 'Client Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    key: 'updated-dashboard',
    label: () => 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path d="M3 18h3v-6H3v6zm5 0h3V9H8v9zm5 0h3V5h-3v13zm5 0h3v-4h-3v4z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'add',
    label: () => 'Log Entry',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'entries',
    label: (n) => `All Entries (${n})`,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path d="M4 6h16M4 10h16M4 14h10M4 18h7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'admin',
    label: () => 'Users',
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-1a6 6 0 0 1 6-6h.5" strokeLinecap="round" />
        <circle cx="17" cy="16" r="4" />
        <path d="M17 13v3l2 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export default function Sidebar({ activeTab, onTabChange, entryCount }: Props) {
  const { profile, signOut } = useAuth()

  const visibleTabs = TABS.filter(
    (t) => !t.adminOnly || profile?.role === 'admin',
  )

  const displayName = profile?.name || profile?.email || ''
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <aside className="fixed top-0 left-0 h-screen w-56 flex flex-col z-20"
      style={{ background: 'linear-gradient(180deg, #1e1848 0%, #2d1f6e 100%)' }}>

      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <p className="text-white text-sm font-semibold leading-tight">TrackWise</p>
          <p className="text-white/50 text-[10px] leading-tight">Portal</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {visibleTabs.map(({ key, label, icon }) => {
          const isActive = activeTab === key
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all ${
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/60 hover:text-white/90 hover:bg-white/8'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-white/50'}>
                {icon}
              </span>
              <span className="truncate">{label(entryCount)}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-300 flex-shrink-0" />
              )}
            </button>
          )
        })}
      </nav>

      {/* User + sign out */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-violet-400/40 flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-semibold text-white">{initials || '?'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{displayName}</p>
            {profile?.role === 'admin' && (
              <span className="text-[10px] text-violet-300 font-medium">admin</span>
            )}
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/8 text-xs font-medium transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  )
}
