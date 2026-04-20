export interface Profile {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
  status: 'pending' | 'active'
  is_revoked: boolean
  invited_at: string | null
  last_sign_in_at: string | null
  revoked_at: string | null
  created_at: string
}
