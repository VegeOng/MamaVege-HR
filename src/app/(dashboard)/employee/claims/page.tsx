'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Upload, X, Paperclip } from 'lucide-react'
import { colors, radius, shadow, styles, font } from '@/lib/design'
import { generateWhatsAppLink } from '@/lib/utils'

function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  )
}

const CLAIM_TYPES = [
  { id: '55188c14-0a0c-482f-b6d8-c99754b05379', label: 'Petrol / Toll 油费', requiresReceipt: true, limitType: 'monthly' },
  { id: '7ea28c7c-2d5a-4265-a2d1-163d08567508', label: 'Meal 餐饮', requiresReceipt: true, limitType: 'monthly' },
  { id: 'd543eca8-7754-4378-a3e2-e7a9541358e3', label: 'Medical 医疗', requiresReceipt: true, limitType: 'yearly', maxPerClaim: 100 },
  { id: '1cd2ff61-0748-44b6-8230-66bad0e0ea96', label: 'Hotel / Accommodation 住宿', requiresReceipt: true, limitType: 'monthly' },
  { id: '19bf6b85-287e-413e-941f-38e386b201df', label: 'Commission 佣金', requiresReceipt: false, limitType: 'none' },
  { id: '82503f60-092b-44c2-a028-b96d1ef3699a', label: 'Others 其他', requiresReceipt: false, limitType: 'none' },
]

const MEDICAL_ID = 'd543eca8-7754-4378-a3e2-e7a9541358e3'

export default function EmployeeClaimsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [claims, setClaims] = useState<any[]>([])
  const [typeLimits, setTypeLimits] = useState<Record<string, number>>({}) // claim_type_id -> monthly_limit
  const [typeUsed, setTypeUsed] = useState<Record<string, number>>({}) // claim_type_id -> used this month
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [receipts, setReceipts] = useState<File[]>([])
  const [hrSettings, setHrSettings] = useState<any>({})
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    claim_type_id: '55188c14-0a0c-482f-b6d8-c99754b05379',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  })
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const thisMonth = new Date().toISOString().slice(0, 7)

    const now = new Date()
    const curMonth = now.getMonth() + 1
    const curYear = now.getFullYear()

    const [profileRes, claimsRes, limitsRes, settingsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('claims').select('*, claim_type:claim_types(name)').eq('employee_id', user.id).order('claim_date', { ascending: false }),
      supabase.from('claim_limits').select('*').eq('employee_id', user.id),
      supabase.from('company_settings').select('*'),
    ])

    setProfile(profileRes.data)
    setClaims(claimsRes.data || [])

    const settings: any = {}
    settingsRes.data?.forEach((s: any) => { settings[s.key] = s.value })
    setHrSettings(settings)

    // Build limits map
    const limitsMap: Record<string, number> = {}
    for (const l of limitsRes.data || []) {
      limitsMap[l.claim_type_id] = l.monthly_limit
    }
    setTypeLimits(limitsMap)

    // Build used map — monthly for most types, yearly for Medical
    const usedMap: Record<string, number> = {}
    for (const c of claimsRes.data || []) {
      if (c.status === 'rejected') continue
      const ct = CLAIM_TYPES.find(t => t.id === c.claim_type_id)
      if (ct?.limitType === 'yearly' && c.year === curYear) {
        usedMap[c.claim_type_id] = (usedMap[c.claim_type_id] || 0) + (c.amount || 0)
      } else if (ct?.limitType === 'monthly' && c.month === curMonth && c.year === curYear) {
        usedMap[c.claim_type_id] = (usedMap[c.claim_type_id] || 0) + (c.amount || 0)
      }
    }
    setTypeUsed(usedMap)
    setLoading(false)
  }

  async function handleSubmit() {
    if (!form.amount || !form.description) {
      setMsg({ type: 'error', text: 'Please fill in all fields.' }); return
    }
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) { setMsg({ type: 'error', text: 'Invalid amount.' }); return }
    const ct = CLAIM_TYPES.find(t => t.id === form.claim_type_id)
    // Medical: max RM100 per claim
    if (form.claim_type_id === MEDICAL_ID && amt > 100) {
      setMsg({ type: 'error', text: 'Medical claim cannot exceed RM 100 per submission.' }); return
    }
    const typeLimit = typeLimits[form.claim_type_id]
    const typeUsedAmt = typeUsed[form.claim_type_id] || 0
    if (typeLimit !== undefined && typeUsedAmt + amt > typeLimit) {
      const remaining = Math.max(0, typeLimit - typeUsedAmt)
      const period = ct?.limitType === 'yearly' ? 'yearly' : 'monthly'
      setMsg({ type: 'error', text: `Exceeds ${ct?.label.split(' ')[0]} ${period} limit. RM ${remaining.toFixed(2)} remaining.` }); return
    }

    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const receiptUrls: string[] = []
    for (const file of receipts) {
      const ext = file.name.split('.').pop()
      const path = `claims/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
      if (upErr) {
        setMsg({ type: 'error', text: `Receipt upload failed (${file.name}): ${upErr.message}. Please try again.` })
        setSubmitting(false)
        return
      }
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
      receiptUrls.push(urlData.publicUrl)
    }

    const claimDate = new Date(form.date)
    const { error } = await supabase.from('claims').insert({
      employee_id: user.id,
      claim_type_id: form.claim_type_id,
      amount: amt,
      description: form.description,
      receipt_url: receiptUrls[0] || null,
      receipt_urls: receiptUrls.length ? receiptUrls : null,
      claim_date: form.date,
      month: claimDate.getMonth() + 1,
      year: claimDate.getFullYear(),
      status: 'pending',
    })

    if (error) {
      setMsg({ type: 'error', text: 'Failed to submit. Please try again.' })
    } else {
      const ct = CLAIM_TYPES.find(t => t.id === form.claim_type_id)
      const msgText = `Hi, ${profile?.full_name} has submitted a ${ct?.label.split(' ')[0]} claim of RM ${amt.toFixed(2)}. Please review in MamaVege HR system.`
      if (hrSettings.hr_whatsapp) {
        window.open(generateWhatsAppLink(hrSettings.hr_whatsapp, msgText), '_blank')
      }

      setMsg({ type: 'success', text: 'Claim submitted successfully!' })
      setForm({ claim_type_id: '55188c14-0a0c-482f-b6d8-c99754b05379', amount: '', description: '', date: new Date().toISOString().split('T')[0] })
      setReceipts([])
      setShowForm(false)
      loadData()
    }
    setSubmitting(false)
  }

  const now = new Date()
  const monthClaims = claims.filter(c => c.month === now.getMonth() + 1 && c.year === now.getFullYear())
  const monthUsed = monthClaims.reduce((s, c) => s + parseFloat(c.amount || 0), 0)
  const totalApproved = claims.filter(c => c.status === 'approved').reduce((s, c) => s + (c.amount || 0), 0)
  const hasAnyLimit = Object.keys(typeLimits).length > 0

  const statusStyle = (s: string) => ({
    approved: { bg: colors.successBg, color: colors.successText },
    rejected: { bg: colors.dangerBg, color: colors.dangerText },
    pending: { bg: colors.warningBg, color: colors.warningText },
  }[s] || { bg: colors.borderLight, color: colors.textMuted })

  return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ ...styles.pageInner }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ ...styles.pageTitle }}>Claims 报销</h1>
            <p style={{ ...styles.pageSubtitle }}>Submit and track your expense claims</p>
          </div>
          <button onClick={() => { setShowForm(!showForm); setMsg(null) }} style={{
            ...styles.primaryButton,
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <Plus size={16} />
            New Claim
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {[
            { label: 'This Month', value: monthClaims.length + ' claims', sub: `RM ${monthUsed.toFixed(2)} used` },
            { label: 'Total Approved', value: 'RM ' + totalApproved.toFixed(2), sub: claims.filter(c => c.status === 'approved').length + ' claims' },
            { label: 'Pending', value: claims.filter(c => c.status === 'pending').length + '', sub: 'awaiting approval' },
          ].map(s => (
            <div key={s.label} style={{ ...styles.card }}>
              <p style={{ margin: '0 0 6px', fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
              <p style={{ margin: '0 0 2px', fontSize: font.xl, fontWeight: '800', color: colors.textPrimary }}>{s.value}</p>
              <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Per-type limits */}
        {hasAnyLimit && (
          <div style={{ ...styles.card, marginBottom: '20px' }}>
            <p style={{ ...styles.sectionLabel, marginBottom: '14px' }}>Monthly Limits — {now.toLocaleString('en-MY', { month: 'long', year: 'numeric' })}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {CLAIM_TYPES.filter(ct => ct.limitType !== 'none').map(ct => {
                const limit = typeLimits[ct.id]
                if (limit === undefined) return null
                const used = typeUsed[ct.id] || 0
                const remaining = Math.max(0, limit - used)
                const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
                const over = pct > 80
                const periodLabel = ct.limitType === 'yearly' ? `${now.getFullYear()} yearly` : 'this month'
                return (
                  <div key={ct.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: font.xs, fontWeight: '600', color: colors.textSecondary }}>
                        {ct.label.split(' ')[0]}
                        {ct.limitType === 'yearly' && <span style={{ color: colors.info, marginLeft: '4px', fontSize: '10px' }}>yearly</span>}
                        {ct.id === MEDICAL_ID && <span style={{ color: colors.textMuted, marginLeft: '4px', fontSize: '10px' }}>max RM100/claim</span>}
                      </span>
                      <span style={{ fontSize: font.xs, fontWeight: '700', color: over ? colors.danger : colors.primary }}>RM {remaining.toFixed(0)}</span>
                    </div>
                    <div style={{ height: '6px', background: colors.borderLight, borderRadius: radius.full, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: radius.full, width: `${pct}%`, transition: 'width 0.5s', background: over ? '#EF4444' : 'linear-gradient(90deg, #1B4332, #52B788)' }} />
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: '10px', color: colors.textMuted }}>RM {used.toFixed(0)} / {limit.toFixed(0)} ({periodLabel})</p>
                  </div>
                )
              }).filter(Boolean)}
            </div>
          </div>
        )}

        {/* Message */}
        {msg && (
          <div style={{
            background: msg.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${msg.type === 'success' ? '#6EE7B7' : '#FECACA'}`,
            borderRadius: radius.md, padding: '12px 16px', marginBottom: '16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <p style={{ margin: 0, fontSize: font.base, color: msg.type === 'success' ? '#065F46' : '#991B1B', fontWeight: '500' }}>{msg.text}</p>
            <X size={16} onClick={() => setMsg(null)} style={{ cursor: 'pointer', color: colors.textMuted }} />
          </div>
        )}

        {/* New Claim Form */}
        {showForm && (
          <div style={{ ...styles.card, marginBottom: '20px', border: `1px solid ${colors.primaryLight}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: font.lg, fontWeight: '700', color: colors.textPrimary }}>New Claim</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <Field label="Date">
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  style={{ ...styles.input }} />
              </Field>
              <Field label="Category">
                <select value={form.claim_type_id} onChange={e => setForm({ ...form, claim_type_id: e.target.value })}
                  style={{ ...styles.input }}>
                  {CLAIM_TYPES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Amount (RM)">
                <input type="number" step="0.01" min="0" value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  style={{ ...styles.input }} placeholder="0.00" />
              </Field>
              <Field label="Description" >
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{ ...styles.input, gridColumn: '1 / -1' }} placeholder="Brief description" />
              </Field>
            </div>

            {/* Receipt Upload */}
            <Field label="Receipts (optional)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                {receipts.map((file, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: radius.md, background: '#ECFDF5', border: `1px solid ${colors.primaryLight}` }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <Paperclip size={16} color={colors.primary} />
                      <span style={{ fontSize: font.base, color: colors.primary, fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                    </span>
                    <X size={14} color={colors.textMuted} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => setReceipts(prev => prev.filter((_, idx) => idx !== i))} />
                  </div>
                ))}
                <label
                  htmlFor="claim-receipt-input"
                  style={{
                    display: 'block',
                    border: `2px dashed ${colors.border}`,
                    borderRadius: radius.md, padding: '16px', textAlign: 'center',
                    cursor: 'pointer', background: colors.borderLight,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Upload size={16} color={colors.textMuted} />
                    <span style={{ fontSize: font.base, color: colors.textMuted }}>
                      {receipts.length > 0 ? 'Add more receipts' : 'Upload receipt image(s) or PDF'}
                    </span>
                  </div>
                </label>
              </div>
              <input
                ref={fileRef} id="claim-receipt-input" type="file" accept="image/*,.pdf" multiple
                style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}
                onChange={e => {
                  setReceipts(prev => [...prev, ...Array.from(e.target.files || [])])
                  e.target.value = ''
                }} />
            </Field>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={handleSubmit} disabled={submitting} style={{
                ...styles.primaryButton, opacity: submitting ? 0.6 : 1,
              }}>
                {submitting ? 'Submitting...' : 'Submit Claim'}
              </button>
              <button onClick={() => { setShowForm(false); setMsg(null) }} style={{ ...styles.outlineButton }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Claims List */}
        <div style={{ ...styles.card }}>
          <h3 style={{ ...styles.sectionLabel, marginBottom: '16px' }}>All Claims</h3>
          {loading ? (
            <p style={{ textAlign: 'center', color: colors.textMuted, padding: '32px 0' }}>Loading...</p>
          ) : claims.length === 0 ? (
            <p style={{ textAlign: 'center', color: colors.textMuted, padding: '32px 0', fontSize: font.base }}>
              No claims yet. Click "New Claim" to submit.
            </p>
          ) : (
            <div>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 100px 120px 90px', gap: '8px', padding: '8px 0', borderBottom: `1px solid ${colors.border}`, marginBottom: '4px' }}>
                {['Submitted', 'Description', 'Category', 'Amount', 'Status'].map(h => (
                  <p key={h} style={{ margin: 0, fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</p>
                ))}
              </div>
              {claims.map((c, i) => {
                const s = statusStyle(c.status)
                const receiptUrls: string[] = c.receipt_urls?.length ? c.receipt_urls : (c.receipt_url ? [c.receipt_url] : [])
                return (
                  <div key={c.id} style={{
                    display: 'grid', gridTemplateColumns: '100px 1fr 130px 100px 90px', gap: '8px',
                    padding: '12px 0', borderBottom: i < claims.length - 1 ? `1px solid ${colors.borderLight}` : 'none',
                    alignItems: 'center',
                  }}>
                    <p style={{ margin: 0, fontSize: font.base, color: colors.textSecondary }}>
                      {new Date(c.claim_date || c.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                    </p>
                    <div>
                      <p style={{ margin: 0, fontSize: font.base, color: colors.textPrimary, fontWeight: '500' }}>{c.description}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {receiptUrls.map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noreferrer" style={{ fontSize: font.xs, color: colors.primaryLight, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                            <Paperclip size={11} /> {receiptUrls.length > 1 ? `Receipt ${idx + 1}` : 'Receipt'}
                          </a>
                        ))}
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: font.base, color: colors.textSecondary }}>{c.claim_type?.name || '-'}</p>
                    <p style={{ margin: 0, fontSize: font.base, fontWeight: '700', color: colors.textPrimary }}>RM {(c.amount || 0).toFixed(2)}</p>
                    <span style={{ fontSize: font.xs, fontWeight: '700', padding: '3px 10px', borderRadius: radius.full, background: s.bg, color: s.color, display: 'inline-block' }}>
                      {c.status === 'pending' ? 'Pending' : c.status === 'approved' ? 'Approved' : 'Rejected'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
