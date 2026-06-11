'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Upload, X, Paperclip, CalendarDays } from 'lucide-react'
import { formatDate, generateWhatsAppLink } from '@/lib/utils'
import { colors, radius, shadow, styles, font } from '@/lib/design'

function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  )
}

const TYPE_COLORS: Record<string, string> = {
  AL: colors.gradients.green,
  ML: colors.gradients.pink,
  EL: colors.gradients.purple,
  UL: colors.gradients.orange,
  PH: colors.gradients.blue,
}

export default function LeavePage() {
  const [profile, setProfile] = useState<any>(null)
  const [leaveTypes, setLeaveTypes] = useState<any[]>([])
  const [balances, setBalances] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [hrSettings, setHrSettings] = useState<any>({})
  const [holidays, setHolidays] = useState<string[]>([])
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [form, setForm] = useState({
    leave_type_id: '',
    duration_type: 'full_day',
    half_day_period: 'morning',
    start_date: '',
    end_date: '',
    start_time: '09:00',
    end_time: '11:00',
    reason: '',
    mc_amount: '',
    mc_file: null as File | null,
  })
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setPageLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, typesRes, balRes, reqRes, settingsRes, holidaysRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('leave_types').select('*'),
      supabase.from('leave_entitlements').select('*, leave_type:leave_types(*)').eq('employee_id', user.id).eq('year', new Date().getFullYear()),
      supabase.from('leave_requests').select('*, leave_type:leave_types(name, code)').eq('employee_id', user.id).order('applied_at', { ascending: false }).limit(20),
      supabase.from('company_settings').select('*'),
      supabase.from('public_holidays').select('date'),
    ])

    setProfile(profileRes.data)
    setLeaveTypes(typesRes.data || [])
    setBalances(balRes.data || [])
    setRequests(reqRes.data || [])
    setHolidays((holidaysRes.data || []).map((h: any) => h.date))

    const settings: any = {}
    settingsRes.data?.forEach((s: any) => { settings[s.key] = s.value })
    setHrSettings(settings)
    setPageLoading(false)
  }

  // Counts only Mon-Fri, excluding public holidays (Sat/Sun and gazetted holidays are not deducted from leave)
  function countWorkingDays(start: string, end: string) {
    let count = 0
    const d = new Date(start + 'T00:00:00')
    const endD = new Date(end + 'T00:00:00')
    while (d <= endD) {
      const day = d.getDay()
      const dateStr = d.toISOString().split('T')[0]
      if (day !== 0 && day !== 6 && !holidays.includes(dateStr)) count++
      d.setDate(d.getDate() + 1)
    }
    return count
  }

  function calcHours() {
    if (form.duration_type === '2hours') return 2
    if (form.duration_type === 'half_day') return 4
    if (form.duration_type === 'full_day') return 8
    if (form.duration_type === 'multi_day' && form.start_date && form.end_date) {
      return countWorkingDays(form.start_date, form.end_date) * 8
    }
    return 8
  }

  async function handleSubmit() {
    if (!form.leave_type_id || !form.start_date) {
      setMsg({ type: 'error', text: 'Please select a leave type and date.' }); return
    }
    if (form.duration_type === 'multi_day' && (!form.end_date || calcHours() === 0)) {
      setMsg({ type: 'error', text: 'Selected range has no working days (weekends/public holidays are not counted).' }); return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const hours = calcHours()
    let mcUrl = null

    if (form.mc_file) {
      const fileName = `${user.id}/${Date.now()}_${form.mc_file.name}`
      const { data: uploadData } = await supabase.storage.from('leave-documents').upload(fileName, form.mc_file)
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('leave-documents').getPublicUrl(fileName)
        mcUrl = urlData.publicUrl
      }
    }

    const startDate = form.start_date
    const endDate = form.duration_type === 'multi_day' ? form.end_date : form.start_date

    const { error } = await supabase.from('leave_requests').insert({
      employee_id: user.id,
      leave_type_id: form.leave_type_id,
      start_date: startDate,
      end_date: endDate,
      start_time: form.duration_type === '2hours' ? form.start_time : null,
      end_time: form.duration_type === '2hours' ? form.end_time : null,
      duration_type: form.duration_type,
      half_day_period: form.duration_type === 'half_day' ? form.half_day_period : null,
      total_hours: hours,
      reason: form.reason || null,
      mc_amount: form.mc_amount ? parseFloat(form.mc_amount) : null,
      mc_document_url: mcUrl,
      status: 'pending',
    })

    if (error) {
      setMsg({ type: 'error', text: 'Failed to submit. Please try again.' })
    } else {
      const leaveType = leaveTypes.find(t => t.id === form.leave_type_id)
      const msgText = `Hi, ${profile?.full_name} has applied for ${leaveType?.name} from ${formatDate(startDate)}${endDate !== startDate ? ` to ${formatDate(endDate)}` : ''} (${hours / 8} day(s)). Please review in MamaVege HR system.`
      if (hrSettings.hr_whatsapp) {
        const waLink = generateWhatsAppLink(hrSettings.hr_whatsapp, msgText)
        window.open(waLink, '_blank')
      }

      setMsg({ type: 'success', text: 'Leave request submitted!' })
      setForm({ leave_type_id: '', duration_type: 'full_day', half_day_period: 'morning', start_date: '', end_date: '', start_time: '09:00', end_time: '11:00', reason: '', mc_amount: '', mc_file: null })
      setShowForm(false)
      loadData()
    }
    setLoading(false)
  }

  const selectedType = leaveTypes.find(t => t.id === form.leave_type_id)

  const statusStyle = (s: string) => ({
    approved: { bg: colors.successBg, color: colors.successText },
    rejected: { bg: colors.dangerBg, color: colors.dangerText },
    pending: { bg: colors.warningBg, color: colors.warningText },
  }[s] || { bg: colors.borderLight, color: colors.textMuted })

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const approvedDays = requests.filter(r => r.status === 'approved').reduce((s, r) => s + (r.total_hours || 0) / 8, 0)

  return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ ...styles.pageInner }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ ...styles.pageTitle }}>Leave 假期申请</h1>
            <p style={{ ...styles.pageSubtitle }}>{new Date().getFullYear()} leave balances and history</p>
          </div>
          <button onClick={() => { setShowForm(!showForm); setMsg(null) }} style={{
            ...styles.primaryButton,
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <Plus size={16} />
            Apply Leave
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '20px' }}>
          <div style={{ ...styles.card }}>
            <p style={{ margin: '0 0 6px', fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pending Requests</p>
            <p style={{ margin: 0, fontSize: font.xl, fontWeight: '800', color: colors.textPrimary }}>{pendingCount}</p>
          </div>
          <div style={{ ...styles.card }}>
            <p style={{ margin: '0 0 6px', fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Approved Days ({new Date().getFullYear()})</p>
            <p style={{ margin: 0, fontSize: font.xl, fontWeight: '800', color: colors.textPrimary }}>{approvedDays.toFixed(1)}</p>
          </div>
        </div>

        {/* Balances */}
        {balances.length > 0 && (
          <div style={{ ...styles.card, marginBottom: '20px' }}>
            <p style={{ ...styles.sectionLabel, marginBottom: '14px' }}>Leave Balances — {new Date().getFullYear()}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px' }}>
              {balances.map(bal => {
                const remaining = (bal.entitled_hours || 0) + (bal.carried_forward_hours || 0) - (bal.used_hours || 0)
                const total = (bal.entitled_hours || 0) + (bal.carried_forward_hours || 0)
                const pct = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0
                return (
                  <div key={bal.id}>
                    <p style={{ margin: '0 0 4px', fontSize: font.xs, color: colors.textMuted, fontWeight: '600' }}>{bal.leave_type?.name}</p>
                    <p style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: '800', color: colors.textPrimary, letterSpacing: '-0.5px' }}>{(remaining / 8).toFixed(1)}</p>
                    <div style={{ height: '6px', background: colors.borderLight, borderRadius: radius.full, overflow: 'hidden', marginBottom: '4px' }}>
                      <div style={{ height: '100%', borderRadius: radius.full, width: `${pct}%`, background: 'linear-gradient(90deg, #1B4332, #52B788)' }} />
                    </div>
                    <p style={{ margin: 0, fontSize: '10px', color: colors.textMuted }}>of {(total / 8).toFixed(0)} days left</p>
                  </div>
                )
              })}
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

        {/* Apply Leave Form */}
        {showForm && (
          <div style={{ ...styles.card, marginBottom: '20px', border: `1px solid ${colors.primaryLight}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: font.lg, fontWeight: '700', color: colors.textPrimary }}>Apply Leave 申请假期</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Field label="Leave Type 假期类型">
                <select value={form.leave_type_id} onChange={e => setForm({ ...form, leave_type_id: e.target.value })} style={{ ...styles.input }}>
                  <option value="">Select leave type...</option>
                  {leaveTypes.filter(t => t.code !== 'PH').map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Duration 时长">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[
                    { value: '2hours', label: '2 Hours 2小时' },
                    { value: 'half_day', label: 'Half Day 半天' },
                    { value: 'full_day', label: 'Full Day 整天' },
                    { value: 'multi_day', label: 'Multi-Day 多天' },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => setForm({ ...form, duration_type: opt.value })} style={{
                      padding: '10px 8px', borderRadius: radius.md, fontSize: font.xs, fontWeight: '600', textAlign: 'center',
                      border: `1.5px solid ${form.duration_type === opt.value ? colors.primary : colors.border}`,
                      background: form.duration_type === opt.value ? colors.primary : 'white',
                      color: form.duration_type === opt.value ? 'white' : colors.textSecondary,
                      cursor: 'pointer',
                    }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Field>

              {form.duration_type === 'half_day' && (
                <Field label="Period">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[{ value: 'morning', label: 'Morning 上午' }, { value: 'afternoon', label: 'Afternoon 下午' }].map(opt => (
                      <button key={opt.value} onClick={() => setForm({ ...form, half_day_period: opt.value })} style={{
                        padding: '10px 8px', borderRadius: radius.md, fontSize: font.xs, fontWeight: '600', textAlign: 'center',
                        border: `1.5px solid ${form.half_day_period === opt.value ? colors.primary : colors.border}`,
                        background: form.half_day_period === opt.value ? colors.primary : 'white',
                        color: form.half_day_period === opt.value ? 'white' : colors.textSecondary,
                        cursor: 'pointer',
                      }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>
              )}

              {form.duration_type === '2hours' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field label="Start Time">
                    <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} style={{ ...styles.input }} />
                  </Field>
                  <Field label="End Time">
                    <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} style={{ ...styles.input }} />
                  </Field>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: form.duration_type === 'multi_day' ? '1fr 1fr' : '1fr', gap: '16px' }}>
                <Field label={form.duration_type === 'multi_day' ? 'Start Date' : 'Date'}>
                  <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} style={{ ...styles.input }} />
                </Field>
                {form.duration_type === 'multi_day' && (
                  <Field label="End Date">
                    <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} style={{ ...styles.input }} />
                  </Field>
                )}
              </div>

              {form.start_date && (
                <div style={{ background: colors.successBg, borderRadius: radius.md, padding: '10px 14px', fontSize: font.sm, color: colors.successText, fontWeight: '600' }}>
                  Total: {calcHours() / 8} day(s) = {calcHours()} hours
                </div>
              )}

              {selectedType?.code === 'ML' && (
                <div style={{ border: `1px solid ${colors.warningBg}`, background: colors.warningBg, borderRadius: radius.md, padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ margin: 0, fontSize: font.sm, fontWeight: '700', color: colors.warningText }}>Medical Claim 医疗报销</p>
                  <Field label="Amount (max RM100 per visit)">
                    <input type="number" max="100" step="0.01" value={form.mc_amount} onChange={e => setForm({ ...form, mc_amount: e.target.value })} style={{ ...styles.input }} placeholder="0.00" />
                  </Field>
                  <Field label="MC Receipt (required)">
                    <div style={{
                      border: `2px dashed ${form.mc_file ? colors.primaryLight : colors.border}`,
                      borderRadius: radius.md, padding: '14px', textAlign: 'center', background: form.mc_file ? '#ECFDF5' : 'white', cursor: 'pointer',
                    }} onClick={() => document.getElementById('mc-file-input')?.click()}>
                      {form.mc_file ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <Paperclip size={16} color={colors.primary} />
                          <span style={{ fontSize: font.base, color: colors.primary, fontWeight: '600' }}>{form.mc_file.name}</span>
                          <X size={14} color={colors.textMuted} onClick={e => { e.stopPropagation(); setForm({ ...form, mc_file: null }) }} />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <Upload size={16} color={colors.textMuted} />
                          <span style={{ fontSize: font.base, color: colors.textMuted }}>Upload MC image or PDF</span>
                        </div>
                      )}
                    </div>
                    <input id="mc-file-input" type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                      onChange={e => setForm({ ...form, mc_file: e.target.files?.[0] || null })} />
                  </Field>
                </div>
              )}

              <Field label="Reason 原因">
                <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={3}
                  style={{ ...styles.input, resize: 'none' as const }} placeholder="Optional reason..." />
              </Field>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleSubmit} disabled={loading || !form.leave_type_id || !form.start_date} style={{
                  ...styles.primaryButton, opacity: (loading || !form.leave_type_id || !form.start_date) ? 0.6 : 1,
                }}>
                  {loading ? 'Submitting...' : 'Submit & Notify HR'}
                </button>
                <button onClick={() => { setShowForm(false); setMsg(null) }} style={{ ...styles.outlineButton }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leave History */}
        <div style={{ ...styles.card }}>
          <h3 style={{ ...styles.sectionLabel, marginBottom: '16px' }}>Leave History 假期记录</h3>
          {pageLoading ? (
            <p style={{ textAlign: 'center', color: colors.textMuted, padding: '32px 0' }}>Loading...</p>
          ) : requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <CalendarDays size={28} color={colors.textMuted} style={{ margin: '0 auto 10px', display: 'block' }} />
              <p style={{ margin: 0, color: colors.textMuted, fontSize: font.base }}>No leave requests yet</p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 80px 100px', gap: '8px', padding: '8px 0', borderBottom: `1px solid ${colors.border}`, marginBottom: '4px' }}>
                {['Type / Reason', 'Dates', 'Days', 'Status'].map(h => (
                  <p key={h} style={{ margin: 0, fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</p>
                ))}
              </div>
              {requests.map((req, i) => {
                const s = statusStyle(req.status)
                const days = (req.total_hours || 0) / 8
                return (
                  <div key={req.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr 140px 80px 100px', gap: '8px',
                    padding: '12px 0', borderBottom: i < requests.length - 1 ? `1px solid ${colors.borderLight}` : 'none',
                    alignItems: 'center',
                  }}>
                    <div>
                      <p style={{ margin: 0, fontSize: font.base, fontWeight: '700', color: colors.textPrimary }}>{req.leave_type?.name}</p>
                      {req.reason && <p style={{ margin: '2px 0 0', fontSize: font.xs, color: colors.textMuted }}>{req.reason}</p>}
                      {req.status === 'rejected' && req.reviewer_notes && (
                        <p style={{ margin: '4px 0 0', fontSize: font.xs, color: colors.dangerText }}>Reason: {req.reviewer_notes}</p>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: font.sm, color: colors.textSecondary }}>
                      {formatDate(req.start_date)}{req.end_date !== req.start_date ? ` → ${formatDate(req.end_date)}` : ''}
                    </p>
                    <p style={{ margin: 0, fontSize: font.sm, fontWeight: '700', color: colors.textPrimary }}>{days % 1 === 0 ? days.toFixed(0) : days.toFixed(1)}</p>
                    <span style={{ fontSize: font.xs, fontWeight: '700', padding: '3px 10px', borderRadius: radius.full, background: s.bg, color: s.color, textTransform: 'capitalize', display: 'inline-block', width: 'fit-content' }}>
                      {req.status}
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
