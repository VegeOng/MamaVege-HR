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

export default function HROTPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [actingId, setActingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const supabase = createClient()

  useEffect(() => { loadData() }, [filter])

  async function loadData() {
    setLoading(true)
    let q = supabase.from('ot_requests').select('*, profiles(full_name, employee_id, department), supervisor:profiles!ot_requests_supervisor_id_fkey(full_name)').order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setRequests(data || [])
    setLoading(false)
  }

  async function handleApprove(id: string) {
    setActingId(id)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('ot_requests').update({
      status: 'approved', hr_noted_by: user?.id, hr_noted_at: new Date().toISOString(),
      supervisor_approved_at: new Date().toISOString(),
    }).eq('id', id)
    await loadData()
    setActingId(null)
  }

  async function handleReject(id: string) {
    setActingId(id)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('ot_requests').update({
      status: 'rejected', hr_noted_by: user?.id, hr_noted_at: new Date().toISOString(),
      supervisor_notes: rejectNote || null,
    }).eq('id', id)
    await loadData()
    setActingId(null); setRejectingId(null); setRejectNote('')
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const pendingHours = requests.filter(r => r.status === 'pending').reduce((s, r) => s + (r.total_hours || 0), 0)

  return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ ...styles.pageTitle }}>Overtime 加班管理</h1>
          <p style={{ ...styles.pageSubtitle }}>Review and approve employee overtime requests</p>
        </div>

        {filter === 'pending' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '20px' }}>
            <div style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: radius.md, background: colors.warningBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} color={colors.warningText} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: colors.textPrimary, letterSpacing: '-0.5px' }}>{pendingCount}</p>
                <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pending Requests</p>
              </div>
            </div>
            <div style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: radius.md, background: colors.infoBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Timer size={20} color={colors.infoText} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: colors.textPrimary, letterSpacing: '-0.5px' }}>{pendingHours.toFixed(1)}h</p>
                <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hours Pending</p>
              </div>
            </div>
          </div>
        )}

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

        {loading ? (
          <div style={{ ...styles.card, textAlign: 'center', padding: '48px', color: colors.textMuted }}>Loading...</div>
        ) : requests.length === 0 ? (
          <div style={{ ...styles.card, textAlign: 'center', padding: '48px' }}>
            <Timer size={32} color={colors.textMuted} style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ margin: 0, color: colors.textMuted, fontSize: font.base }}>No {filter !== 'all' ? filter : ''} OT requests found</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {requests.map(r => {
              const initials = (r.profiles?.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
              return (
                <div key={r.id} style={{ ...styles.card, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '14px', flex: 1, minWidth: '260px' }}>
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
                          {r.profiles?.department && <span style={{ fontSize: font.xs, color: colors.textMuted }}>· {r.profiles.department}</span>}
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: font.sm, color: colors.textSecondary }}>{r.reason || 'No reason provided'}</p>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: font.xs, color: colors.textMuted }}>{fmtDate(r.date)}</span>
                          <span style={{ fontSize: font.xs, color: colors.textMuted }}>{r.start_time?.slice(0,5)} – {r.end_time?.slice(0,5)}</span>
                          <span style={{ fontSize: font.xs, fontWeight: '700', color: colors.info }}>{r.total_hours?.toFixed(1)}h</span>
                          {r.supervisor?.full_name && <span style={{ fontSize: font.xs, color: colors.textMuted }}>Supervisor: {r.supervisor.full_name}</span>}
                          {r.ot_pay && <span style={{ fontSize: font.xs, fontWeight: '700', color: colors.successText }}>RM {parseFloat(r.ot_pay).toFixed(2)}</span>}
                        </div>
                        {r.status === 'rejected' && r.supervisor_notes && (
                          <p style={{ margin: '6px 0 0', fontSize: font.xs, color: colors.dangerText, background: colors.dangerBg, padding: '4px 8px', borderRadius: radius.sm, display: 'inline-block' }}>
                            Reason: {r.supervisor_notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      {r.status === 'pending' ? (
                        rejectingId === r.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                            <input
                              value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                              placeholder="Reason (optional)"
                              style={{ ...styles.input, fontSize: font.xs, padding: '6px 10px', width: '180px' }}
                              autoFocus
                            />
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => { setRejectingId(null); setRejectNote('') }} style={{ padding: '5px 10px', background: colors.borderLight, color: colors.textMuted, border: 'none', borderRadius: radius.sm, fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                              <button onClick={() => handleReject(r.id)} disabled={actingId === r.id} style={{ padding: '5px 12px', background: colors.danger, color: 'white', border: 'none', borderRadius: radius.sm, fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>
                                {actingId === r.id ? '...' : 'Confirm Reject'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => setRejectingId(r.id)} disabled={actingId === r.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', background: colors.dangerBg, color: colors.dangerText, border: 'none', borderRadius: radius.sm, fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}>
                              <X size={12} />Reject
                            </button>
                            <button onClick={() => handleApprove(r.id)} disabled={actingId === r.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', background: colors.success, color: 'white', border: 'none', borderRadius: radius.sm, fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}>
                              <Check size={12} />{actingId === r.id ? '...' : 'Approve'}
                            </button>
                          </div>
                        )
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
    </div>
  )
}
