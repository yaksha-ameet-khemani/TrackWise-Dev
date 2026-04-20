import { Tab } from '../types'
import { useAuth } from '../auth/AuthContext'

interface Props {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  entryCount: number
}

const TABS: { key: Tab; label: (n: number) => string; adminOnly?: boolean }[] = [
  { key: 'dashboard',         label: () => 'Dashboard' },
  { key: 'updated-dashboard', label: () => 'Updated Dashboard' },
  { key: 'add',               label: () => 'Log Entry' },
  { key: 'entries',           label: (n) => `All Entries (${n})` },
  { key: 'admin',             label: () => 'Users',  adminOnly: true },
]

export default function Nav({ activeTab, onTabChange, entryCount }: Props) {
  const { profile, signOut } = useAuth()

  const visibleTabs = TABS.filter(
    (t) => !t.adminOnly || profile?.role === 'admin',
  )

  return (
    <div className="flex items-center justify-between border-b border-gray-200 mt-1">
      <nav className="flex gap-1">
        {visibleTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {label(entryCount)}
          </button>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="flex items-center gap-3 pb-1">
        {profile && (
          <span className="text-xs text-gray-500">
            {profile.name || profile.email}
            {profile.role === 'admin' && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium">
                admin
              </span>
            )}
          </span>
        )}
        <button
          onClick={signOut}
          className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
