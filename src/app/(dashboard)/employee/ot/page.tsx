'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Timer, CheckCircle2, XCircle, Clock as ClockIcon } from 'lucide-react'
import { formatDate, formatCurrency, generateWhatsAppLink } from '@/lib/utils'
import { colors, radius, shadow, styles, font } from '@/lib/design'

function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  )
}

export default function OTPage() {
  const [profile, setProfile] = useState<any>(null)
  const [otRequests, setOtRequests] = useState<any[]>([])
  const [supervisors, setSupervisors] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], start_time: '', end_time: '', reason: '', supervisor_id: '' })
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setPageLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)

    const { data: ot } = await supabase.from('ot_requests').select('*, supervisor:profiles!ot_requests_supervisor_id_fkey(full_name)').eq('employee_id', user.id).order('created_at', { ascending: false })
    setOtRequests(ot || [])

    const { data: sup } = await supabase.from('profiles').select('id, full_name').eq('role', 'supervisor').eq('is_active', true)
    setSupervisors(sup || [])
    setPageLoading(false)
  }

  function calcOTHours() {
    if (!form.start_time || !form.end_time) return 0
    const [sh, sm] = form.start_time.split(':').map(Number)
    const [eh, em] = form.end_time.split(':').map(Number)
    return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
  }

  function hourlyRate() {
    return (profile?.basic_salary || 0) / 26 / 8
  }

  async function handleSubmit() {
    if (!form.date || !form.start_time || !form.end_time || !form.reason) {
      setMsg({ type: 'error', text: 'Please fill in all required fields.' }); return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const hours = calcOTHours()
    const rate = hourlyRate()
    const otPay = hours * rate * 1.5

    const { error } = await supabase.from('ot_requests').insert({
      employee_id: user.id,
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      total_hours: hours,
      reason: form.reason,
      supervisor_id: form.supervisor_id || null,
      hourly_rate: rate,
      ot_rate: 1.5,
      ot_pay: otPay,
      status: 'pending',
    })

    if (error) {
      setMsg({ type: 'error', text: 'Failed to submit. Please try again.' })
    } else {
      const sup = supervisors.find(s => s.id === form.supervisor_id)
      if (sup) {
        const text = `Hi, ${profile?.full_name} has submitted an OT request for ${formatDate(form.date)} (${form.start_time} - ${form.end_time}, ${hours.toFixed(1)}hrs). Please review in MamaVege HR system.`
        window.open(generateWhatsAppLink('60', text), '_blank')
      }
      setMsg({ type: 'success', text: 'OT request submitted!' })
      setForm({ date: new Date().toISOString().split('T')[0], start_time: '', end_time: '', reason: '', supervisor_id: '' })
      setShowForm(false)
      loadData()
    }
    setLoading(false)
  }

  const statusStyle = (s: string) => ({
    approved: { bg: colors.successBg, color: colors.successText },
    rejected: { bg: colors.dangerBg, color: colors.dangerText },
    pending: { bg: colors.warningBg, color: colors.warningText },
  }[s] || { bg: colors.borderLight, color: colors.textMuted })

  const pendingCount = otRequests.filter(r => r.status === 'pending').length
  const approvedHours = otRequests.filter(r => r.status === 'approved').reduce((s, r) => s + (r.total_hours || 0), 0)
  const approvedPay = otRequests.filter(r => r.status === 'approved').reduce((s, r) => s + (r.ot_pay || 0), 0)

  return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ ...styles.pageInner }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ ...styles.pageTitle }}>Overtime 加班申请</h1>
            <p style={{ ...styles.pageSubtitle }}>Submit and track your overtime requests</p>
          </div>
          <button onClick={() => { setShowForm(!showForm); setMsg(null) }} style={{
            ...styles.primaryButton,
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <Plus size={16} />
            Apply OT
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {[
            { label: 'Pending', value: `${pendingCount}`, sub: 'awaiting approval' },
            { label: 'Approved Hours', value: `${approvedHours.toFixed(1)}h`, sub: `${otRequests.filter(r => r.status === 'approved').length} requests` },
            { label: 'Approved Pay', value: formatCurrency(approvedPay), sub: '1.5x hourly rate' },
          ].map(s => (
            <div key={s.label} style={{ ...styles.card }}>
              <p style={{ margin: '0 0 6px', fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
              <p style={{ margin: '0 0 2px', fontSize: font.xl, fontWeight: '800', color: colors.textPrimary }}>{s.value}</p>
              <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted }}>{s.sub}</p>
            </div>
          ))}
        </div>

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

        {/* Apply OT Form */}
        {showForm && (
          <div style={{ ...styles.card, marginBottom: '20px', border: `1px solid ${colors.primaryLight}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: font.lg, fontWeight: '700', color: colors.textPrimary }}>OT Request 加班申请</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Field label="Date 日期">
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ ...styles.input }} />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Start Time">
                  <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} style={{ ...styles.input }} />
                </Field>
                <Field label="End Time">
                  <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} style={{ ...styles.input }} />
                </Field>
              </div>

              {calcOTHours() > 0 && (
                <div style={{ background: colors.warningBg, borderRadius: radius.md, padding: '10px 14px', fontSize: font.sm, color: colors.warningText, fontWeight: '600' }}>
                  OT Hours: {calcOTHours().toFixed(1)}h · Estimated Pay: {formatCurrency(calcOTHours() * hourlyRate() * 1.5)}
                </div>
              )}

              <Field label="Supervisor 主管">
                <select value={form.supervisor_id} onChange={e => setForm({ ...form, supervisor_id: e.target.value })} style={{ ...styles.input }}>
                  <option value="">Select supervisor...</option>
                  {supervisors.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </Field>

              <Field label="Reason 原因">
                <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={3}
                  style={{ ...styles.input, resize: 'none' as const }} placeholder="Reason for OT..." />
              </Field>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleSubmit} disabled={loading || !form.date || !form.start_time || !form.end_time || !form.reason} style={{
                  ...styles.primaryButton, opacity: (loading || !form.date || !form.start_time || !form.end_time || !form.reason) ? 0.6 : 1,
                }}>
                  {loading ? 'Submitting...' : 'Submit & Notify Supervisor'}
                </button>
                <button onClick={() => { setShowForm(false); setMsg(null) }} style={{ ...styles.outlineButton }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* OT History */}
        <div style={{ ...styles.card }}>
          <h3 style={{ ...styles.sectionLabel, marginBottom: '16px' }}>OT History 加班记录</h3>
          {pageLoading ? (
            <p style={{ textAlign: 'center', color: colors.textMuted, padding: '32px 0' }}>Loading...</p>
          ) : otRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Timer size={28} color={colors.textMuted} style={{ margin: '0 auto 10px', display: 'block' }} />
              <p style={{ margin: 0, color: colors.textMuted, fontSize: font.base }}>No OT requests yet</p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 90px 100px 100px', gap: '8px', padding: '8px 0', borderBottom: `1px solid ${colors.border}`, marginBottom: '4px' }}>
                {['Reason / Supervisor', 'Date / Time', 'Hours', 'OT Pay', 'Status'].map(h => (
                  <p key={h} style={{ margin: 0, fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</p>
                ))}
              </div>
              {otRequests.map((ot, i) => {
                const s = statusStyle(ot.status)
                return (
                  <div key={ot.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr 130px 90px 100px 100px', gap: '8px',
                    padding: '12px 0', borderBottom: i < otRequests.length - 1 ? `1px solid ${colors.borderLight}` : 'none',
                    alignItems: 'center',
                  }}>
                    <div>
                      <p style={{ margin: 0, fontSize: font.base, color: colors.textPrimary, fontWeight: '500' }}>{ot.reason}</p>
                      {ot.supervisor?.full_name && <p style={{ margin: '2px 0 0', fontSize: font.xs, color: colors.textMuted }}>Supervisor: {ot.supervisor.full_name}</p>}
                      {ot.status === 'rejected' && ot.supervisor_notes && (
                        <p style={{ margin: '4px 0 0', fontSize: font.xs, color: colors.dangerText }}>Reason: {ot.supervisor_notes}</p>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: font.sm, color: colors.textSecondary }}>
                      {formatDate(ot.date)}<br />
                      <span style={{ fontSize: font.xs, color: colors.textMuted }}>{ot.start_time?.slice(0,5)} - {ot.end_time?.slice(0,5)}</span>
                    </p>
                    <p style={{ margin: 0, fontSize: font.sm, fontWeight: '700', color: colors.textPrimary }}>{ot.total_hours?.toFixed(1)}h</p>
                    <p style={{ margin: 0, fontSize: font.sm, fontWeight: '700', color: colors.successText }}>{ot.ot_pay ? formatCurrency(ot.ot_pay) : '-'}</p>
                    <span style={{ fontSize: font.xs, fontWeight: '700', padding: '3px 10px', borderRadius: radius.full, background: s.bg, color: s.color, textTransform: 'capitalize', display: 'inline-block', width: 'fit-content' }}>
                      {ot.status}
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
