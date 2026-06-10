import { NextRequest, NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: creds } = await supabaseAdmin
    .from('webauthn_credentials')
    .select('credential_id')
    .eq('user_id', user.id)
    .neq('credential_id', `__pending__${user.id}`)

  if (!creds || creds.length === 0) {
    return NextResponse.json({ error: 'No fingerprint registered' }, { status: 404 })
  }

  const rpID = new URL(req.url).hostname
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: creds.map(c => ({ id: c.credential_id })),
    userVerification: 'preferred',
  })

  // Store challenge
  await supabaseAdmin.from('webauthn_credentials').upsert({
    user_id: user.id,
    credential_id: `__pending__${user.id}`,
    public_key: options.challenge,
    counter: 0,
    device_name: '__pending__',
  }, { onConflict: 'credential_id' })

  return NextResponse.json(options)
}
