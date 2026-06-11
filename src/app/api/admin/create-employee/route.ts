import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { profile, leaveEntitlements } = body
    if (!profile?.email || !profile?.full_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the requester is logged in and is HR or Director
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: requester } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!requester || !['hr', 'director'].includes(requester.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use service role for admin operations
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // 1. Create the auth user (no password — they set one via "Forgot Password")
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: profile.email,
      email_confirm: true,
      user_metadata: { full_name: profile.full_name },
    })
    if (authError || !authData?.user) {
      return NextResponse.json({ error: authError?.message || 'Failed to create login account' }, { status: 500 })
    }
    const userId = authData.user.id

    // 2. Generate employee ID
    const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).not('employee_id', 'like', 'PENDING-%')
    const employeeId = `MV${String((count || 0) + 1).padStart(4, '0')}`

    // 3. Insert profile
    const { error: profileError } = await admin.from('profiles').insert({
      id: userId,
      employee_id: employeeId,
      ...profile,
      is_active: true,
    })
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // 4. Insert leave entitlements
    if (Array.isArray(leaveEntitlements) && leaveEntitlements.length > 0) {
      await admin.from('leave_entitlements').insert(
        leaveEntitlements.map((e: any) => ({ ...e, employee_id: userId }))
      )
    }

    return NextResponse.json({ data: { id: userId, employee_id: employeeId } })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
