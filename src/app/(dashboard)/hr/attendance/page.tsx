'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Users, CheckCircle2, Clock, XCircle, RefreshCw } from 'lucide-react'
import { colors, radius, shadow, styles, font } from '@/lib/design'

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  present:  { bg: colors.successBg, color: colors.successText, label: 'Present' },
  late:     { bg: colors.warningBg, color: colors.warningText, label: 'Late' },
  absent:   { bg: colors.dangerBg,  color: colors.dangerText,  label: 'Absent' },
  'half-day': { bg: colors.infoBg, color: colors.infoText,     label: 'Half Day' },
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'present', label: 'Present' },
  { id: 'late', label: 'Late' },
  { id: 'absent', label: 'Absent' },
]

export default function HRAttendancePage() {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily')
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [monthlyRecords, setMonthlyRecords] = useState<any[]>([])
  const [loadingMonthly, setLoadingMonthly] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => { loadAttendance() }, [selectedDate])
  useEffect(() => { if (viewMode === 'monthly') loadMonthlyAttendance() }, [viewMode, month])

  async function loadAttendance() {
    setLoading(true)
    const { data } = await supabase
      .from('attendance')
      .select('*, profiles(full_name, employee_id, department)')
      .eq('date', selectedDate)
      .order('clock_in', { ascending: true })
    setRecords(data || [])
    setLoading(false)
  }

  async function loadMonthlyAttendance() {
    setLoadingMonthly(true)
    const [y, m] = month.split('-').map(Number)
    const start = `${month}-01`
    const end = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
    const { data } = await supabase
      .from('attendance')
      .select('*, profiles(full_name, employee_id, department)')
      .gte('date', start).lte('date', end)
    setMonthlyRecords(data || [])
    setLoadingMonthly(false)
  }

  const monthlySummary = (() => {
    const map: Record<string, any> = {}
    monthlyRecords.forEach(r => {
      const key = r.employee_id
      if (!map[key]) {
        map[key] = {
          employee_id: key, profile: r.profiles,
          present: 0, late: 0, absent: 0, halfDay: 0, totalHours: 0,
        }
      }
      if (r.status === 'present') map[key].present++
      else if (r.status === 'late') map[key].late++
      else if (r.status === 'absent') map[key].absent++
      else if (r.status === 'half-day') map[key].halfDay++
      map[key].totalHours += r.total_hours || 0
    })
    return Object.values(map).sort((a: any, b: any) => (a.profile?.full_name || '').localeCompare(b.profile?.full_name || ''))
  })()

  const filteredMonthly = monthlySummary.filter((s: any) =>
    !search ||
    s.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.profile?.employee_id?.toLowerCase().includes(search.toLowerCase())
  )

  const filtered = records.filter(r => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus
    const matchSearch = !search ||
      r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.profiles?.employee_id?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const stats = {
    present: records.filter(r => r.status === 'present').length,
    late: records.filter(r => r.status === 'late').length,
    absent: records.filter(r => r.status === 'absent').length,
    total: records.length,
  }

  function fmt(time: string | null) {
    if (!time) return '-'
    return new Date(time).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kuala_Lumpur' })
  }

  const initials = (name: string) => (name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ ...styles.pageTitle }}>Attendance 考勤管理</h1>
            <p style={{ ...styles.pageSubtitle }}>View and manage employee attendance records</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '6px', background: 'white', padding: '4px', borderRadius: radius.full, boxShadow: shadow.card }}>
              {(['daily', 'monthly'] as const).map(v => (
                <button key={v} onClick={() => setViewMode(v)} style={{
                  padding: '6px 14px', borderRadius: radius.full, fontSize: font.sm, fontWeight: '600',
                  border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                  background: viewMode === v ? colors.primary : 'transparent',
                  color: viewMode === v ? 'white' : colors.textMuted,
                }}>{v}</button>
              ))}
            </div>
            {viewMode === 'daily' ? (
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ ...styles.input, width: 'auto' }} />
            ) : (
              <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ ...styles.input, width: 'auto' }} />
            )}
          </div>
        </div>

        {viewMode === 'daily' ? (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
              {[
                { label: 'Present', value: stats.present, icon: <CheckCircle2 size={20} color={colors.successText} />, bg: colors.successBg },
                { label: 'Late', value: stats.late, icon: <Clock size={20} color={colors.warningText} />, bg: colors.warningBg },
                { label: 'Absent', value: stats.absent, icon: <XCircle size={20} color={colors.dangerText} />, bg: colors.dangerBg },
                { label: 'Total', value: stats.total, icon: <Users size={20} color={colors.infoText} />, bg: colors.infoBg },
              ].map(s => (
                <div key={s.label} style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: radius.md, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {s.icon}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: colors.textPrimary, letterSpacing: '-0.5px' }}>{s.value}</p>
                    <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted, pointerEvents: 'none' }} />
                <input
                  type="text" placeholder="Search name or ID..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{ ...styles.input, paddingLeft: '34px', width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {FILTERS.map(f => (
                  <button key={f.id} onClick={() => setFilterStatus(f.id)} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: radius.full, fontSize: font.sm, fontWeight: '600',
                    border: 'none', cursor: 'pointer',
                    background: filterStatus === f.id ? colors.primary : 'white',
                    color: filterStatus === f.id ? 'white' : colors.textMuted,
                    boxShadow: shadow.card,
                  }}>{f.label}</button>
                ))}
              </div>
              <button onClick={loadAttendance} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: radius.full, fontSize: font.sm, fontWeight: '600',
                border: 'none', cursor: 'pointer', background: 'white', color: colors.textMuted, boxShadow: shadow.card,
              }}>
                <RefreshCw size={13} />Refresh
              </button>
            </div>

            {/* Table */}
            <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: colors.borderLight, borderBottom: `1px solid ${colors.border}` }}>
                      {['Employee', 'Department', 'Check In', 'Check Out', 'Status', 'Notes'].map(h => (
                        <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: colors.textMuted, fontSize: font.base }}>Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: colors.textMuted, fontSize: font.base }}>No records for this date</td></tr>
                    ) : filtered.map((r) => {
                      const s = STATUS_STYLE[r.status] || { bg: colors.borderLight, color: colors.textMuted, label: r.status }
                      return (
                        <tr key={r.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                          <td style={{ padding: '13px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                              <div style={{
                                width: '36px', height: '36px', borderRadius: radius.md, flexShrink: 0,
                                background: 'linear-gradient(135deg, #1B4332, #52B788)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontSize: '12px', fontWeight: '700'
                              }}>
                                {initials(r.profiles?.full_name)}
                              </div>
                              <div>
                                <p style={{ margin: 0, fontSize: font.base, fontWeight: '600', color: colors.textPrimary }}>{r.profiles?.full_name || '-'}</p>
                                <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted }}>{r.profiles?.employee_id || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '13px 16px', fontSize: font.sm, color: colors.textSecondary }}>{r.profiles?.department || '-'}</td>
                          <td style={{ padding: '13px 16px', fontSize: font.sm, color: colors.textSecondary }}>{fmt(r.clock_in)}</td>
                          <td style={{ padding: '13px 16px', fontSize: font.sm, color: colors.textSecondary }}>{fmt(r.clock_out)}</td>
                          <td style={{ padding: '13px 16px' }}>
                            <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: radius.full, fontSize: '11px', fontWeight: '700', textTransform: 'capitalize' }}>{s.label}</span>
                          </td>
                          <td style={{ padding: '13px 16px', fontSize: font.sm, color: colors.textMuted }}>{r.notes || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Monthly search */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted, pointerEvents: 'none' }} />
                <input
                  type="text" placeholder="Search name or ID..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{ ...styles.input, paddingLeft: '34px', width: '100%' }}
                />
              </div>
              <button onClick={loadMonthlyAttendance} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: radius.full, fontSize: font.sm, fontWeight: '600',
                border: 'none', cursor: 'pointer', background: 'white', color: colors.textMuted, boxShadow: shadow.card,
              }}>
                <RefreshCw size={13} />Refresh
              </button>
            </div>

            {/* Monthly Table */}
            <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: colors.borderLight, borderBottom: `1px solid ${colors.border}` }}>
                      {['Employee', 'Department', 'Present', 'Late', 'Absent', 'Half Day', 'Total Hours'].map(h => (
                        <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingMonthly ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: colors.textMuted, fontSize: font.base }}>Loading...</td></tr>
                    ) : filteredMonthly.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: colors.textMuted, fontSize: font.base }}>No records for this month</td></tr>
                    ) : filteredMonthly.map((s: any) => (
                      <tr key={s.employee_id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                            <div style={{
                              width: '36px', height: '36px', borderRadius: radius.md, flexShrink: 0,
                              background: 'linear-gradient(135deg, #1B4332, #52B788)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'white', fontSize: '12px', fontWeight: '700'
                            }}>
                              {initials(s.profile?.full_name)}
                            </div>
                            <div>
                              <p style={{ margin: 0, fontSize: font.base, fontWeight: '600', color: colors.textPrimary }}>{s.profile?.full_name || '-'}</p>
                              <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted }}>{s.profile?.employee_id || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '13px 16px', fontSize: font.sm, color: colors.textSecondary }}>{s.profile?.department || '-'}</td>
                        <td style={{ padding: '13px 16px', fontSize: font.sm, fontWeight: '700', color: colors.successText }}>{s.present}</td>
                        <td style={{ padding: '13px 16px', fontSize: font.sm, fontWeight: '700', color: colors.warningText }}>{s.late}</td>
                        <td style={{ padding: '13px 16px', fontSize: font.sm, fontWeight: '700', color: colors.dangerText }}>{s.absent}</td>
                        <td style={{ padding: '13px 16px', fontSize: font.sm, fontWeight: '700', color: colors.infoText }}>{s.halfDay}</td>
                        <td style={{ padding: '13px 16px', fontSize: font.sm, fontWeight: '700', color: colors.textPrimary }}>{s.totalHours.toFixed(1)}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
