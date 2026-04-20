import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── Verify caller is an authenticated admin ──────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const callerToken = authHeader.replace('Bearer ', '')
    const { data: { user: callerUser }, error: callerError } =
      await adminClient.auth.getUser(callerToken)

    if (callerError || !callerUser) throw new Error('Invalid or expired token')

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single()

    if (callerProfile?.role !== 'admin') throw new Error('Only admins can manage users')

    // ── Perform the action ───────────────────────────────────────────────────
    const { userId, action } = await req.json()
    if (!userId || !action) throw new Error('userId and action are required')

    // Prevent admin from revoking themselves
    if (userId === callerUser.id) throw new Error('You cannot revoke your own account')

    if (action === 'revoke') {
      // Ban in Supabase Auth (prevents login immediately)
      await adminClient.auth.admin.updateUserById(userId, {
        ban_duration: '87600h', // 10 years = effectively permanent
      })
      // Soft delete in profiles
      await adminClient.from('profiles').update({
        is_revoked: true,
        revoked_at: new Date().toISOString(),
        status: 'pending', // reset status so they show clearly as revoked
      }).eq('id', userId)

    } else if (action === 'restore') {
      // Unban in Supabase Auth
      await adminClient.auth.admin.updateUserById(userId, {
        ban_duration: 'none',
      })
      // Restore in profiles
      await adminClient.from('profiles').update({
        is_revoked: false,
        revoked_at: null,
        status: 'active',
      }).eq('id', userId)

    } else {
      throw new Error(`Unknown action: ${action}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
