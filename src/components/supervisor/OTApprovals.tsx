'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Timer, Clock, CheckCircle2, XCircle, ListFilter } from 'lucide-react'
import { colors, radius, shadow, styles, font } from '@/lib/design'

const FILTERS = [
  { id: 'pending', label: 'Pending', icon: <Clock size={13} /> },
  { id: 'approved', label: 'Approved', icon: <CheckCircle2 size={13} /> },
  { id: 'rejected', label: 'Rejected', icon: <XCircle size={13} /> },
  { id: 'all', label: 'All', icon: <ListFilter size={13} /> },
]

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
      .eq('supervisor_id', user.id).eq('is_active', true)

    const teamIds = (teamMembers || []).map((m: any) => m.id)
    if (teamIds.length === 0) { setRequests([]); setLoading(false); return }

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
    const { error } = await supabase
      .from('ot_requests')
      .update({ status, supervisor_approved_at: new Date().toISOString() })
      .eq('id', id)

    if (error) showToast('Failed to update', 'error')
    else {
      showToast(`OT request ${status}`, 'success')
      loadData()
    }
    setActionLoading(null)
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '16px', right: '16px', zIndex: 999,
          padding: '12px 18px', borderRadius: radius.md, fontSize: font.sm, fontWeight: '700',
          boxShadow: shadow.cardHover,
          background: toast.type === 'success' ? colors.successBg : colors.dangerBg,
          color: toast.type === 'success' ? colors.successText : colors.dangerText,
        }}>
          {toast.msg}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: radius.full, fontSize: font.sm, fontWeight: '600',
            border: 'none', cursor: 'pointer', textTransform: 'capitalize',
            background: filter === f.id ? colors.primary : 'white',
            color: filter === f.id ? 'white' : colors.textMuted,
            boxShadow: shadow.card,
          }}>{f.icon}{f.label}</button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ ...styles.card, textAlign: 'center', padding: '48px', color: colors.textMuted }}>Loading...</div>
      ) : requests.length === 0 ? (
        <div style={{ ...styles.card, textAlign: 'center', padding: '48px' }}>
          <Timer size={32} color={colors.textMuted} style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ margin: 0, color: colors.textMuted, fontSize: font.base }}>No {filter !== 'all' ? filter : ''} OT requests</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {requests.map(r => {
            const hours = r.total_hours ? `${parseFloat(r.total_hours).toFixed(1)}h` : '—'
            const initials = (r.profiles?.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
            return (
              <div key={r.id} style={{ ...styles.card, padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '14px', flex: 1, minWidth: '240px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: radius.md, flexShrink: 0,
                      background: 'linear-gradient(135deg, #1B4332, #52B788)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: '13px', fontWeight: '700'
                    }}>
                      {initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <p style={{ margin: 0, fontSize: font.base, fontWeight: '700', color: colors.textPrimary }}>{r.profiles?.full_name}</p>
                        <span style={{ fontSize: font.xs, color: colors.textMuted }}>{r.profiles?.employee_id}</span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: font.sm, color: colors.textSecondary }}>{r.reason || 'No reason provided'}</p>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: font.xs, color: colors.textMuted }}>{r.date}</span>
                        <span style={{ fontSize: font.xs, color: colors.textMuted }}>{r.start_time?.slice(0,5)} – {r.end_time?.slice(0,5)}</span>
                        <span style={{ fontSize: font.xs, fontWeight: '700', color: colors.info }}>{hours}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    {r.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleAction(r.id, 'rejected')} disabled={actionLoading === r.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', background: colors.dangerBg, color: colors.dangerText, border: 'none', borderRadius: radius.sm, fontSize: '12px', cursor: 'pointer', fontWeight: '700', opacity: actionLoading === r.id ? 0.5 : 1 }}>
                          <X size={12} />Reject
                        </button>
                        <button onClick={() => handleAction(r.id, 'approved')} disabled={actionLoading === r.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', background: colors.success, color: 'white', border: 'none', borderRadius: radius.sm, fontSize: '12px', cursor: 'pointer', fontWeight: '700', opacity: actionLoading === r.id ? 0.5 : 1 }}>
                          <Check size={12} />Approve
                        </button>
                      </div>
                    ) : (
                      <span style={{
                        fontSize: '11px', fontWeight: '700', padding: '4px 12px', borderRadius: radius.full, textTransform: 'capitalize',
                        background: r.status === 'approved' ? colors.successBg : colors.dangerBg,
                        color: r.status === 'approved' ? colors.successText : colors.dangerText,
                      }}>{r.status}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
