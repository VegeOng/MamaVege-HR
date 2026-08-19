import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function getClientIp(req: NextRequest) {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || ''
}

// Returns the caller's detected public IP, used by HR Settings to prefill the office IP field.
export async function GET(req: NextRequest) {
  return NextResponse.json({ ip: getClientIp(req) })
}

// Checks the caller's IP against the configured office IP allowlist for WiFi-method clock-in.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ matches: false, ip: '' }, { status: 401 })

  const ip = getClientIp(req)
  const { data: setting } = await supabase.from('company_settings').select('value').eq('key', 'office_public_ip').maybeSingle()
  const allowed = (setting?.value || '').split(',').map((s: string) => s.trim()).filter(Boolean)

  if (allowed.length === 0) return NextResponse.json({ matches: true, ip, configured: false })
  return NextResponse.json({ matches: allowed.includes(ip), ip, configured: true })
}
