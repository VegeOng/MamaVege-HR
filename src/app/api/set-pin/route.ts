import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  const { pin } = await req.json()
  if (!/^\d{4}$/.test(pin)) return NextResponse.json({ success: false, error: 'PIN must be 4 digits' })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false })

  const hash = createHash('sha256').update(pin + user.id).digest('hex')
  const { error } = await supabase
    .from('profiles')
    .update({ pin_hash: hash, pin_attempts: 0 })
    .eq('id', user.id)

  return NextResponse.json({ success: !error })
}
