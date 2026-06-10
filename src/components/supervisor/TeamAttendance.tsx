'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, RefreshCw, Users, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { colors, radius, shadow, styles, font } from '@/lib/design'

export default function TeamAttendance() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [teamIds, setTeamIds] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => { loadTeam() }, [])
  useEffect(() => { if (teamIds.length > 0) loadAttendance(); else setLoading(false) }, [selectedDate, teamIds])

  async function loadTeam() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles').select('id')
      .eq('supervisor_id', user.id).eq('is_active', true)
    setTeamIds((data || []).map((m: any) => m.id))
  }

  async function loadAttendance() {
    setLoading(true)
    const { data } = await supabase
      .from('attendance')
      .select('*, profiles(full_name, employee_id, department)')
      .in('employee_id', teamIds)
      .eq('date', selectedDate)
      .order('clock_in', { ascending: true })
    setRecords(data || [])
    setLoading(false)
  }

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
    total: teamIds.length,
  }

  function fmt(time: string | null) {
    if (!time) return '—'
    try { return new Date(time).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }) }
    catch { return time }
  }

  const statusBadge: Record<string, { bg: string; text: string }> = {
    present: { bg: colors.successBg, text: colors.successText },
    late: { bg: colors.warningBg, text: colors.warningText },
    absent: { bg: colors.dangerBg, text: colors.dangerText },
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '16px' }}>
        {[
          { label: 'Present', value: stats.present, icon: <CheckCircle2 size={18} />, gradient: colors.gradients.green },
          { label: 'Late', value: stats.late, icon: <Clock size={18} />, gradient: colors.gradients.orange },
          { label: 'Absent', value: stats.absent, icon: <XCircle size={18} />, gradient: colors.gradients.pink },
          { label: 'Team Size', value: stats.total, icon: <Users size={18} />, gradient: colors.gradients.blue },
        ].map(s => (
          <div key={s.label} style={{ ...styles.card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ fontSize: font.xs, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
              <div style={{ width: '32px', height: '32px', borderRadius: radius.md, background: s.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                {s.icon}
              </div>
            </div>
            <p style={{ fontSize: '28px', fontWeight: '800', color: colors.textPrimary, margin: 0, letterSpacing: '-0.5px' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ ...styles.card, display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ ...styles.input, width: 'auto' }} />
        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
          <Search size={15} color={colors.textMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" placeholder="Search name / ID..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...styles.input, paddingLeft: '36px' }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...styles.input, width: 'auto' }}>
          <option value="all">All Status</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
        </select>
        <button onClick={loadAttendance} style={{ ...styles.outlineButton, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} />Refresh
        </button>
      </div>

      {/* Table */}
      <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: colors.pageBg, borderBottom: `1px solid ${colors.borderLight}` }}>
                {['Employee ID', 'Name', 'Department', 'Clock In', 'Clock Out', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: colors.textMuted }}>Loading...</td></tr>
              ) : teamIds.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: colors.textMuted }}>No team members assigned to you yet</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: colors.textMuted }}>No records for this date</td></tr>
              ) : filtered.map(r => {
                const badge = statusBadge[r.status] || { bg: colors.borderLight, text: colors.textMuted }
                return (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                    <td style={{ padding: '12px 16px', fontSize: font.sm, color: colors.textSecondary }}>{r.profiles?.employee_id || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: font.sm, fontWeight: '700', color: colors.textPrimary }}>{r.profiles?.full_name || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: font.sm, color: colors.textSecondary }}>{r.profiles?.department || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: font.sm, color: colors.textSecondary }}>{fmt(r.clock_in)}</td>
                    <td style={{ padding: '12px 16px', fontSize: font.sm, color: colors.textSecondary }}>{fmt(r.clock_out)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: badge.bg, color: badge.text, padding: '3px 12px', borderRadius: radius.full, fontSize: '11px', fontWeight: '700', textTransform: 'capitalize' }}>
                        {r.status || '—'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
