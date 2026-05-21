import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  const { pin } = await req.json()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ valid: false })

  const { data: profile } = await supabase
    .from('profiles')
    .select('pin_hash')
    .eq('id', user.id)
    .single()

  if (!profile?.pin_hash) return NextResponse.json({ valid: false })

  const hash = createHash('sha256').update(pin + user.id).digest('hex')
  return NextResponse.json({ valid: hash === profile.pin_hash })
}
