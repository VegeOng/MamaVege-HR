import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { user_id } = await request.json()

    if (!user_id) {
      return NextResponse.json({ role: null, error: 'No user_id' }, { status: 400 })
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: profile, error } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user_id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ role: null, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ role: profile?.role ?? null })
  } catch (err) {
    return NextResponse.json({ role: null, error: 'Server error' }, { status: 500 })
  }
}
