import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
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

  const { response } = await req.json()
  const rpID = new URL(req.url).hostname

  const { data: cred } = await supabaseAdmin
    .from('webauthn_credentials')
    .select('*')
    .eq('credential_id', response.id)
    .eq('user_id', user.id)
    .single()

  if (!cred) return NextResponse.json({ error: 'Credential not found' }, { status: 404 })

  const { data: pending } = await supabaseAdmin
    .from('webauthn_credentials')
    .select('public_key')
    .eq('credential_id', `__pending__${user.id}`)
    .single()

  if (!pending) return NextResponse.json({ error: 'No pending auth' }, { status: 400 })

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: pending.public_key,
      expectedOrigin: `${new URL(req.url).protocol}//${new URL(req.url).host}`,
      expectedRPID: rpID,
      credential: {
        id: cred.credential_id,
        publicKey: Buffer.from(cred.public_key, 'base64'),
        counter: cred.counter,
      },
    })

    if (!verification.verified) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 })
    }

    await supabaseAdmin
      .from('webauthn_credentials')
      .update({ counter: verification.authenticationInfo.newCounter })
      .eq('credential_id', cred.credential_id)

    await supabaseAdmin
      .from('webauthn_credentials')
      .delete()
      .eq('credential_id', `__pending__${user.id}`)

    return NextResponse.json({ verified: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
