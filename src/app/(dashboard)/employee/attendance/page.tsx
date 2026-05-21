'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, MapPin, Wifi, CheckCircle, AlertCircle } from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils'

export default function AttendancePage() {
  const [profile, setProfile] = useState<any>(null)
  const [todayRecord, setTodayRecord] = useState<any>(null)
  const [pin, setPin] = useState('')
  const [pinAttempts, setPinAttempts] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [step, setStep] = useState<'pin' | 'verify' | 'done'>('pin')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null)
  const [recentAttendance, setRecentAttendance] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)
    setPinAttempts(p?.pin_attempts || 0)

    const today = new Date().toISOString().split('T')[0]
    const { data: att } = await supabase.from('attendance').select('*').eq('employee_id', user.id).eq('date', today).single()
    setTodayRecord(att)

    const { data: recent } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', user.id)
      .order('date', { ascending: false })
      .limit(7)
    setRecentAttendance(recent || [])
  }

  async function handlePinSubmit() {
    if (pin.length !== 4) return
    if (pinAttempts >= 3) {
      setMessage({ type: 'error', text: 'Too many attempts. Please login with password to reset PIN.' })
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Verify PIN via API
    const res = await fetch('/api/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    })
    const result = await res.json()

    if (!result.valid) {
      const newAttempts = pinAttempts + 1
      setPinAttempts(newAttempts)
      await supabase.from('profiles').update({ pin_attempts: newAttempts }).eq('id', user.id)
      setPin('')
      setMessage({ type: 'error', text: `Invalid PIN. ${3 - newAttempts} attempts remaining.` })
      setLoading(false)
      return
    }

    // Reset attempts
    await supabase.from('profiles').update({ pin_attempts: 0 }).eq('id', user.id)
    setPinAttempts(0)

    // Get location if GPS method
    if (profile?.clock_in_method === 'gps' || profile?.clock_in_method === 'both') {
      navigator.geolocation.getCurrentPosition(pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStep('verify')
        setLoading(false)
      }, () => {
        setStep('verify')
        setLoading(false)
      })
    } else {
      setStep('verify')
      setLoading(false)
    }
  }

  async function handleClockAction() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const isClockIn = !todayRecord?.clock_in

    const clockInTime = new Date(`${today}T${profile?.shift === 'A' ? '08:00' : '08:00'}:00`)
    const isLate = isClockIn && now > clockInTime
    const lateMinutes = isLate ? Math.floor((now.getTime() - clockInTime.getTime()) / 60000) : 0

    if (isClockIn) {
      const { error } = await supabase.from('attendance').upsert({
        employee_id: user.id,
        date: today,
        clock_in: now.toISOString(),
        clock_in_lat: location?.lat,
        clock_in_lng: location?.lng,
        is_late: isLate,
        late_minutes: lateMinutes,
        status: isLate ? 'late' : 'present'
      })
      if (!error) {
        setMessage({ type: 'success', text: `✅ Clocked in at ${now.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}${isLate ? ` (Late by ${lateMinutes} mins)` : ''}` })
      }
    } else {
      const clockIn = new Date(todayRecord.clock_in)
      const totalHours = (now.getTime() - clockIn.getTime()) / 3600000
      const endTime = profile?.shift === 'A' ? 17 : 18
      const otHours = Math.max(0, now.getHours() + now.getMinutes() / 60 - endTime)

      const { error } = await supabase.from('attendance').update({
        clock_out: now.toISOString(),
        clock_out_lat: location?.lat,
        clock_out_lng: location?.lng,
        total_hours: parseFloat(totalHours.toFixed(2)),
        overtime_hours: parseFloat(otHours.toFixed(2)),
      }).eq('id', todayRecord.id)

      if (!error) {
        setMessage({ type: 'success', text: `✅ Clocked out at ${now.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}. Total: ${totalHours.toFixed(1)}h` })
      }
    }

    setStep('done')
    setPin('')
    setLoading(false)
    loadData()
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Attendance  打卡</h1>
      <p className="text-gray-500 text-sm mb-6">{formatDate(new Date().toISOString().split('T')[0])}</p>

      {/* Clock */}
      <div className="bg-green-800 text-white rounded-2xl p-6 text-center mb-6">
        <p className="text-5xl font-bold tracking-tight">
          {currentTime.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        <p className="text-green-300 mt-2 text-sm">
          {profile?.shift === 'C' ? 'Flex Schedule' : `Shift ${profile?.shift} · End: ${profile?.shift === 'A' ? '5:00 PM' : '6:00 PM'}`}
        </p>
      </div>

      {/* Today Status */}
      {todayRecord && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Clock In</p>
              <p className="font-semibold text-gray-800">
                {todayRecord.clock_in ? new Date(todayRecord.clock_in).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </p>
            </div>
            <div className="text-center">
              {todayRecord.is_late && (
                <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                  Late {todayRecord.late_minutes}m
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Clock Out</p>
              <p className="font-semibold text-gray-800">
                {todayRecord.clock_out ? new Date(todayRecord.clock_out).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`rounded-xl p-4 mb-4 flex items-start gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* PIN Entry */}
      {step === 'pin' && !todayRecord?.clock_out && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-1">
            {todayRecord?.clock_in ? 'Clock Out  打卡退出' : 'Clock In  打卡进入'}
          </h3>
          <p className="text-gray-500 text-sm mb-4">Enter your 4-digit PIN  输入4位数PIN</p>

          <div className="flex gap-3 justify-center mb-6">
            {[0,1,2,3].map(i => (
              <div key={i} className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-colors ${pin.length > i ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200'}`}>
                {pin.length > i ? '●' : ''}
              </div>
            ))}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
            {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((k, i) => (
              <button
                key={i}
                onClick={() => {
                  if (k === '⌫') setPin(p => p.slice(0,-1))
                  else if (k !== '' && pin.length < 4) setPin(p => p + k)
                }}
                disabled={k === ''}
                className={`h-14 rounded-xl text-xl font-semibold transition-colors ${k === '' ? 'invisible' : 'bg-gray-100 hover:bg-green-100 hover:text-green-700 active:bg-green-200'}`}
              >
                {k}
              </button>
            ))}
          </div>

          <button
            onClick={handlePinSubmit}
            disabled={pin.length !== 4 || loading || pinAttempts >= 3}
            className="w-full mt-4 bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Confirm  确认'}
          </button>
        </div>
      )}

      {/* Verify Location */}
      {step === 'verify' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {profile?.clock_in_method === 'wifi' ? <Wifi className="w-8 h-8 text-green-600" /> : <MapPin className="w-8 h-8 text-green-600" />}
          </div>
          <h3 className="font-semibold text-gray-800 mb-2">PIN Verified ✅</h3>
          <p className="text-gray-500 text-sm mb-6">
            {todayRecord?.clock_in ? 'Ready to clock out?' : 'Ready to clock in?'}
          </p>
          <button
            onClick={handleClockAction}
            disabled={loading}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-4 rounded-xl transition-colors disabled:opacity-50 text-lg"
          >
            {loading ? 'Processing...' : todayRecord?.clock_in ? '🔴 Clock Out' : '🟢 Clock In'}
          </button>
        </div>
      )}

      {/* Recent Records */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Recent Attendance  最近打卡记录</h3>
        <div className="space-y-3">
          {recentAttendance.map(rec => (
            <div key={rec.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-700">{formatDate(rec.date)}</p>
                <p className="text-xs text-gray-400">
                  {rec.clock_in ? new Date(rec.clock_in).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }) : '--'}
                  {' → '}
                  {rec.clock_out ? new Date(rec.clock_out).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }) : '--'}
                </p>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2 py-1 rounded-full ${rec.status === 'late' ? 'bg-orange-100 text-orange-600' : rec.status === 'present' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                  {rec.status}
                </span>
                {rec.total_hours && <p className="text-xs text-gray-400 mt-1">{rec.total_hours}h</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
