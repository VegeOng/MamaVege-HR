import { NextRequest, NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
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

  const { response, deviceName } = await req.json()
  const rpID = new URL(req.url).hostname

  // Retrieve stored challenge
  const { data: pending } = await supabaseAdmin
    .from('webauthn_credentials')
    .select('public_key')
    .eq('credential_id', `__pending__${user.id}`)
    .single()

  if (!pending) return NextResponse.json({ error: 'No pending registration' }, { status: 400 })

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: pending.public_key,
      expectedOrigin: `${new URL(req.url).protocol}//${new URL(req.url).host}`,
      expectedRPID: rpID,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 })
    }

    const { credential } = verification.registrationInfo

    // Delete pending row and insert real credential
    await supabaseAdmin
      .from('webauthn_credentials')
      .delete()
      .eq('credential_id', `__pending__${user.id}`)

    await supabaseAdmin.from('webauthn_credentials').insert({
      user_id: user.id,
      credential_id: credential.id,
      public_key: Buffer.from(credential.publicKey).toString('base64'),
      counter: credential.counter,
      device_name: deviceName || 'My Device',
    })

    return NextResponse.json({ verified: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
