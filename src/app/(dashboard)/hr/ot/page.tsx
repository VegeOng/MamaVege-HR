'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function HROTPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const supabase = createClient()

  useEffect(() => { loadData() }, [filter])

  async function loadData() {
    setLoading(true)
    let q = supabase.from('ot_requests').select('*, profiles(full_name, employee_id)').order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setRequests(data || [])
    setLoading(false)
  }

  async function handleAction(id: string, status: string) {
    await supabase.from('ot_requests').update({ status }).eq('id', id)
    loadData()
  }

  const statusStyle: any = {
    approved: { background: '#dcfce7', color: '#16a34a' },
    rejected: { background: '#fee2e2', color: '#dc2626' },
    pending: { background: '#fef3c7', color: '#d97706' },
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1B4332', margin: '0 0 4px' }}>Overtime 加班管理</h1>
      <p style={{ color: '#6B7280', fontSize: '14px', margin: '0 0 20px' }}>Review and approve overtime requests</p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '500',
            border: 'none', cursor: 'pointer', textTransform: 'capitalize',
            background: filter === f ? '#1B4332' : 'white',
            color: filter === f ? 'white' : '#6B7280',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>{f}</button>
        ))}
      </div>
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              {['Employee', 'Date', 'Hours', 'Reason', 'Status', 'Action'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>No requests</td></tr>
            ) : requests.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                <td style={{ padding: '12px 16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0 }}>{r.profiles?.full_name}</p>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>{r.profiles?.employee_id}</p>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{r.date}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{r.hours}h</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6B7280' }}>{r.reason}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ ...statusStyle[r.status], padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>{r.status}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {r.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleAction(r.id, 'approved')} style={{ padding: '4px 10px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Approve</button>
                      <button onClick={() => handleAction(r.id, 'rejected')} style={{ padding: '4px 10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
