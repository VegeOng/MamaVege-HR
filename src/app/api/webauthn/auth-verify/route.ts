import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { response, userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const rpID = new URL(req.url).hostname

  // Get the credential being used
  const { data: cred } = await supabaseAdmin
    .from('webauthn_credentials')
    .select('*')
    .eq('credential_id', response.id)
    .eq('user_id', userId)
    .single()

  if (!cred) return NextResponse.json({ error: 'Credential not found' }, { status: 404 })

  // Get stored challenge
  const { data: pending } = await supabaseAdmin
    .from('webauthn_credentials')
    .select('public_key')
    .eq('credential_id', `__pending__${userId}`)
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

    // Update counter
    await supabaseAdmin
      .from('webauthn_credentials')
      .update({ counter: verification.authenticationInfo.newCounter })
      .eq('credential_id', cred.credential_id)

    // Clean up pending
    await supabaseAdmin
      .from('webauthn_credentials')
      .delete()
      .eq('credential_id', `__pending__${userId}`)

    // Get user email to generate magic link for session
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (!user?.email) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Generate magic link token for passwordless sign-in
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
    })

    if (linkError || !linkData?.properties?.hashed_token) {
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    return NextResponse.json({
      verified: true,
      token: linkData.properties.hashed_token,
      email: user.email,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
