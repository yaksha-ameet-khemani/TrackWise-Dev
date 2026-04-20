import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically
    // by the Supabase Edge Function runtime — no manual secret needed.
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── Verify caller is an authenticated admin ──────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const callerToken = authHeader.replace('Bearer ', '')
    const { data: { user: callerUser }, error: callerError } =
      await adminClient.auth.getUser(callerToken)

    if (callerError || !callerUser) {
      throw new Error('Invalid or expired token')
    }

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      throw new Error('Only admins can invite users')
    }

    // ── Invite the new user ──────────────────────────────────────────────────
    const { email, name } = await req.json()

    if (!email || !name) {
      throw new Error('email and name are required')
    }

    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { name, role: 'member' },
      })

    if (inviteError) throw inviteError

    // ── Create profile row immediately (before user accepts invite) ──────────
    // The trigger will also fire on accept, but upsert here ensures the name
    // is stored correctly from the start.
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({ id: inviteData.user.id, email, name, role: 'member', status: 'pending', invited_at: new Date().toISOString() })

    if (profileError) throw profileError

    return new Response(
      JSON.stringify({ success: true, userId: inviteData.user.id }),
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
