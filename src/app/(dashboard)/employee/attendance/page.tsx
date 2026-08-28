'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, AlertCircle, MapPin, Wifi } from 'lucide-react'
import { colors, radius, shadow, styles, font } from '@/lib/design'

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const toRad = (v: number) => v * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

type OfficeLocation = { lat: number, lng: number, radius: number }

export default function AttendancePage() {
  const [profile, setProfile] = useState<any>(null)
  const [todayRecord, setTodayRecord] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [step, setStep] = useState<'checking' | 'blocked' | 'ready' | 'done'>('checking')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null)
  const [recentAttendance, setRecentAttendance] = useState<any[]>([])
  const [remark, setRemark] = useState('')
  const [officeLocation, setOfficeLocation] = useState<OfficeLocation | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    loadData().then(result => {
      if (result && !result.attendance?.clock_out) runVerification(result.profile, result.office)
    })
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' })
    const { data: att } = await supabase.from('attendance').select('*').eq('employee_id', user.id).eq('date', today).maybeSingle()
    setTodayRecord(att)

    const { data: recent } = await supabase.from('attendance').select('*').eq('employee_id', user.id).order('date', { ascending: false }).limit(7)
    setRecentAttendance(recent || [])

    const { data: settings } = await supabase.from('company_settings').select('key,value').in('key', ['office_lat', 'office_lng', 'office_radius_m'])
    const s: Record<string, string> = Object.fromEntries((settings || []).map((r: any) => [r.key, r.value]))
    let office: OfficeLocation | null = null
    if (s.office_lat && s.office_lng) {
      office = { lat: parseFloat(s.office_lat), lng: parseFloat(s.office_lng), radius: parseFloat(s.office_radius_m || '200') }
      setOfficeLocation(office)
    }

    return { profile: p, attendance: att, office }
  }

  async function runVerification(p: any, office: OfficeLocation | null) {
    setMessage(null)
    const needsGps = p?.clock_in_method === 'gps' || p?.clock_in_method === 'both'
    const needsGeofence = p?.clock_in_method === 'wifi' && office

    if (!needsGps && !needsGeofence) { setStep('ready'); return }

    setStep('checking')

    if (!navigator.geolocation) {
      if (needsGeofence) {
        setMessage({ type: 'error', text: 'This device does not support location services, which are required to clock in.' })
        setStep('blocked')
        return
      }
      setStep('ready')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setLocation(loc)
        if (needsGeofence && office) {
          const dist = distanceMeters(loc.lat, loc.lng, office.lat, office.lng)
          if (dist > office.radius) {
            setMessage({ type: 'error', text: `You are ${Math.round(dist)}m from the office. You must be within ${office.radius}m to clock in.` })
            setStep('blocked')
            return
          }
        }
        if (needsGeofence) {
          try {
            const ipRes = await fetch('/api/attendance/verify-ip', { method: 'POST' })
            const ipData = await ipRes.json()
            if (ipData.configured && !ipData.matches) {
              setMessage({ type: 'error', text: 'You must be connected to the office WiFi network to clock in.' })
              setStep('blocked')
              return
            }
          } catch {
            setMessage({ type: 'error', text: 'Could not verify network. Please try again.' })
            setStep('blocked')
            return
          }
        }
        setStep('ready')
      },
      () => {
        if (needsGeofence) {
          setMessage({ type: 'error', text: 'Location permission is required to clock in. Please enable location access and try again.' })
          setStep('blocked')
          return
        }
        setStep('ready')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
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

    setStep('done'); setRemark(''); setLoading(false); loadData()
  }

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

        {/* Checking location */}
        {!todayRecord?.clock_out && step === 'checking' && (
          <div style={{ ...styles.card, textAlign: 'center', padding: '40px 24px' }}>
            <div style={{
              width: '40px', height: '40px', margin: '0 auto 16px',
              border: `3px solid ${colors.borderLight}`, borderTopColor: colors.primary,
              borderRadius: '50%', animation: 'mv-spin 0.8s linear infinite',
            }} />
            <p style={{ margin: 0, fontSize: font.base, color: colors.textMuted }}>Checking your location...</p>
            <style>{`@keyframes mv-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Blocked */}
        {!todayRecord?.clock_out && step === 'blocked' && (
          <div style={{ ...styles.card, textAlign: 'center' }}>
            <button onClick={() => runVerification(profile, officeLocation)} style={{ ...styles.primaryButton, width: '100%', justifyContent: 'center' }}>
              Try Again 重试
            </button>
          </div>
        )}

        {/* Ready / Confirm */}
        {!todayRecord?.clock_out && step === 'ready' && (
          <div style={{ ...styles.card, textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', background: '#ECFDF5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              {profile?.clock_in_method === 'wifi' ? <Wifi size={26} color="#059669" /> : <MapPin size={26} color="#059669" />}
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: font.lg, fontWeight: '700', color: colors.textPrimary }}>
              {todayRecord?.clock_in ? 'Clock Out 打卡退出' : 'Clock In 打卡进入'}
            </h3>
            <p style={{ margin: '0 0 4px', fontSize: font.base, color: colors.textMuted }}>
              {todayRecord?.clock_in ? 'Ready to clock out?' : 'Ready to clock in?'}
            </p>
            {profile?.clock_in_method === 'wifi' && officeLocation && (
              <p style={{ margin: '0 0 12px', fontSize: font.xs, color: colors.successText, fontWeight: '600' }}>
                ✓ Location & network verified
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
              <button onClick={() => runVerification(profile, officeLocation)} style={{ ...styles.outlineButton, width: '100%' }}>
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
