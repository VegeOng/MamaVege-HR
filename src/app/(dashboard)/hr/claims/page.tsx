'use client'
import { useEffect, useState, Fragment } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, X, FileText, Clock, CheckCircle2, XCircle, ListFilter, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { colors, radius, shadow, styles, font } from '@/lib/design'
import { generateWhatsAppLink } from '@/lib/utils'

const TYPE_COLORS: Record<string, string> = {
  PETROL: colors.gradients.orange,
  MEAL: colors.gradients.teal,
  MEDICAL: colors.gradients.pink,
  HOTEL: colors.gradients.blue,
  COMM: colors.gradients.purple,
  OTHERS: colors.gradients.indigo,
}

const FILTERS = [
  { id: 'pending', label: 'Pending', icon: <Clock size={13} /> },
  { id: 'approved', label: 'Approved', icon: <CheckCircle2 size={13} /> },
  { id: 'rejected', label: 'Rejected', icon: <XCircle size={13} /> },
  { id: 'all', label: 'All', icon: <ListFilter size={13} /> },
]

export default function HRClaimsPage() {
  const [viewMode, setViewMode] = useState<'requests' | 'monthly'>('requests')
  const [claims, setClaims] = useState<any[]>([])
  const [claimTypes, setClaimTypes] = useState<Record<string, { name: string; code: string }>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [actingId, setActingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [monthlyClaims, setMonthlyClaims] = useState<any[]>([])
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
    const { data } = await supabase.from('claims')
      .select('*, profiles!claims_employee_id_fkey(full_name, employee_id, department)')
      .eq('year', y).eq('month', m).eq('status', 'approved')
    setMonthlyClaims(data || [])
    setLoadingMonthly(false)
  }

  async function loadTypes() {
    const { data } = await supabase.from('claim_types').select('id, name, code')
    const map: Record<string, { name: string; code: string }> = {}
    for (const t of data || []) map[t.id] = { name: t.name, code: t.code }
    setClaimTypes(map)
  }

  async function loadData() {
    setLoading(true)
    let q = supabase.from('claims').select('*, profiles!claims_employee_id_fkey(full_name, employee_id, department, whatsapp_number)').order('claim_date', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setClaims(data || [])
    setLoading(false)
  }

  function notifyEmployee(c: any, status: 'approved' | 'rejected', note?: string) {
    const phone = c.profiles?.whatsapp_number
    if (!phone) return
    const type = claimTypes[c.claim_type_id]?.name || 'Claim'
    let msgText = `Hi ${c.profiles?.full_name}, your ${type} claim of RM ${parseFloat(c.amount || 0).toFixed(2)} has been ${status === 'approved' ? 'APPROVED ✅' : 'REJECTED ❌'}.`
    if (status === 'rejected' && note) msgText += ` Reason: ${note}`
    window.open(generateWhatsAppLink(phone, msgText), '_blank')
  }

  async function handleApprove(c: any) {
    setActingId(c.id)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('claims').update({
      status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
    }).eq('id', c.id)
    notifyEmployee(c, 'approved')
    await loadData()
    setActingId(null)
  }

  async function handleReject(c: any) {
    setActingId(c.id)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('claims').update({
      status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
      reviewer_notes: rejectNote || null,
    }).eq('id', c.id)
    notifyEmployee(c, 'rejected', rejectNote)
    await loadData()
    setActingId(null); setRejectingId(null); setRejectNote('')
  }

  const monthLabel = (m: number, y: number) => new Date(y, m - 1, 1).toLocaleDateString('en-MY', { month: 'short', year: 'numeric' })

  const pendingCount = claims.filter(c => c.status === 'pending').length
  const pendingTotal = claims.filter(c => c.status === 'pending').reduce((s, c) => s + parseFloat(c.amount || 0), 0)

  const monthlySummary = (() => {
    const map: Record<string, any> = {}
    monthlyClaims.forEach(c => {
      const key = c.employee_id
      if (!map[key]) map[key] = { employee_id: key, profile: c.profiles, approvedTotal: 0 }
      map[key].approvedTotal += parseFloat(c.amount || 0)
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
            <h1 style={{ ...styles.pageTitle }}>Claims 报销管理</h1>
            <p style={{ ...styles.pageSubtitle }}>Review and approve employee expense claims</p>
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
                <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pending Claims</p>
              </div>
            </div>
            <div style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: radius.md, background: colors.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: colors.successText, fontSize: '14px', fontWeight: '800' }}>RM</span>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: colors.textPrimary, letterSpacing: '-0.5px' }}>{pendingTotal.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
                <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Pending Amount</p>
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
        ) : claims.length === 0 ? (
          <div style={{ ...styles.card, textAlign: 'center', padding: '48px' }}>
            <FileText size={32} color={colors.textMuted} style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ margin: 0, color: colors.textMuted, fontSize: font.base }}>No {filter !== 'all' ? filter : ''} claims found</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {claims.map(c => {
              const type = claimTypes[c.claim_type_id] || { name: 'Unknown', code: 'OTHERS' }
              const typeColor = TYPE_COLORS[type.code] || colors.gradients.green
              const initials = (c.profiles?.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
              const receiptUrls: string[] = c.receipt_urls?.length ? c.receipt_urls : (c.receipt_url ? [c.receipt_url] : [])
              return (
                <div key={c.id} style={{ ...styles.card, padding: '16px 20px' }}>
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
                          <p style={{ margin: 0, fontSize: font.base, fontWeight: '700', color: colors.textPrimary }}>{c.profiles?.full_name}</p>
                          <span style={{ fontSize: font.xs, color: colors.textMuted }}>{c.profiles?.employee_id}</span>
                          <span style={{
                            fontSize: '10px', fontWeight: '700', color: 'white', padding: '2px 9px',
                            borderRadius: radius.full, background: typeColor
                          }}>{type.name}</span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: font.sm, color: colors.textSecondary }}>{c.description || '-'}</p>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: font.xs, color: colors.textMuted }}>{monthLabel(c.month, c.year)}</span>
                          <span style={{ fontSize: font.xs, color: colors.textMuted }}>Claim date: {new Date(c.claim_date || c.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          {receiptUrls.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noreferrer" style={{ fontSize: font.xs, color: colors.info, fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <FileText size={11} />{receiptUrls.length > 1 ? `Receipt ${idx + 1}` : 'View Receipt'}
                            </a>
                          ))}
                        </div>
                        {c.status === 'rejected' && c.reviewer_notes && (
                          <p style={{ margin: '6px 0 0', fontSize: font.xs, color: colors.dangerText, background: colors.dangerBg, padding: '4px 8px', borderRadius: radius.sm, display: 'inline-block' }}>
                            Reason: {c.reviewer_notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '800', color: colors.textPrimary, letterSpacing: '-0.3px' }}>
                        RM {parseFloat(c.amount || 0).toFixed(2)}
                      </p>
                      {c.status === 'pending' ? (
                        rejectingId === c.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                            <input
                              value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                              placeholder="Reason (optional)"
                              style={{ ...styles.input, fontSize: font.xs, padding: '6px 10px', width: '180px' }}
                              autoFocus
                            />
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => { setRejectingId(null); setRejectNote('') }} style={{ padding: '5px 10px', background: colors.borderLight, color: colors.textMuted, border: 'none', borderRadius: radius.sm, fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                              <button onClick={() => handleReject(c)} disabled={actingId === c.id} style={{ padding: '5px 12px', background: colors.danger, color: 'white', border: 'none', borderRadius: radius.sm, fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>
                                {actingId === c.id ? '...' : 'Confirm Reject'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setRejectingId(c.id)} disabled={actingId === c.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', background: colors.dangerBg, color: colors.dangerText, border: 'none', borderRadius: radius.sm, fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}>
                              <X size={12} />Reject
                            </button>
                            <button onClick={() => handleApprove(c)} disabled={actingId === c.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', background: colors.success, color: 'white', border: 'none', borderRadius: radius.sm, fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}>
                              <Check size={12} />{actingId === c.id ? '...' : 'Approve'}
                            </button>
                          </div>
                        )
                      ) : (
                        <span style={{
                          fontSize: '11px', fontWeight: '700', padding: '4px 12px', borderRadius: radius.full, textTransform: 'capitalize',
                          background: c.status === 'approved' ? colors.successBg : colors.dangerBg,
                          color: c.status === 'approved' ? colors.successText : colors.dangerText,
                        }}>{c.status}</span>
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
                    {['Employee', 'Department', 'Approved'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingMonthly ? (
                    <tr><td colSpan={3} style={{ textAlign: 'center', padding: '48px', color: colors.textMuted, fontSize: font.base }}>Loading...</td></tr>
                  ) : filteredMonthlySummary.length === 0 ? (
                    <tr><td colSpan={3} style={{ textAlign: 'center', padding: '48px', color: colors.textMuted, fontSize: font.base }}>No approved claims for this month</td></tr>
                  ) : filteredMonthlySummary.map((s: any) => {
                    const isExpanded = expandedEmployee === s.employee_id
                    const empClaims = monthlyClaims
                      .filter(c => c.employee_id === s.employee_id)
                      .sort((a, b) => (a.claim_date || '').localeCompare(b.claim_date || ''))
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
                          <td style={{ padding: '13px 16px', fontSize: font.sm, fontWeight: '700', color: colors.successText }}>RM {s.approvedTotal.toFixed(2)}</td>
                        </tr>
                        {isExpanded && (
                          <tr style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                            <td colSpan={3} style={{ padding: '0 16px 16px 60px', background: colors.pageBg }}>
                              <div style={{ background: 'white', borderRadius: radius.md, overflow: 'hidden', border: `1px solid ${colors.borderLight}` }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr style={{ background: colors.borderLight }}>
                                      {['Type', 'Description', 'Date', 'Amount'].map(h => (
                                        <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {empClaims.map(c => {
                                      const type = claimTypes[c.claim_type_id] || { name: 'Unknown', code: 'OTHERS' }
                                      const receiptUrls: string[] = c.receipt_urls?.length ? c.receipt_urls : (c.receipt_url ? [c.receipt_url] : [])
                                      return (
                                        <tr key={c.id} style={{ borderTop: `1px solid ${colors.borderLight}` }}>
                                          <td style={{ padding: '8px 14px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: '700', color: 'white', padding: '2px 9px', borderRadius: radius.full, background: TYPE_COLORS[type.code] || colors.gradients.green }}>{type.name}</span>
                                          </td>
                                          <td style={{ padding: '8px 14px', fontSize: font.sm, color: colors.textPrimary, fontWeight: '600' }}>
                                            {c.description || '-'}
                                            {receiptUrls.map((url, idx) => (
                                              <a key={idx} href={url} target="_blank" rel="noreferrer" style={{ marginLeft: '8px', fontSize: font.xs, color: colors.info, fontWeight: '600', textDecoration: 'none' }}>
                                                {receiptUrls.length > 1 ? `Receipt ${idx + 1}` : 'Receipt'}
                                              </a>
                                            ))}
                                          </td>
                                          <td style={{ padding: '8px 14px', fontSize: font.sm, color: colors.textSecondary }}>
                                            {new Date(c.claim_date || c.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                                          </td>
                                          <td style={{ padding: '8px 14px', fontSize: font.sm, color: colors.textSecondary }}>RM {parseFloat(c.amount || 0).toFixed(2)}</td>
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
