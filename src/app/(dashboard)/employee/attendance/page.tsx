'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, AlertCircle, MapPin, Wifi, Shield, Fingerprint, Settings2 } from 'lucide-react'
import { colors, radius, shadow, styles, font } from '@/lib/design'

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const toRad = (v: number) => v * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function AttendancePage() {
  const [profile, setProfile] = useState<any>(null)
  const [todayRecord, setTodayRecord] = useState<any>(null)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinAttempts, setPinAttempts] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [step, setStep] = useState<'setup' | 'setup_confirm' | 'pin' | 'verify' | 'done'>('pin')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null)
  const [recentAttendance, setRecentAttendance] = useState<any[]>([])
  const [hasFingerprint, setHasFingerprint] = useState(false)
  const [fingerprintLoading, setFingerprintLoading] = useState(false)
  const [showFingerprintSetup, setShowFingerprintSetup] = useState(false)
  const [deviceName, setDeviceName] = useState('My Phone')
  const [remark, setRemark] = useState('')
  const [officeLocation, setOfficeLocation] = useState<{ lat: number, lng: number, radius: number } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)
    setPinAttempts(p?.pin_attempts || 0)
    if (!p?.pin_hash) setStep('setup')

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' })
    const { data: att } = await supabase.from('attendance').select('*').eq('employee_id', user.id).eq('date', today).maybeSingle()
    setTodayRecord(att)

    const { data: recent } = await supabase.from('attendance').select('*').eq('employee_id', user.id).order('date', { ascending: false }).limit(7)
    setRecentAttendance(recent || [])

    const { data: fpCreds } = await supabase.from('webauthn_credentials').select('id').eq('user_id', user.id).neq('credential_id', `__pending__${user.id}`)
    setHasFingerprint((fpCreds || []).length > 0)

    const { data: settings } = await supabase.from('company_settings').select('key,value').in('key', ['office_lat', 'office_lng', 'office_radius_m'])
    const s: Record<string, string> = Object.fromEntries((settings || []).map((r: any) => [r.key, r.value]))
    if (s.office_lat && s.office_lng) {
      setOfficeLocation({ lat: parseFloat(s.office_lat), lng: parseFloat(s.office_lng), radius: parseFloat(s.office_radius_m || '200') })
    }
  }

  async function handleSetPin() {
    if (pin.length !== 4) return
    if (step === 'setup') { setStep('setup_confirm'); return }
    if (pin !== confirmPin) {
      setMessage({ type: 'error', text: 'PINs do not match. Try again.' })
      setPin(''); setConfirmPin(''); setStep('setup')
      return
    }
    setLoading(true)
    const res = await fetch('/api/set-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    })
    const result = await res.json()
    if (result.success) {
      setMessage({ type: 'success', text: 'PIN set successfully! You can now clock in.' })
      setStep('pin'); setPin(''); setConfirmPin('')
      loadData()
    } else {
      setMessage({ type: 'error', text: 'Failed to set PIN. Try again.' })
      setStep('setup'); setPin('')
    }
    setLoading(false)
  }

  async function handlePinSubmit() {
    if (pin.length !== 4) return
    if (pinAttempts >= 3) {
      setMessage({ type: 'error', text: 'Account locked. Please contact HR to reset your PIN.' })
      return
    }
    setLoading(true)
    const res = await fetch('/api/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    })
    const result = await res.json()

    if (!result.valid) {
      const { data: { user } } = await supabase.auth.getUser()
      const newAttempts = pinAttempts + 1
      setPinAttempts(newAttempts)
      await supabase.from('profiles').update({ pin_attempts: newAttempts }).eq('id', user!.id)
      setPin('')
      setMessage({ type: 'error', text: `Wrong PIN. ${3 - newAttempts} attempt${3 - newAttempts !== 1 ? 's' : ''} remaining.` })
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update({ pin_attempts: 0 }).eq('id', user!.id)
    setPinAttempts(0)

    const needsGps = profile?.clock_in_method === 'gps' || profile?.clock_in_method === 'both'
    const needsGeofence = profile?.clock_in_method === 'wifi' && officeLocation

    if (needsGps || needsGeofence) {
      if (!navigator.geolocation) {
        if (needsGeofence) {
          setMessage({ type: 'error', text: 'This device does not support location services, which are required to clock in.' })
          setLoading(false)
          return
        }
        setStep('verify'); setLoading(false)
        return
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setLocation(loc)
          if (needsGeofence && officeLocation) {
            const dist = distanceMeters(loc.lat, loc.lng, officeLocation.lat, officeLocation.lng)
            if (dist > officeLocation.radius) {
              setMessage({ type: 'error', text: `You are ${Math.round(dist)}m from the office. You must be within ${officeLocation.radius}m to clock in.` })
              setLoading(false)
              return
            }
          }
          setStep('verify'); setLoading(false)
        },
        () => {
          if (needsGeofence) {
            setMessage({ type: 'error', text: 'Location permission is required to clock in. Please enable location access and try again.' })
            setLoading(false)
            return
          }
          setStep('verify'); setLoading(false)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } else {
      setStep('verify')
      setLoading(false)
    }
  }

  async function handleFingerprintSetup() {
    setFingerprintLoading(true)
    try {
      const { startRegistration } = await import('@simplewebauthn/browser')
      const optRes = await fetch('/api/webauthn/register-options', { method: 'POST' })
      const options = await optRes.json()
      if (!optRes.ok) { setMessage({ type: 'error', text: options.error }); setFingerprintLoading(false); return }

      const registration = await startRegistration({ optionsJSON: options })

      const verRes = await fetch('/api/webauthn/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: registration, deviceName }),
      })
      const verData = await verRes.json()
      if (verData.verified) {
        setHasFingerprint(true)
        setShowFingerprintSetup(false)
        setMessage({ type: 'success', text: 'Fingerprint registered! You can now use it to clock in.' })
      } else {
        setMessage({ type: 'error', text: verData.error || 'Registration failed.' })
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') setMessage({ type: 'error', text: 'Fingerprint cancelled or not supported on this device.' })
      else setMessage({ type: 'error', text: err.message || 'Registration failed.' })
    }
    setFingerprintLoading(false)
  }

  async function handleFingerprintClockIn() {
    setFingerprintLoading(true)
    try {
      const { startAuthentication } = await import('@simplewebauthn/browser')
      const optRes = await fetch('/api/webauthn/user-options', { method: 'POST' })
      const options = await optRes.json()
      if (!optRes.ok) { setMessage({ type: 'error', text: options.error }); setFingerprintLoading(false); return }

      const assertion = await startAuthentication({ optionsJSON: options })

      const verRes = await fetch('/api/webauthn/user-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: assertion }),
      })
      const verData = await verRes.json()
      if (!verData.verified) { setMessage({ type: 'error', text: verData.error || 'Fingerprint verification failed.' }); setFingerprintLoading(false); return }

      setStep('verify')
    } catch (err: any) {
      if (err.name === 'NotAllowedError') setMessage({ type: 'error', text: 'Fingerprint cancelled.' })
      else setMessage({ type: 'error', text: err.message || 'Fingerprint failed.' })
    }
    setFingerprintLoading(false)
  }

  async function handleClockAction() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' })
    const isClockIn = !todayRecord?.clock_in
    const shiftStart = new Date(`${today}T08:00:00+08:00`)
    const isLate = isClockIn && now > shiftStart
    const lateMinutes = isLate ? Math.floor((now.getTime() - shiftStart.getTime()) / 60000) : 0
    const trimmedRemark = remark.trim()

    if (isClockIn) {
      await supabase.from('attendance').upsert({
        employee_id: user.id, date: today,
        clock_in: now.toISOString(),
        clock_in_lat: location?.lat, clock_in_lng: location?.lng,
        is_late: isLate, late_minutes: lateMinutes,
        status: isLate ? 'late' : 'present',
        notes: trimmedRemark || null,
      })
      setMessage({ type: 'success', text: `Clocked in at ${now.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}${isLate ? ` · Late by ${lateMinutes} min` : ' · On time!'}` })
    } else {
      const totalHours = (now.getTime() - new Date(todayRecord.clock_in).getTime()) / 3600000
      const endHour = profile?.shift === 'B' ? 18 : 17
      const otHours = Math.max(0, now.getHours() + now.getMinutes() / 60 - endHour)
      const combinedNotes = trimmedRemark
        ? (todayRecord.notes ? `${todayRecord.notes} | ${trimmedRemark}` : trimmedRemark)
        : todayRecord.notes
      await supabase.from('attendance').update({
        clock_out: now.toISOString(),
        clock_out_lat: location?.lat, clock_out_lng: location?.lng,
        total_hours: parseFloat(totalHours.toFixed(2)),
        overtime_hours: parseFloat(otHours.toFixed(2)),
        notes: combinedNotes,
      }).eq('id', todayRecord.id)
      setMessage({ type: 'success', text: `Clocked out at ${now.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })} · Total ${totalHours.toFixed(1)}h` })
    }

    setStep('done'); setPin(''); setRemark(''); setLoading(false); loadData()
  }

  const Keypad = ({ value, onChange, onSubmit, submitLabel }: { value: string, onChange: (v: string) => void, onSubmit: () => void, submitLabel: string }) => (
    <div>
      {/* Dots */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '28px' }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: '52px', height: '52px', borderRadius: radius.md,
            border: `2px solid ${value.length > i ? colors.primary : colors.border}`,
            background: value.length > i ? '#ECFDF5' : 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', color: colors.primary, transition: 'all 0.15s'
          }}>
            {value.length > i ? '●' : ''}
          </div>
        ))}
      </div>
      {/* Keys */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', maxWidth: '260px', margin: '0 auto' }}>
        {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((k, i) => (
          <button key={i}
            onClick={() => {
              if (k === '⌫') onChange(value.slice(0, -1))
              else if (k !== '' && value.length < 4) onChange(value + k)
            }}
            disabled={k === ''}
            style={{
              height: '52px', borderRadius: radius.md, border: 'none',
              background: k === '' ? 'transparent' : k === '⌫' ? '#F1F5F9' : 'white',
              boxShadow: k === '' ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
              fontSize: k === '⌫' ? '18px' : '20px',
              fontWeight: '600', color: colors.textPrimary,
              cursor: k === '' ? 'default' : 'pointer',
              visibility: k === '' ? 'hidden' : 'visible',
            }}
          >{k}</button>
        ))}
      </div>
      <button
        onClick={onSubmit}
        disabled={value.length !== 4 || loading}
        style={{
          ...styles.primaryButton,
          width: '100%', marginTop: '20px',
          padding: '13px', fontSize: font.md,
          opacity: value.length !== 4 || loading ? 0.5 : 1,
          maxWidth: '260px', display: 'block', margin: '20px auto 0',
        }}
      >
        {loading ? 'Please wait...' : submitLabel}
      </button>
    </div>
  )

  const shiftLabel = profile?.shift === 'B' ? 'Shift B · 8:00 AM – 6:00 PM' : profile?.shift === 'C' ? 'Flexible Hours' : 'Shift A · 8:00 AM – 5:00 PM'

  return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ ...styles.pageTitle, fontSize: font['2xl'] }}>Attendance 打卡</h1>
          <p style={{ ...styles.pageSubtitle }}>
            {currentTime.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Clock banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
          borderRadius: radius.xl, padding: '24px',
          textAlign: 'center', marginBottom: '20px',
          boxShadow: shadow.banner
        }}>
          <p style={{ margin: 0, fontSize: '44px', fontWeight: '800', color: 'white', letterSpacing: '-2px', lineHeight: 1 }}>
            {currentTime.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: font.sm, color: 'rgba(255,255,255,0.6)' }}>{shiftLabel}</p>
        </div>

        {/* Today status */}
        {todayRecord?.clock_in && (
          <div style={{ ...styles.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 2px', fontSize: font.xs, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' }}>Clock In</p>
              <p style={{ margin: 0, fontSize: font.xl, fontWeight: '700', color: colors.textPrimary }}>
                {new Date(todayRecord.clock_in).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              {todayRecord.is_late
                ? <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: font.xs, fontWeight: '700', padding: '4px 12px', borderRadius: radius.full }}>Late {todayRecord.late_minutes}m</span>
                : <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: font.xs, fontWeight: '700', padding: '4px 12px', borderRadius: radius.full }}>On Time</span>
              }
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 2px', fontSize: font.xs, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' }}>Clock Out</p>
              <p style={{ margin: 0, fontSize: font.xl, fontWeight: '700', color: todayRecord.clock_out ? colors.textPrimary : colors.textMuted }}>
                {todayRecord.clock_out ? new Date(todayRecord.clock_out).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </p>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div style={{
            background: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${message.type === 'success' ? '#6EE7B7' : '#FECACA'}`,
            borderRadius: radius.md, padding: '14px 16px', marginBottom: '20px',
            display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            {message.type === 'success' ? <CheckCircle size={18} color="#059669" /> : <AlertCircle size={18} color="#DC2626" />}
            <p style={{ margin: 0, fontSize: font.base, color: message.type === 'success' ? '#065F46' : '#991B1B', fontWeight: '500' }}>{message.text}</p>
          </div>
        )}

        {/* Setup PIN */}
        {(step === 'setup' || step === 'setup_confirm') && (
          <div style={{ ...styles.card }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', background: '#EFF6FF', borderRadius: radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Shield size={22} color="#2563EB" />
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: font.lg, fontWeight: '700', color: colors.textPrimary }}>
                {step === 'setup' ? 'Set Your PIN' : 'Confirm PIN'}
              </h3>
              <p style={{ margin: 0, fontSize: font.base, color: colors.textMuted }}>
                {step === 'setup' ? 'Create a 4-digit PIN for clocking in' : 'Enter your PIN again to confirm'}
              </p>
            </div>
            <Keypad
              value={step === 'setup' ? pin : confirmPin}
              onChange={step === 'setup' ? setPin : setConfirmPin}
              onSubmit={handleSetPin}
              submitLabel={step === 'setup' ? 'Continue' : 'Set PIN'}
            />
          </div>
        )}

        {/* PIN Entry */}
        {step === 'pin' && !todayRecord?.clock_out && (
          <div style={{ ...styles.card }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: font.lg, fontWeight: '700', color: colors.textPrimary }}>
                {todayRecord?.clock_in ? 'Clock Out 打卡退出' : 'Clock In 打卡进入'}
              </h3>
              <p style={{ margin: 0, fontSize: font.base, color: colors.textMuted }}>Enter your 4-digit PIN 输入4位数PIN</p>
              {pinAttempts > 0 && (
                <p style={{ margin: '6px 0 0', fontSize: font.sm, color: '#DC2626', fontWeight: '600' }}>
                  {3 - pinAttempts} attempt{3 - pinAttempts !== 1 ? 's' : ''} remaining
                </p>
              )}
            </div>

            {/* Fingerprint button */}
            {hasFingerprint && (
              <>
                <button onClick={handleFingerprintClockIn} disabled={fingerprintLoading}
                  style={{ ...styles.primaryButton, width: '100%', justifyContent: 'center', marginBottom: '16px', background: 'linear-gradient(135deg, #1E3A5F, #1D4ED8)', opacity: fingerprintLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '14px' }}>
                  <Fingerprint size={20} />
                  {fingerprintLoading ? 'Verifying...' : 'Use Fingerprint 指纹打卡'}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ flex: 1, height: '1px', background: colors.border }} />
                  <span style={{ fontSize: '11px', color: colors.textMuted }}>or use PIN</span>
                  <div style={{ flex: 1, height: '1px', background: colors.border }} />
                </div>
              </>
            )}

            <Keypad value={pin} onChange={setPin} onSubmit={handlePinSubmit} submitLabel="Confirm 确认" />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <p onClick={() => setStep('setup')} style={{ fontSize: font.sm, color: colors.primaryLight, cursor: 'pointer', margin: 0 }}>
                Forgot PIN? Reset here
              </p>
              {!hasFingerprint && (
                <p onClick={() => setShowFingerprintSetup(true)} style={{ fontSize: font.sm, color: colors.textMuted, cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Fingerprint size={13} />Set up fingerprint
                </p>
              )}
            </div>
          </div>
        )}

        {/* Fingerprint Setup Modal */}
        {showFingerprintSetup && (
          <div style={{ ...styles.card, marginTop: '16px', border: `2px solid ${colors.infoBg}` }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '52px', height: '52px', background: colors.infoBg, borderRadius: radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Fingerprint size={24} color={colors.infoText} />
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: font.lg, fontWeight: '700', color: colors.textPrimary }}>Register Fingerprint 注册指纹</h3>
              <p style={{ margin: 0, fontSize: font.sm, color: colors.textMuted }}>Your fingerprint data stays on this device and never leaves it.</p>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Device Name</label>
              <input value={deviceName} onChange={e => setDeviceName(e.target.value)} placeholder="e.g. My Phone"
                style={{ ...styles.input, width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowFingerprintSetup(false)} style={{ ...styles.outlineButton, flex: 1, justifyContent: 'center' }}>Cancel</button>
              <button onClick={handleFingerprintSetup} disabled={fingerprintLoading}
                style={{ ...styles.primaryButton, flex: 1, justifyContent: 'center', opacity: fingerprintLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Fingerprint size={15} />{fingerprintLoading ? 'Setting up...' : 'Register Now'}
              </button>
            </div>
          </div>
        )}

        {/* Fingerprint management (if registered) */}
        {step === 'pin' && hasFingerprint && !showFingerprintSetup && (
          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <button onClick={() => setShowFingerprintSetup(true)} style={{ background: 'none', border: 'none', fontSize: font.xs, color: colors.textMuted, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Settings2 size={12} />Add another device
            </button>
          </div>
        )}

        {/* Verify / Confirm */}
        {step === 'verify' && (
          <div style={{ ...styles.card, textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', background: '#ECFDF5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              {profile?.clock_in_method === 'wifi' ? <Wifi size={26} color="#059669" /> : <MapPin size={26} color="#059669" />}
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: font.lg, fontWeight: '700', color: colors.textPrimary }}>PIN Verified ✓</h3>
            <p style={{ margin: '0 0 4px', fontSize: font.base, color: colors.textMuted }}>
              {todayRecord?.clock_in ? 'Ready to clock out?' : 'Ready to clock in?'}
            </p>
            {profile?.clock_in_method === 'wifi' && officeLocation && (
              <p style={{ margin: '0 0 12px', fontSize: font.xs, color: colors.successText, fontWeight: '600' }}>
                ✓ Location verified — within office range
              </p>
            )}

            {/* Remark */}
            <div style={{ textAlign: 'left', marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                Remark (optional) 备注
              </label>
              <textarea
                value={remark}
                onChange={e => setRemark(e.target.value)}
                placeholder="若迟到或早退，可在此说明原因 e.g. Traffic jam, doctor appointment..."
                rows={2}
                style={{ ...styles.input, width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <button onClick={handleClockAction} disabled={loading} style={{
              ...styles.primaryButton,
              width: '100%', padding: '15px', fontSize: font.lg,
              background: todayRecord?.clock_in ? '#DC2626' : colors.primary,
              opacity: loading ? 0.6 : 1,
            }}>
              {loading ? 'Processing...' : todayRecord?.clock_in ? 'Clock Out' : 'Clock In'}
            </button>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div style={{ ...styles.card, textAlign: 'center' }}>
            <CheckCircle size={40} color="#059669" style={{ margin: '0 auto 12px', display: 'block' }} />
            <h3 style={{ margin: '0 0 4px', fontSize: font.lg, fontWeight: '700', color: colors.textPrimary }}>Done!</h3>
            <p style={{ margin: '0 0 20px', fontSize: font.base, color: colors.textMuted }}>Your attendance has been recorded.</p>
            {!todayRecord?.clock_out && (
              <button onClick={() => { setStep('pin'); setMessage(null) }} style={{ ...styles.outlineButton, width: '100%' }}>
                Clock Out Later
              </button>
            )}
          </div>
        )}

        {/* Recent Records */}
        <div style={{ ...styles.card, marginTop: '20px' }}>
          <h3 style={{ ...styles.sectionLabel, marginBottom: '16px' }}>Recent Attendance 最近记录</h3>
          {recentAttendance.length === 0 ? (
            <p style={{ textAlign: 'center', color: colors.textMuted, fontSize: font.base, padding: '20px 0' }}>No records yet</p>
          ) : (
            recentAttendance.map((rec, i) => (
              <div key={rec.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: i < recentAttendance.length - 1 ? `1px solid ${colors.borderLight}` : 'none'
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: font.base, fontWeight: '600', color: colors.textPrimary }}>
                    {new Date(rec.date).toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  <p style={{ margin: 0, fontSize: font.sm, color: colors.textMuted }}>
                    {rec.clock_in ? new Date(rec.clock_in).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }) : '--'}
                    {' → '}
                    {rec.clock_out ? new Date(rec.clock_out).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }) : '--'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: font.xs, fontWeight: '700', padding: '3px 10px', borderRadius: radius.full,
                    background: rec.status === 'late' ? '#FEF3C7' : rec.status === 'present' ? '#DCFCE7' : '#F1F5F9',
                    color: rec.status === 'late' ? '#92400E' : rec.status === 'present' ? '#15803D' : colors.textMuted,
                  }}>{rec.status || 'N/A'}</span>
                  {rec.total_hours && <p style={{ margin: '3px 0 0', fontSize: font.xs, color: colors.textMuted }}>{rec.total_hours}h</p>}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
