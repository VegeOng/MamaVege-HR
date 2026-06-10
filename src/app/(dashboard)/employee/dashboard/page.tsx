'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Clock, Calendar, FileText, DollarSign, AlertCircle, CheckCircle, ChevronRight, Zap } from 'lucide-react'

export default function EmployeeDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [todayAttendance, setTodayAttendance] = useState<any>(null)
  const [leaveBalances, setLeaveBalances] = useState<any[]>([])
  const [pendingLeave, setPendingLeave] = useState(0)
  const [pendingOT, setPendingOT] = useState(0)
  const [pendingClaims, setPendingClaims] = useState(0)
  const [recentLeave, setRecentLeave] = useState<any[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const supabase = createClient()

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const year = new Date().getFullYear()
    const [profileRes, attRes, balRes, leaveRes, otRes, claimsRes, recentLeaveRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('attendance').select('*').eq('employee_id', user.id).eq('date', today).maybeSingle(),
      supabase.from('leave_entitlements').select('*, leave_type:leave_types(name)').eq('employee_id', user.id).eq('year', year),
      supabase.from('leave_requests').select('id').eq('employee_id', user.id).eq('status', 'pending'),
      supabase.from('ot_requests').select('id').eq('employee_id', user.id).eq('status', 'pending'),
      supabase.from('claims').select('id').eq('employee_id', user.id).eq('status', 'pending'),
      supabase.from('leave_requests').select('*, leave_type:leave_types(name)').eq('employee_id', user.id).order('applied_at', { ascending: false }).limit(4),
    ])
    setProfile(profileRes.data)
    setTodayAttendance(attRes.data)
    setLeaveBalances(balRes.data || [])
    setPendingLeave(leaveRes.data?.length || 0)
    setPendingOT(otRes.data?.length || 0)
    setPendingClaims(claimsRes.data?.length || 0)
    setRecentLeave(recentLeaveRes.data || [])
  }

  const hour = currentTime.getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const timeStr = currentTime.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr = currentTime.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const shiftInfo = profile?.shift === 'A' ? 'Shift A · 8:00 AM – 5:00 PM' : profile?.shift === 'B' ? 'Shift B · 8:00 AM – 6:00 PM' : 'Flexible Hours'
  const clocked = !!todayAttendance?.clock_in
  const clockedOut = !!todayAttendance?.clock_out
  const totalPending = pendingLeave + pendingOT + pendingClaims

  const statusStyle = (s: string) => ({
    approved: { bg: '#DCFCE7', color: '#15803D', label: 'Approved' },
    rejected: { bg: '#FEE2E2', color: '#DC2626', label: 'Rejected' },
    pending: { bg: '#FEF9C3', color: '#A16207', label: 'Pending' },
  }[s] || { bg: '#F3F4F6', color: '#6B7280', label: s })

  const quickLinks = [
    { href: '/employee/attendance', label: 'Clock In/Out', sub: '打卡', icon: <Clock size={18} />, gradient: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' },
    { href: '/employee/leave', label: 'Apply Leave', sub: '申请假期', icon: <Calendar size={18} />, gradient: 'linear-gradient(135deg, #065F46 0%, #059669 100%)' },
    { href: '/employee/ot', label: 'Overtime', sub: '加班申请', icon: <Zap size={18} />, gradient: 'linear-gradient(135deg, #1E3A5F 0%, #1D4ED8 100%)' },
    { href: '/employee/claims', label: 'Claims', sub: '报销', icon: <DollarSign size={18} />, gradient: 'linear-gradient(135deg, #4A1D96 0%, #7C3AED 100%)' },
    { href: '/employee/payslip', label: 'Payslip', sub: '薪资单', icon: <FileText size={18} />, gradient: 'linear-gradient(135deg, #831843 0%, #DB2777 100%)' },
    { href: '/employee/documents', label: 'Documents', sub: '文件', icon: <FileText size={18} />, gradient: 'linear-gradient(135deg, #7C2D12 0%, #EA580C 100%)' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '28px 32px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        {/* Top header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#94A3B8', fontWeight: '500' }}>{dateStr}</p>
            <h1 style={{ margin: '0 0 4px', fontSize: '26px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.5px' }}>
              {greeting}, {profile?.full_name?.split(' ')[0] || 'Employee'} 👋
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
              {profile?.employee_id} · {profile?.position || profile?.department || 'MamaVege'} · {shiftInfo}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#0F172A', letterSpacing: '-1px', lineHeight: 1 }}>{timeStr}</p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94A3B8' }}>Current Time</p>
          </div>
        </div>

        {/* Clock-in banner */}
        <div style={{
          background: clocked ? 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
          borderRadius: '16px', padding: '20px 24px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 4px 24px rgba(27,67,50,0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: clocked ? 'rgba(110,231,183,0.2)' : 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {clocked ? <CheckCircle size={22} color="#6EE7B7" /> : <AlertCircle size={22} color="#FCD34D" />}
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '15px', color: 'white' }}>
                {clocked ? (clockedOut ? 'Completed for Today ✓' : 'You\'re Clocked In') : 'Not Clocked In Yet'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>
                {clocked
                  ? `In: ${todayAttendance.clock_in?.slice(11, 16)}${clockedOut ? `  ·  Out: ${todayAttendance.clock_out?.slice(11, 16)}` : '  ·  Still working'}`
                  : `Shift starts at ${profile?.shift === 'B' ? '8:00 AM' : '8:00 AM'} · Don't be late!`}
              </p>
            </div>
          </div>
          {!clockedOut && (
            <Link href="/employee/attendance" style={{
              background: 'white', color: '#1B4332', padding: '10px 20px',
              borderRadius: '10px', fontSize: '13px', fontWeight: '700',
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}>
              {clocked ? 'Clock Out' : 'Clock In'}
              <ChevronRight size={14} />
            </Link>
          )}
        </div>

        {/* Stats row */}
        {totalPending > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%)',
            border: '1px solid #BFDBFE', borderRadius: '14px',
            padding: '16px 20px', marginBottom: '24px',
            display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#1E40AF', marginRight: '4px' }}>⏳ Awaiting approval:</span>
            {pendingLeave > 0 && <span style={{ background: '#DBEAFE', color: '#1D4ED8', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>🌴 {pendingLeave} Leave</span>}
            {pendingOT > 0 && <span style={{ background: '#E0E7FF', color: '#3730A3', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>⚡ {pendingOT} OT</span>}
            {pendingClaims > 0 && <span style={{ background: '#EDE9FE', color: '#5B21B6', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>💼 {pendingClaims} Claims</span>}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: leaveBalances.length > 0 ? '1fr 1fr' : '1fr', gap: '24px', marginBottom: '24px' }}>

          {/* Leave Balances */}
          {leaveBalances.length > 0 && (
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>Leave Balance</h2>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>{new Date().getFullYear()}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {leaveBalances.map((b: any) => {
                  const remaining = b.entitled_days - b.used_days
                  const pct = Math.min(100, (remaining / b.entitled_days) * 100)
                  return (
                    <div key={b.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', color: '#475569' }}>{b.leave_type?.name}</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>{remaining.toFixed(1)} <span style={{ fontWeight: '400', color: '#94A3B8' }}>/ {b.entitled_days}d</span></span>
                      </div>
                      <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #1B4332, #52B788)', borderRadius: '99px', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent Leave */}
          {recentLeave.length > 0 && (
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>Recent Requests</h2>
                <Link href="/employee/leave" style={{ fontSize: '12px', color: '#2D6A4F', textDecoration: 'none', fontWeight: '600' }}>See all →</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentLeave.map((r: any) => {
                  const s = statusStyle(r.status)
                  return (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{r.leave_type?.name}</p>
                        <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8' }}>{r.start_date}{r.end_date && r.end_date !== r.start_date ? ` – ${r.end_date}` : ''}</p>
                      </div>
                      <span style={{ background: s.bg, color: s.color, fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px' }}>{s.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: '8px' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>Quick Actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {quickLinks.map(link => (
              <Link key={link.href} href={link.href} style={{
                background: link.gradient, borderRadius: '14px', padding: '18px 16px',
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)', transition: 'transform 0.15s',
              }}>
                <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                  {link.icon}
                </div>
                <div>
                  <p style={{ margin: 0, color: 'white', fontWeight: '700', fontSize: '13px' }}>{link.label}</p>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.65)', fontSize: '11px' }}>{link.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {leaveBalances.length === 0 && recentLeave.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px', background: 'white', borderRadius: '16px', border: '1px dashed #E2E8F0', marginTop: '24px' }}>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A', margin: '0 0 4px' }}>Profile setup in progress</p>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>Your leave balance and history will appear here once HR sets up your profile.</p>
          </div>
        )}

      </div>
    </div>
  )
}
