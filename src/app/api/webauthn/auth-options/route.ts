import { NextRequest, NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // Look up user by email
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
  const user = users.find(u => u.email === email)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Get credentials
  const { data: creds } = await supabaseAdmin
    .from('webauthn_credentials')
    .select('credential_id')
    .eq('user_id', user.id)
    .neq('credential_id', `__pending__${user.id}`)

  if (!creds || creds.length === 0) {
    return NextResponse.json({ error: 'No fingerprint registered for this account' }, { status: 404 })
  }

  const rpID = new URL(req.url).hostname

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: creds.map(c => ({ id: c.credential_id })),
    userVerification: 'preferred',
  })

  // Store challenge as pending
  await supabaseAdmin.from('webauthn_credentials').upsert({
    user_id: user.id,
    credential_id: `__pending__${user.id}`,
    public_key: options.challenge,
    counter: 0,
    device_name: '__pending__',
  }, { onConflict: 'credential_id' })

  return NextResponse.json({ options, userId: user.id })
}
