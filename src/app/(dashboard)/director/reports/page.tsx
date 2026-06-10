'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Users, Wallet, CheckCircle2, Timer, CalendarDays, Briefcase,
} from 'lucide-react'
import { colors, radius, shadow, styles, font } from '@/lib/design'

const GRADIENTS = [colors.gradients.green, colors.gradients.blue, colors.gradients.purple, colors.gradients.orange, colors.gradients.teal, colors.gradients.pink, colors.gradients.indigo, colors.gradients.cyan]

export default function DirectorReportsPage() {
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const [departments, setDepartments] = useState<{ name: string; headcount: number; salary: number }[]>([])
  const [totalPayroll, setTotalPayroll] = useState(0)
  const [headcount, setHeadcount] = useState(0)
  const [attendance, setAttendance] = useState({ present: 0, late: 0, absent: 0, total: 0 })
  const [leaveByType, setLeaveByType] = useState<{ type: string; days: number; count: number }[]>([])
  const [otHours, setOtHours] = useState(0)
  const [claimsByType, setClaimsByType] = useState<{ type: string; amount: number; count: number }[]>([])
  const [totalClaims, setTotalClaims] = useState(0)

  const supabase = createClient()

  useEffect(() => { loadData() }, [month])

  async function loadData() {
    setLoading(true)
    const [year, mon] = month.split('-').map(Number)
    const monthStart = `${month}-01`
    const lastDay = new Date(year, mon, 0).getDate()
    const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`

    const [profilesRes, attendanceRes, leaveRes, otRes, claimsRes, claimTypesRes] = await Promise.all([
      supabase.from('profiles').select('id, department, basic_salary').eq('is_active', true),
      supabase.from('attendance').select('status').gte('date', monthStart).lte('date', monthEnd),
      supabase.from('leave_requests').select('leave_type, total_days, start_date, status').eq('status', 'approved').gte('start_date', monthStart).lte('start_date', monthEnd),
      supabase.from('ot_requests').select('hours, start_time, end_time, ot_date, status').eq('status', 'approved').gte('ot_date', monthStart).lte('ot_date', monthEnd),
      supabase.from('claims').select('amount, status, claim_type_id, month, year').eq('status', 'approved').eq('month', mon).eq('year', year),
      supabase.from('claim_types').select('id, name'),
    ])

    // Departments / payroll
    const deptMap: Record<string, { headcount: number; salary: number }> = {}
    let payroll = 0
    for (const p of profilesRes.data || []) {
      const dept = p.department || 'Unassigned'
      if (!deptMap[dept]) deptMap[dept] = { headcount: 0, salary: 0 }
      deptMap[dept].headcount += 1
      deptMap[dept].salary += p.basic_salary || 0
      payroll += p.basic_salary || 0
    }
    const deptList = Object.entries(deptMap)
      .map(([name, v]) => ({ name, headcount: v.headcount, salary: v.salary }))
      .sort((a, b) => b.headcount - a.headcount)
    setDepartments(deptList)
    setTotalPayroll(payroll)
    setHeadcount(profilesRes.data?.length || 0)

    // Attendance
    const att = { present: 0, late: 0, absent: 0, total: 0 }
    for (const a of attendanceRes.data || []) {
      att.total += 1
      if (a.status === 'present') att.present += 1
      else if (a.status === 'late') att.late += 1
      else if (a.status === 'absent') att.absent += 1
    }
    setAttendance(att)

    // Leave by type
    const leaveMap: Record<string, { days: number; count: number }> = {}
    for (const l of leaveRes.data || []) {
      const type = l.leave_type || 'Other'
      if (!leaveMap[type]) leaveMap[type] = { days: 0, count: 0 }
      leaveMap[type].days += parseFloat(l.total_days || 0)
      leaveMap[type].count += 1
    }
    setLeaveByType(Object.entries(leaveMap).map(([type, v]) => ({ type, ...v })).sort((a, b) => b.days - a.days))

    // OT hours
    let hours = 0
    for (const o of otRes.data || []) {
      if (o.hours) {
        hours += parseFloat(o.hours)
      } else if (o.start_time && o.end_time) {
        const [sh, sm] = o.start_time.split(':').map(Number)
        const [eh, em] = o.end_time.split(':').map(Number)
        const diff = ((eh * 60 + em) - (sh * 60 + sm)) / 60
        if (diff > 0) hours += diff
      }
    }
    setOtHours(hours)

    // Claims by type
    const typeNames: Record<string, string> = {}
    for (const t of claimTypesRes.data || []) typeNames[t.id] = t.name
    const claimMap: Record<string, { amount: number; count: number }> = {}
    let claimsTotal = 0
    for (const c of claimsRes.data || []) {
      const type = typeNames[c.claim_type_id] || 'Other'
      if (!claimMap[type]) claimMap[type] = { amount: 0, count: 0 }
      claimMap[type].amount += parseFloat(c.amount || 0)
      claimMap[type].count += 1
      claimsTotal += parseFloat(c.amount || 0)
    }
    setClaimsByType(Object.entries(claimMap).map(([type, v]) => ({ type, ...v })).sort((a, b) => b.amount - a.amount))
    setTotalClaims(claimsTotal)

    setLoading(false)
  }

  const attendanceRate = attendance.total > 0
    ? Math.round(((attendance.present + attendance.late) / attendance.total) * 100)
    : 0

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })

  const summaryCards = [
    { label: 'Total Payroll', value: `RM ${totalPayroll.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`, icon: <Wallet size={18} />, gradient: colors.gradients.green },
    { label: 'Headcount', value: headcount, icon: <Users size={18} />, gradient: colors.gradients.blue },
    { label: 'Attendance Rate', value: `${attendanceRate}%`, icon: <CheckCircle2 size={18} />, gradient: colors.gradients.teal },
    { label: 'OT Hours', value: `${otHours.toFixed(1)}h`, icon: <Timer size={18} />, gradient: colors.gradients.orange },
    { label: 'Leave Days', value: leaveByType.reduce((s, l) => s + l.days, 0).toFixed(1), icon: <CalendarDays size={18} />, gradient: colors.gradients.purple },
    { label: 'Claims Total', value: `RM ${totalClaims.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`, icon: <Briefcase size={18} />, gradient: colors.gradients.pink },
  ]

  return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ ...styles.pageTitle }}>Reports 报表</h1>
            <p style={{ ...styles.pageSubtitle }}>Company-wide insights — {monthLabel}</p>
          </div>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ ...styles.input, width: 'auto' }} />
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {summaryCards.map(c => (
            <div key={c.label} style={{ ...styles.card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontSize: font.xs, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</span>
                <div style={{ width: '36px', height: '36px', borderRadius: radius.md, background: c.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                  {c.icon}
                </div>
              </div>
              <p style={{ fontSize: '24px', fontWeight: '800', color: colors.textPrimary, margin: 0, letterSpacing: '-0.5px' }}>
                {loading ? '-' : c.value}
              </p>
            </div>
          ))}
        </div>

        {/* Department breakdown */}
        <div style={{ ...styles.card, padding: 0, overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.borderLight}` }}>
            <h3 style={{ margin: 0, fontSize: font.lg, fontWeight: '800', color: colors.textPrimary }}>Departments 部门概览</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: colors.pageBg, borderBottom: `1px solid ${colors.borderLight}` }}>
                  {['Department', 'Headcount', 'Total Basic Salary', 'Avg Salary', 'Share'].map(h => (
                    <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: colors.textMuted }}>Loading...</td></tr>
                ) : departments.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: colors.textMuted }}>No data</td></tr>
                ) : departments.map((d, i) => (
                  <tr key={d.name} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: GRADIENTS[i % GRADIENTS.length] }} />
                        <span style={{ fontSize: font.sm, fontWeight: '700', color: colors.textPrimary }}>{d.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: font.sm, color: colors.textSecondary }}>{d.headcount}</td>
                    <td style={{ padding: '12px 20px', fontSize: font.sm, fontWeight: '700', color: colors.textPrimary }}>RM {d.salary.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '12px 20px', fontSize: font.sm, color: colors.textSecondary }}>RM {(d.salary / d.headcount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '12px 20px', fontSize: font.sm, color: colors.textSecondary }}>{headcount > 0 ? Math.round((d.headcount / headcount) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attendance overview */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
          <div style={{ ...styles.card }}>
            <h3 style={{ margin: '0 0 14px', fontSize: font.lg, fontWeight: '800', color: colors.textPrimary }}>Attendance 出勤</h3>
            {loading ? (
              <p style={{ color: colors.textMuted, fontSize: font.sm }}>Loading...</p>
            ) : attendance.total === 0 ? (
              <p style={{ color: colors.textMuted, fontSize: font.sm }}>No attendance records this month</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Present', value: attendance.present, color: colors.successText, bg: colors.successBg },
                  { label: 'Late', value: attendance.late, color: colors.warningText, bg: colors.warningBg },
                  { label: 'Absent', value: attendance.absent, color: colors.dangerText, bg: colors.dangerBg },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: font.sm, color: colors.textSecondary, fontWeight: '600' }}>{row.label}</span>
                    <span style={{ fontSize: font.sm, fontWeight: '800', color: row.color, background: row.bg, padding: '3px 12px', borderRadius: radius.full }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${colors.borderLight}`, paddingTop: '10px', marginTop: '4px' }}>
                  <span style={{ fontSize: font.sm, color: colors.textPrimary, fontWeight: '700' }}>Attendance Rate</span>
                  <span style={{ fontSize: font.base, fontWeight: '800', color: colors.textPrimary }}>{attendanceRate}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Leave by type */}
          <div style={{ ...styles.card }}>
            <h3 style={{ margin: '0 0 14px', fontSize: font.lg, fontWeight: '800', color: colors.textPrimary }}>Leave 请假</h3>
            {loading ? (
              <p style={{ color: colors.textMuted, fontSize: font.sm }}>Loading...</p>
            ) : leaveByType.length === 0 ? (
              <p style={{ color: colors.textMuted, fontSize: font.sm }}>No approved leave this month</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {leaveByType.map(l => (
                  <div key={l.type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: font.sm, color: colors.textSecondary, fontWeight: '600', textTransform: 'capitalize' }}>{l.type} <span style={{ color: colors.textMuted, fontWeight: '400' }}>({l.count})</span></span>
                    <span style={{ fontSize: font.sm, fontWeight: '800', color: colors.textPrimary }}>{l.days.toFixed(1)} days</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Claims by type */}
        <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.borderLight}` }}>
            <h3 style={{ margin: 0, fontSize: font.lg, fontWeight: '800', color: colors.textPrimary }}>Claims 报销 (Approved)</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: colors.pageBg, borderBottom: `1px solid ${colors.borderLight}` }}>
                  {['Claim Type', 'Count', 'Total Amount'].map(h => (
                    <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: '40px', color: colors.textMuted }}>Loading...</td></tr>
                ) : claimsByType.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: '40px', color: colors.textMuted }}>No approved claims this month</td></tr>
                ) : claimsByType.map(c => (
                  <tr key={c.type} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                    <td style={{ padding: '12px 20px', fontSize: font.sm, fontWeight: '700', color: colors.textPrimary }}>{c.type}</td>
                    <td style={{ padding: '12px 20px', fontSize: font.sm, color: colors.textSecondary }}>{c.count}</td>
                    <td style={{ padding: '12px 20px', fontSize: font.sm, fontWeight: '700', color: colors.textPrimary }}>RM {c.amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              {!loading && claimsByType.length > 0 && (
                <tfoot>
                  <tr style={{ background: colors.pageBg, borderTop: `2px solid ${colors.border}` }}>
                    <td colSpan={2} style={{ padding: '12px 20px', fontSize: font.sm, fontWeight: '800', color: colors.textPrimary }}>Total</td>
                    <td style={{ padding: '12px 20px', fontSize: font.sm, fontWeight: '800', color: colors.textPrimary }}>RM {totalClaims.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
