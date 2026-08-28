'use client'
import { useEffect, useState, Fragment } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, X, FileText, Clock, CheckCircle2, XCircle, ListFilter, CalendarDays, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { colors, radius, shadow, styles, font } from '@/lib/design'
import { formatDate, generateWhatsAppLink } from '@/lib/utils'

const FILTERS = [
  { id: 'pending', label: 'Pending', icon: <Clock size={13} /> },
  { id: 'approved', label: 'Approved', icon: <CheckCircle2 size={13} /> },
  { id: 'rejected', label: 'Rejected', icon: <XCircle size={13} /> },
  { id: 'all', label: 'All', icon: <ListFilter size={13} /> },
]

const TYPE_COLORS: Record<string, string> = {
  AL: colors.gradients.green,
  ML: colors.gradients.pink,
  EL: colors.gradients.purple,
  UL: colors.gradients.orange,
  PH: colors.gradients.blue,
}

export default function HRLeavePage() {
  const [viewMode, setViewMode] = useState<'requests' | 'monthly'>('requests')
  const [requests, setRequests] = useState<any[]>([])
  const [leaveTypes, setLeaveTypes] = useState<Record<string, { name: string; code: string }>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [actingId, setActingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [monthlyRequests, setMonthlyRequests] = useState<any[]>([])
  const [loadingMonthly, setLoadingMonthly] = useState(true)
  const [monthlySearch, setMonthlySearch] = useState('')
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { loadTypes() }, [])
  useEffect(() => { loadData() }, [filter])
  useEffect(() => { if (viewMode === 'monthly') loadMonthlyData() }, [viewMode, month])

  async function loadMonthlyData() {
    setLoadingMonthly(true)
    const [y, m] = month.split('-').map(Number)
    const start = `${month}-01`
    const end = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
    const { data } = await supabase.from('leave_requests')
      .select('*, profiles!leave_requests_employee_id_fkey(full_name, employee_id, department)')
      .gte('start_date', start).lte('start_date', end).order('start_date')
    setMonthlyRequests(data || [])
    setLoadingMonthly(false)
  }

  async function loadTypes() {
    const { data } = await supabase.from('leave_types').select('id, name, code')
    const map: Record<string, { name: string; code: string }> = {}
    for (const t of data || []) map[t.id] = { name: t.name, code: t.code }
    setLeaveTypes(map)
  }

  async function loadData() {
    setLoading(true)
    let q = supabase.from('leave_requests').select('*, profiles!leave_requests_employee_id_fkey(full_name, employee_id, department, whatsapp_number)').order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setRequests(data || [])
    setLoading(false)
  }

  function notifyEmployee(r: any, status: 'approved' | 'rejected', note?: string) {
    const phone = r.profiles?.whatsapp_number
    if (!phone) return
    const type = leaveTypes[r.leave_type_id]?.name || 'Leave'
    let msgText = `Hi ${r.profiles?.full_name}, your ${type} request (${formatDate(r.start_date)}${r.end_date !== r.start_date ? ` - ${formatDate(r.end_date)}` : ''}) has been ${status === 'approved' ? 'APPROVED ✅' : 'REJECTED ❌'}.`
    if (status === 'rejected' && note) msgText += ` Reason: ${note}`
    window.open(generateWhatsAppLink(phone, msgText), '_blank')
  }

  async function handleApprove(r: any) {
    setActingId(r.id)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('leave_requests').update({
      status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
    }).eq('id', r.id)

    // Update entitlement usage if a record exists for this employee/type/year
    const year = new Date(r.start_date).getFullYear()
    const { data: ent } = await supabase.from('leave_entitlements').select('id, used_hours')
      .eq('employee_id', r.employee_id).eq('leave_type_id', r.leave_type_id).eq('year', year).maybeSingle()
    if (ent) {
      await supabase.from('leave_entitlements').update({ used_hours: (ent.used_hours || 0) + (r.total_hours || 0) }).eq('id', ent.id)
    }

    notifyEmployee(r, 'approved')
    await loadData()
    setActingId(null)
  }

  async function handleReject(r: any) {
    setActingId(r.id)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('leave_requests').update({
      status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
      reviewer_notes: rejectNote || null,
    }).eq('id', r.id)
    notifyEmployee(r, 'rejected', rejectNote)
    await loadData()
    setActingId(null); setRejectingId(null); setRejectNote('')
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const pendingDays = requests.filter(r => r.status === 'pending').reduce((s, r) => s + (r.total_hours || 0) / 8, 0)

  const monthlySummary = (() => {
    const map: Record<string, any> = {}
    monthlyRequests.forEach(r => {
      const key = r.employee_id
      if (!map[key]) map[key] = { employee_id: key, profile: r.profiles, approvedDays: 0, pendingDays: 0, rejectedDays: 0 }
      const days = (r.total_hours || 0) / 8
      if (r.status === 'approved') map[key].approvedDays += days
      else if (r.status === 'pending') map[key].pendingDays += days
      else if (r.status === 'rejected') map[key].rejectedDays += days
    })
    return Object.values(map).sort((a: any, b: any) => (a.profile?.full_name || '').localeCompare(b.profile?.full_name || ''))
  })()

  const filteredMonthlySummary = monthlySummary.filter((s: any) =>
    !monthlySearch ||
    s.profile?.full_name?.toLowerCase().includes(monthlySearch.toLowerCase()) ||
    s.profile?.employee_id?.toLowerCase().includes(monthlySearch.toLowerCase())
  )

  return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ ...styles.pageTitle }}>Leave 假期管理</h1>
            <p style={{ ...styles.pageSubtitle }}>Review and approve employee leave requests</p>
          </div>
          <div style={{ display: 'flex', gap: '6px', background: 'white', padding: '4px', borderRadius: radius.full, boxShadow: shadow.card }}>
            {(['requests', 'monthly'] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)} style={{
                padding: '6px 14px', borderRadius: radius.full, fontSize: font.sm, fontWeight: '600',
                border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                background: viewMode === v ? colors.primary : 'transparent',
                color: viewMode === v ? 'white' : colors.textMuted,
              }}>{v === 'requests' ? 'Requests' : 'Monthly'}</button>
            ))}
          </div>
        </div>

        {viewMode === 'requests' ? (
        <>
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
                <CalendarDays size={20} color={colors.infoText} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: colors.textPrimary, letterSpacing: '-0.5px' }}>{pendingDays.toFixed(1)}</p>
                <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Days Pending</p>
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
            <CalendarDays size={32} color={colors.textMuted} style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ margin: 0, color: colors.textMuted, fontSize: font.base }}>No {filter !== 'all' ? filter : ''} leave requests found</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {requests.map(r => {
              const type = leaveTypes[r.leave_type_id] || { name: 'Leave', code: 'AL' }
              const typeColor = TYPE_COLORS[type.code] || colors.gradients.green
              const initials = (r.profiles?.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
              const days = (r.total_hours || 0) / 8
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
                          <span style={{
                            fontSize: '10px', fontWeight: '700', color: 'white', padding: '2px 9px',
                            borderRadius: radius.full, background: typeColor
                          }}>{type.name}</span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: font.sm, color: colors.textSecondary }}>{r.reason || 'No reason provided'}</p>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: font.xs, color: colors.textMuted }}>
                            {fmtDate(r.start_date)}{r.end_date !== r.start_date ? ` → ${fmtDate(r.end_date)}` : ''}
                          </span>
                          <span style={{ fontSize: font.xs, fontWeight: '700', color: colors.info }}>
                            {days % 1 === 0 ? days.toFixed(0) : days.toFixed(1)} day{days === 1 ? '' : 's'}
                          </span>
                          {r.duration_type === '2hours' && r.start_time && r.end_time && (
                            <span style={{ fontSize: font.xs, color: colors.textMuted }}>{r.start_time?.slice(0,5)} – {r.end_time?.slice(0,5)}</span>
                          )}
                          {r.mc_document_url && (
                            <a href={r.mc_document_url} target="_blank" rel="noreferrer" style={{ fontSize: font.xs, color: colors.info, fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <FileText size={11} />MC Document
                            </a>
                          )}
                          {r.mc_amount && (
                            <span style={{ fontSize: font.xs, color: colors.textMuted }}>Claim: RM {parseFloat(r.mc_amount).toFixed(2)}</span>
                          )}
                        </div>
                        {r.status === 'rejected' && r.reviewer_notes && (
                          <p style={{ margin: '6px 0 0', fontSize: font.xs, color: colors.dangerText, background: colors.dangerBg, padding: '4px 8px', borderRadius: radius.sm, display: 'inline-block' }}>
                            Reason: {r.reviewer_notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
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
                              <button onClick={() => handleReject(r)} disabled={actingId === r.id} style={{ padding: '5px 12px', background: colors.danger, color: 'white', border: 'none', borderRadius: radius.sm, fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>
                                {actingId === r.id ? '...' : 'Confirm Reject'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setRejectingId(r.id)} disabled={actingId === r.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', background: colors.dangerBg, color: colors.dangerText, border: 'none', borderRadius: radius.sm, fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}>
                              <X size={12} />Reject
                            </button>
                            <button onClick={() => handleApprove(r)} disabled={actingId === r.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', background: colors.success, color: 'white', border: 'none', borderRadius: radius.sm, fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}>
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
        </>
        ) : (
        <>
          {/* Monthly search */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted, pointerEvents: 'none' }} />
              <input
                type="text" placeholder="Search name or ID..."
                value={monthlySearch} onChange={e => setMonthlySearch(e.target.value)}
                style={{ ...styles.input, paddingLeft: '34px', width: '100%' }}
              />
            </div>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ ...styles.input, width: 'auto' }} />
          </div>

          {/* Monthly Table */}
          <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: colors.borderLight, borderBottom: `1px solid ${colors.border}` }}>
                    {['Employee', 'Department', 'Approved', 'Pending', 'Rejected'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingMonthly ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: colors.textMuted, fontSize: font.base }}>Loading...</td></tr>
                  ) : filteredMonthlySummary.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: colors.textMuted, fontSize: font.base }}>No leave requests for this month</td></tr>
                  ) : filteredMonthlySummary.map((s: any) => {
                    const isExpanded = expandedEmployee === s.employee_id
                    const empRequests = monthlyRequests
                      .filter(r => r.employee_id === s.employee_id)
                      .sort((a, b) => a.start_date.localeCompare(b.start_date))
                    return (
                      <Fragment key={s.employee_id}>
                        <tr
                          onClick={() => setExpandedEmployee(isExpanded ? null : s.employee_id)}
                          style={{ borderBottom: isExpanded ? 'none' : `1px solid ${colors.borderLight}`, cursor: 'pointer', background: isExpanded ? colors.pageBg : 'transparent' }}>
                          <td style={{ padding: '13px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                              {isExpanded ? <ChevronDown size={14} color={colors.textMuted} /> : <ChevronRight size={14} color={colors.textMuted} />}
                              <div style={{
                                width: '36px', height: '36px', borderRadius: radius.md, flexShrink: 0,
                                background: 'linear-gradient(135deg, #1B4332, #52B788)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontSize: '12px', fontWeight: '700'
                              }}>
                                {(s.profile?.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p style={{ margin: 0, fontSize: font.base, fontWeight: '600', color: colors.textPrimary }}>{s.profile?.full_name || '-'}</p>
                                <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted }}>{s.profile?.employee_id || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '13px 16px', fontSize: font.sm, color: colors.textSecondary }}>{s.profile?.department || '-'}</td>
                          <td style={{ padding: '13px 16px', fontSize: font.sm, fontWeight: '700', color: colors.successText }}>{s.approvedDays % 1 === 0 ? s.approvedDays.toFixed(0) : s.approvedDays.toFixed(1)}</td>
                          <td style={{ padding: '13px 16px', fontSize: font.sm, fontWeight: '700', color: colors.warningText }}>{s.pendingDays % 1 === 0 ? s.pendingDays.toFixed(0) : s.pendingDays.toFixed(1)}</td>
                          <td style={{ padding: '13px 16px', fontSize: font.sm, fontWeight: '700', color: colors.dangerText }}>{s.rejectedDays % 1 === 0 ? s.rejectedDays.toFixed(0) : s.rejectedDays.toFixed(1)}</td>
                        </tr>
                        {isExpanded && (
                          <tr style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                            <td colSpan={5} style={{ padding: '0 16px 16px 60px', background: colors.pageBg }}>
                              <div style={{ background: 'white', borderRadius: radius.md, overflow: 'hidden', border: `1px solid ${colors.borderLight}` }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr style={{ background: colors.borderLight }}>
                                      {['Type', 'Dates', 'Days', 'Status'].map(h => (
                                        <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {empRequests.map(r => {
                                      const type = leaveTypes[r.leave_type_id] || { name: 'Leave', code: 'AL' }
                                      const days = (r.total_hours || 0) / 8
                                      return (
                                        <tr key={r.id} style={{ borderTop: `1px solid ${colors.borderLight}` }}>
                                          <td style={{ padding: '8px 14px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: '700', color: 'white', padding: '2px 9px', borderRadius: radius.full, background: TYPE_COLORS[type.code] || colors.gradients.green }}>{type.name}</span>
                                          </td>
                                          <td style={{ padding: '8px 14px', fontSize: font.sm, color: colors.textPrimary, fontWeight: '600' }}>
                                            {fmtDate(r.start_date)}{r.end_date !== r.start_date ? ` → ${fmtDate(r.end_date)}` : ''}
                                          </td>
                                          <td style={{ padding: '8px 14px', fontSize: font.sm, color: colors.textSecondary }}>{days % 1 === 0 ? days.toFixed(0) : days.toFixed(1)}</td>
                                          <td style={{ padding: '8px 14px' }}>
                                            <span style={{
                                              fontSize: '10px', fontWeight: '700', padding: '2px 9px', borderRadius: radius.full, textTransform: 'capitalize',
                                              background: r.status === 'approved' ? colors.successBg : r.status === 'rejected' ? colors.dangerBg : colors.warningBg,
                                              color: r.status === 'approved' ? colors.successText : r.status === 'rejected' ? colors.dangerText : colors.warningText,
                                            }}>{r.status}</span>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
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
