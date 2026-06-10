'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

async function redirectByRole(supabase: any, userId: string, setError: (e: string) => void, setLoading: (l: boolean) => void) {
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single()
  const role = profile?.role
  if (role === 'director') window.location.href = '/director/dashboard'
  else if (role === 'hr') window.location.href = '/hr/dashboard'
  else if (role === 'supervisor') window.location.href = '/supervisor/dashboard'
  else if (role === 'employee') window.location.href = '/employee/dashboard'
  else { setError('Role not found. Please contact admin.'); setLoading(false) }
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [fingerprintLoading, setFingerprintLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) { setError('Invalid email or password.'); setLoading(false); return }
    if (data.user) await redirectByRole(supabase, data.user.id, setError, setLoading)
  }

  const handleFingerprint = async () => {
    if (!email) { setError('Please enter your email first.'); return }
    setFingerprintLoading(true); setError('')
    try {
      const { startAuthentication } = await import('@simplewebauthn/browser')

      // Get auth options from server
      const optRes = await fetch('/api/webauthn/auth-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const optData = await optRes.json()
      if (!optRes.ok) { setError(optData.error || 'Fingerprint not set up for this account.'); setFingerprintLoading(false); return }

      // Trigger biometric prompt
      const assertion = await startAuthentication({ optionsJSON: optData.options })

      // Verify with server
      const verRes = await fetch('/api/webauthn/auth-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: assertion, userId: optData.userId }),
      })
      const verData = await verRes.json()
      if (!verRes.ok) { setError(verData.error || 'Fingerprint verification failed.'); setFingerprintLoading(false); return }

      // Sign in using magic link token
      const { data: sessionData, error: otpError } = await supabase.auth.verifyOtp({
        token_hash: verData.token,
        type: 'magiclink',
      })
      if (otpError || !sessionData.user) { setError('Session error. Please use password instead.'); setFingerprintLoading(false); return }

      await redirectByRole(supabase, sessionData.user.id, setError, setFingerprintLoading)
    } catch (err: any) {
      if (err.name === 'NotAllowedError') setError('Fingerprint cancelled or not available on this device.')
      else setError(err.message || 'Fingerprint login failed.')
      setFingerprintLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1B4332' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '400px', margin: '0 16px', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img src="/logo.png" alt="MamaVege" style={{ width: '160px', height: 'auto', margin: '0 auto 12px', display: 'block' }} />
          <p style={{ color: '#6B7280', margin: 0, fontSize: '13px' }}>HR Management System</p>
        </div>

        {error && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={inputStyle} placeholder="your@email.com" required />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>Password 密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={inputStyle} placeholder="••••••••" />
          </div>
          <div style={{ textAlign: 'right', marginBottom: '20px' }}>
            <a href="/forgot-password" style={{ fontSize: '12px', color: '#2D6A4F', textDecoration: 'none' }}>Forgot password? 忘记密码？</a>
          </div>

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '13px', background: loading ? '#9CA3AF' : '#2D6A4F', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginBottom: '10px' }}>
            {loading ? 'Signing in...' : 'Sign In 登入'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0 10px' }}>
          <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
        </div>

        {/* Fingerprint button */}
        <button onClick={handleFingerprint} disabled={fingerprintLoading}
          style={{ width: '100%', padding: '13px', background: fingerprintLoading ? '#F3F4F6' : '#F0FDF4', color: fingerprintLoading ? '#9CA3AF' : '#15803D', border: '1.5px solid #BBF7D0', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>
            {fingerprintLoading ? '⏳' : '🪬'}
          </span>
          {fingerprintLoading ? 'Verifying...' : 'Login with Fingerprint 指纹登入'}
        </button>

        <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '11px', marginTop: '24px' }}>Mama Global International Sdn Bhd (1247551-X)</p>
      </div>
    </div>
  )
}
