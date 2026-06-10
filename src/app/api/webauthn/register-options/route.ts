import { NextRequest, NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
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

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, employee_id')
    .eq('id', user.id)
    .single()

  const { data: existingCreds } = await supabaseAdmin
    .from('webauthn_credentials')
    .select('credential_id')
    .eq('user_id', user.id)

  const rpID = new URL(req.url).hostname

  const options = await generateRegistrationOptions({
    rpName: 'MamaVege HR',
    rpID,
    userID: new TextEncoder().encode(user.id),
    userName: user.email!,
    userDisplayName: profile?.full_name || user.email!,
    excludeCredentials: (existingCreds || []).map(c => ({
      id: c.credential_id,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  })

  // Store challenge as a temporary pending row
  await supabaseAdmin.from('webauthn_credentials').upsert({
    user_id: user.id,
    credential_id: `__pending__${user.id}`,
    public_key: options.challenge,
    counter: 0,
    device_name: '__pending__',
  }, { onConflict: 'credential_id' })

  return NextResponse.json(options)
}
