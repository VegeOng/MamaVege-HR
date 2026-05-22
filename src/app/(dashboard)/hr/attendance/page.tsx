'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function HRAttendancePage() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => { loadAttendance() }, [selectedDate])

  async function loadAttendance() {
    setLoading(true)
    const { data } = await supabase
      .from('attendance')
      .select('*, profiles(full_name, employee_id, department)')
      .eq('date', selectedDate)
      .order('check_in', { ascending: true })
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
    total: records.length,
  }

  function fmt(time: string | null) {
    if (!time) return '-'
    return new Date('1970-01-01T' + time).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })
  }

  const statusColor: any = { present: '#16a34a', late: '#d97706', absent: '#dc2626', 'half-day': '#7c3aed' }
  const statusBg: any = { present: '#dcfce7', late: '#fef3c7', absent: '#fee2e2', 'half-day': '#ede9fe' }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1B4332', margin: '0 0 4px' }}>Attendance 考勤管理</h1>
      <p style={{ color: '#6B7280', margin: '0 0 24px', fontSize: '14px' }}>View and manage employee attendance records</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[{label:'Present',value:stats.present,color:'#16a34a'},{label:'Late',value:stats.late,color:'#d97706'},{label:'Absent',value:stats.absent,color:'#dc2626'},{label:'Total',value:stats.total,color:'#1B4332'}].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ color: '#6B7280', fontSize: '13px', margin: '0 0 8px' }}>{s.label}</p>
            <p style={{ fontSize: '32px', fontWeight: '700', color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>
      <div style={{ background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ padding: '8px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }} />
        <input type="text" placeholder="Search name / ID..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '8px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', minWidth: '200px' }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}>
          <option value="all">All Status</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
        </select>
        <button onClick={loadAttendance} style={{ padding: '8px 16px', background: '#1B4332', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>Refresh</button>
      </div>
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              {['Employee ID','Name','Department','Check In','Check Out','Status','Notes'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>No records for this date</td></tr>
            ) : filtered.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{r.profiles?.employee_id || '-'}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#111827' }}>{r.profiles?.full_name || '-'}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6B7280' }}>{r.profiles?.department || '-'}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{fmt(r.check_in)}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{fmt(r.check_out)}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: statusBg[r.status]||'#F3F4F6', color: statusColor[r.status]||'#374151', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>{r.status}</span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6B7280' }}>{r.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
