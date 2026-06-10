'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function OTApprovals() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const supabase = createClient()

  useEffect(() => { loadData() }, [filter])

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: teamMembers } = await supabase
      .from('profiles').select('id')
      .eq('supervisor_id', user.id).eq('status', 'active')

    const teamIds = (teamMembers || []).map((m: any) => m.id)
    if (teamIds.length === 0) { setLoading(false); return }

    let q = supabase
      .from('ot_requests')
      .select('*, profiles(full_name, employee_id, department)')
      .in('employee_id', teamIds)
      .order('created_at', { ascending: false })

    if (filter !== 'all') q = q.eq('status', filter)

    const { data } = await q
    setRequests(data || [])
    setLoading(false)
  }

  async function handleAction(id: string, status: 'approved' | 'rejected') {
    setActionLoading(id)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('ot_requests')
      .update({ status, approved_by: user?.id, approved_at: new Date().toISOString() })
      .eq('id', id)

    if (error) showToast('Failed to update', 'error')
    else {
      showToast(`OT request ${status}`, 'success')
      loadData()
    }
    setActionLoading(null)
  }

  const statusStyle: any = {
    approved: { background: '#dcfce7', color: '#16a34a' },
    rejected: { background: '#fee2e2', color: '#dc2626' },
    pending: { background: '#fef3c7', color: '#d97706' },
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '16px', right: '16px', zIndex: 999,
          padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '500',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          background: toast.type === 'success' ? '#f0fff4' : '#fff5f5',
          color: toast.type === 'success' ? '#1B4332' : '#c53030',
          border: `1px solid ${toast.type === 'success' ? '#9ae6b4' : '#feb2b2'}`,
        }}>
          {toast.msg}
        </div>
      )}

      {/* Filter buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '500',
            border: 'none', cursor: 'pointer', textTransform: 'capitalize',
            background: filter === f ? '#1B4332' : 'white',
            color: filter === f ? 'white' : '#6B7280',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>{f}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              {['Employee', 'Date', 'Time', 'Hours', 'Reason', 'Status', 'Action'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>No OT requests</td></tr>
            ) : requests.map((r, i) => {
              // Calculate hours
              let hours = '—'
              if (r.start_time && r.end_time) {
                const [sh, sm] = r.start_time.split(':').map(Number)
                const [eh, em] = r.end_time.split(':').map(Number)
                const diff = ((eh * 60 + em) - (sh * 60 + sm)) / 60
                hours = diff > 0 ? `${diff.toFixed(1)}h` : '—'
              }

              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0 }}>{r.profiles?.full_name}</p>
                    <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>{r.profiles?.employee_id}</p>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{r.ot_date}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{r.start_time} – {r.end_time}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{hours}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6B7280', maxWidth: '150px' }}>{r.reason || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ ...statusStyle[r.status], padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {r.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleAction(r.id, 'approved')}
                          disabled={actionLoading === r.id}
                          style={{ padding: '4px 10px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', opacity: actionLoading === r.id ? 0.5 : 1 }}>
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(r.id, 'rejected')}
                          disabled={actionLoading === r.id}
                          style={{ padding: '4px 10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', opacity: actionLoading === r.id ? 0.5 : 1 }}>
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
