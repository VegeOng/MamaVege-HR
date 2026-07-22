'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Trash2, MessageCircle, Plus } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { colors, radius, styles, font } from '@/lib/design'
import { generateWhatsAppLink } from '@/lib/utils'

const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label style={{ display: 'block', fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
    {children}{required && <span style={{ color: colors.danger, marginLeft: '3px' }}>*</span>}
  </label>
)

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ ...styles.card, marginBottom: '16px' }}>
    <h3 style={{ fontSize: font.base, fontWeight: '700', color: colors.textPrimary, margin: '0 0 20px', paddingBottom: '12px', borderBottom: `1px solid ${colors.borderLight}` }}>{title}</h3>
    {children}
  </div>
)

export default function EditEmployeePage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [departments, setDepartments] = useState<any[]>([])
  const [supervisors, setSupervisors] = useState<any[]>([])
  const [balances, setBalances] = useState<any[]>([])
  const [leaveTypes, setLeaveTypes] = useState<Record<string, { name: string; code: string }>>({})
  const [leaveMonth, setLeaveMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [monthlyLeave, setMonthlyLeave] = useState<any[]>([])
  const [loadingLeave, setLoadingLeave] = useState(false)
  const [claimTypes, setClaimTypes] = useState<Record<string, { name: string; code: string }>>({})
  const [claimLimits, setClaimLimits] = useState<Record<string, number>>({})
  const [claimMonth, setClaimMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [monthlyClaims, setMonthlyClaims] = useState<any[]>([])
  const [loadingClaims, setLoadingClaims] = useState(false)
  const [otMonth, setOtMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [monthlyOt, setMonthlyOt] = useState<any[]>([])
  const [loadingOt, setLoadingOt] = useState(false)
  const [specialHolidays, setSpecialHolidays] = useState<any[]>([])
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' })
  const [savingHoliday, setSavingHoliday] = useState(false)
  const [form, setForm] = useState<any>({})
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [id])
  useEffect(() => { loadLeaveTypes() }, [])
  useEffect(() => { if (id) loadMonthlyLeave() }, [id, leaveMonth])
  useEffect(() => { loadClaimTypes() }, [])
  useEffect(() => { if (id) loadClaimLimits() }, [id])
  useEffect(() => { if (id) loadMonthlyClaims() }, [id, claimMonth])
  useEffect(() => { if (id) loadMonthlyOt() }, [id, otMonth])

  async function loadData() {
    const [{ data: profile }, { data: depts }, { data: sups }, { data: bal }, { data: holidays }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('departments').select('*').order('name'),
      supabase.from('profiles').select('id, full_name, employee_id, role').in('role', ['supervisor', 'hr']).eq('is_active', true).order('full_name'),
      supabase.from('leave_entitlements').select('*, leave_type:leave_types(name, code)').eq('employee_id', id).eq('year', new Date().getFullYear()),
      supabase.from('employee_holidays').select('*').eq('employee_id', id).order('date'),
    ])
    if (profile) setForm(profile)
    setDepartments(depts || [])
    setSupervisors((sups || []).filter((s: any) => s.id !== id))
    setBalances(bal || [])
    setSpecialHolidays(holidays || [])
    setLoading(false)
  }

  async function loadLeaveTypes() {
    const { data } = await supabase.from('leave_types').select('id, name, code')
    const map: Record<string, { name: string; code: string }> = {}
    for (const t of data || []) map[t.id] = { name: t.name, code: t.code }
    setLeaveTypes(map)
  }

  async function loadMonthlyLeave() {
    setLoadingLeave(true)
    const [y, m] = leaveMonth.split('-').map(Number)
    const start = `${leaveMonth}-01`
    const end = `${leaveMonth}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
    const { data } = await supabase.from('leave_requests').select('*')
      .eq('employee_id', id).gte('start_date', start).lte('start_date', end).order('start_date')
    setMonthlyLeave(data || [])
    setLoadingLeave(false)
  }

  async function loadClaimTypes() {
    const { data } = await supabase.from('claim_types').select('id, name, code')
    const map: Record<string, { name: string; code: string }> = {}
    for (const t of data || []) map[t.id] = { name: t.name, code: t.code }
    setClaimTypes(map)
  }

  async function loadClaimLimits() {
    const { data } = await supabase.from('claim_limits').select('claim_type_id, monthly_limit').eq('employee_id', id)
    const map: Record<string, number> = {}
    for (const l of data || []) map[l.claim_type_id] = l.monthly_limit || 0
    setClaimLimits(map)
  }

  async function loadMonthlyClaims() {
    setLoadingClaims(true)
    const [year, month] = claimMonth.split('-').map(Number)
    const { data } = await supabase.from('claims').select('*')
      .eq('employee_id', id).eq('year', year).eq('month', month).order('claim_date')
    setMonthlyClaims(data || [])
    setLoadingClaims(false)
  }

  async function loadMonthlyOt() {
    setLoadingOt(true)
    const [y, m] = otMonth.split('-').map(Number)
    const start = `${otMonth}-01`
    const end = `${otMonth}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
    const { data } = await supabase.from('ot_requests').select('*')
      .eq('employee_id', id).gte('date', start).lte('date', end).order('date')
    setMonthlyOt(data || [])
    setLoadingOt(false)
  }

  function notifyLeaveBalance() {
    const phone = form.whatsapp_number
    if (!phone) return
    const year = new Date().getFullYear()
    const lines = balances
      .filter(b => b.leave_type?.code !== 'PH')
      .map(b => {
        const remaining = ((b.entitled_hours || 0) + (b.carried_forward_hours || 0) - (b.used_hours || 0)) / 8
        return `${b.leave_type?.name}: ${remaining % 1 === 0 ? remaining.toFixed(0) : remaining.toFixed(1)} day(s)`
      })
    const msgText = `Hi ${form.full_name}, here is your leave balance for ${year}:\n${lines.join('\n')}\n\nCheck the MamaVege HR system for more details.`
    window.open(generateWhatsAppLink(phone, msgText), '_blank')
  }

  const f = (key: string, val: string) => setForm((prev: any) => ({ ...prev, [key]: val }))

  async function handleSave() {
    setSaving(true); setMsg(null)

    let employeeId = form.employee_id
    let isActive = form.is_active
    // Activating a pending account — assign a real employee ID and activate it
    if (form.role !== 'pending' && (employeeId?.startsWith('PENDING-') || !isActive)) {
      if (employeeId?.startsWith('PENDING-')) {
        const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).not('employee_id', 'like', 'PENDING-%')
        employeeId = `MV${String((count || 0) + 1).padStart(4, '0')}`
      }
      isActive = true
    }

    const res = await fetch('/api/admin/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        updates: {
          full_name: form.full_name,
          employee_id: employeeId,
          phone: form.phone,
          whatsapp_number: form.whatsapp_number,
          ic_number: form.ic_number,
          ic_type: form.ic_type,
          department: form.department,
          position: form.position,
          role: form.role,
          join_date: form.join_date,
          shift: form.shift,
          clock_in_method: form.clock_in_method,
          supervisor_id: form.supervisor_id || null,
          basic_salary: parseFloat(form.basic_salary) || 0,
          epf_number: form.epf_number,
          socso_number: form.socso_number,
          tax_number: form.tax_number,
          bank_name: form.bank_name,
          bank_account: form.bank_account,
          is_active: isActive,
        },
      }),
    })
    const json = await res.json()
    if (!res.ok) setMsg({ type: 'error', text: json.error || 'Update failed' })
    else { setMsg({ type: 'success', text: 'Employee profile updated!' }); loadData() }
    setSaving(false)
    setTimeout(() => setMsg(null), 3000)
  }

  async function handleAddHoliday() {
    if (!newHoliday.date || !newHoliday.name) return
    setSavingHoliday(true)
    await supabase.from('employee_holidays').insert({ employee_id: id, date: newHoliday.date, name: newHoliday.name })
    setNewHoliday({ date: '', name: '' })
    const { data } = await supabase.from('employee_holidays').select('*').eq('employee_id', id).order('date')
    setSpecialHolidays(data || [])
    setSavingHoliday(false)
  }

  async function handleDeleteHoliday(holidayId: string) {
    await supabase.from('employee_holidays').delete().eq('id', holidayId)
    setSpecialHolidays(specialHolidays.filter(h => h.id !== holidayId))
  }

  async function handleDeactivate() {
    if (!confirm(`Deactivate ${form.full_name}? They will lose access.`)) return
    await fetch('/api/admin/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates: { is_active: false } }),
    })
    router.push('/hr/employees')
  }

  if (loading) return <div style={{ padding: '32px', color: colors.textMuted }}>Loading...</div>

  const inputStyle = { ...styles.input, width: '100%' }

  return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/hr/employees" style={{ width: '36px', height: '36px', borderRadius: radius.md, border: `1.5px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, textDecoration: 'none', background: 'white' }}>
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 style={{ ...styles.pageTitle }}>{form.full_name}</h1>
              <p style={{ ...styles.pageSubtitle }}>{form.employee_id} · {form.email}</p>
            </div>
          </div>
          <button onClick={handleDeactivate} style={{ ...styles.outlineButton, color: colors.danger, borderColor: colors.danger, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Trash2 size={14} />Deactivate
          </button>
        </div>

        {msg && (
          <div style={{ background: msg.type === 'success' ? colors.successBg : colors.dangerBg, border: `1px solid ${msg.type === 'success' ? '#6EE7B7' : '#FECACA'}`, borderRadius: radius.md, padding: '12px 16px', marginBottom: '16px', fontSize: font.base, color: msg.type === 'success' ? colors.successText : colors.dangerText, fontWeight: '500' }}>
            {msg.text}
          </div>
        )}

        {/* Basic Info */}
        <Section title="Basic Information 基本资料">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div><Label required>Full Name</Label><input value={form.full_name || ''} onChange={e => f('full_name', e.target.value)} style={inputStyle} /></div>
            <div><Label>Email (cannot change)</Label><input value={form.email || ''} disabled style={{ ...inputStyle, background: colors.borderLight, color: colors.textMuted }} /></div>
            {form.employee_id?.startsWith('PENDING-') ? (
              <div><Label>Employee ID</Label><p style={{ margin: '8px 0 0', fontSize: font.xs, color: colors.textMuted }}>Will be auto-assigned (e.g. MV0012) once a role is set</p></div>
            ) : (
              <div><Label>Employee ID</Label><input value={form.employee_id || ''} onChange={e => f('employee_id', e.target.value)} style={inputStyle} /></div>
            )}
            <div><Label>Phone</Label><input value={form.phone || ''} onChange={e => f('phone', e.target.value)} placeholder="+60 12-345 6789" style={inputStyle} /></div>
            <div><Label>WhatsApp</Label><input value={form.whatsapp_number || ''} onChange={e => f('whatsapp_number', e.target.value)} placeholder="+60 12-345 6789" style={inputStyle} /></div>
            <div>
              <Label>IC Type</Label>
              <select value={form.ic_type || 'nric'} onChange={e => f('ic_type', e.target.value)} style={inputStyle}>
                <option value="nric">MyKad (NRIC)</option>
                <option value="work_permit">Work Permit</option>
                <option value="passport">Passport</option>
              </select>
            </div>
            <div><Label>IC / Permit Number</Label><input value={form.ic_number || ''} onChange={e => f('ic_number', e.target.value)} style={inputStyle} /></div>
          </div>
        </Section>

        {/* Leave Balance */}
        {balances.length > 0 && (
          <div style={{ ...styles.card, marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '12px', borderBottom: `1px solid ${colors.borderLight}` }}>
              <h3 style={{ fontSize: font.base, fontWeight: '700', color: colors.textPrimary, margin: 0 }}>Leave Balance 假期余额 ({new Date().getFullYear()})</h3>
              <button onClick={notifyLeaveBalance} disabled={!form.whatsapp_number} title={form.whatsapp_number ? 'Notify via WhatsApp' : 'No WhatsApp number on file'}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                  background: form.whatsapp_number ? colors.successBg : colors.borderLight,
                  color: form.whatsapp_number ? colors.successText : colors.textMuted,
                  border: 'none', borderRadius: radius.sm, fontSize: '12px', fontWeight: '700',
                  cursor: form.whatsapp_number ? 'pointer' : 'not-allowed',
                }}>
                <MessageCircle size={13} />Notify Balance
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
              {balances.filter(b => b.leave_type?.code !== 'PH').map(b => {
                const remaining = ((b.entitled_hours || 0) + (b.carried_forward_hours || 0) - (b.used_hours || 0)) / 8
                return (
                  <div key={b.id}>
                    <p style={{ margin: '0 0 4px', fontSize: font.xs, color: colors.textMuted, fontWeight: '600' }}>{b.leave_type?.name}</p>
                    <p style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: colors.textPrimary }}>{remaining % 1 === 0 ? remaining.toFixed(0) : remaining.toFixed(1)} <span style={{ fontSize: font.xs, fontWeight: '600', color: colors.textMuted }}>days</span></p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Leave Summary */}
        <div style={{ ...styles.card, marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '12px', borderBottom: `1px solid ${colors.borderLight}`, flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: font.base, fontWeight: '700', color: colors.textPrimary, margin: 0 }}>Leave Summary 假期记录</h3>
            <input type="month" value={leaveMonth} onChange={e => setLeaveMonth(e.target.value)} style={{ ...styles.input, padding: '6px 10px', fontSize: font.sm, width: 'auto' }} />
          </div>

          {loadingLeave ? (
            <p style={{ margin: 0, color: colors.textMuted, fontSize: font.sm }}>Loading...</p>
          ) : monthlyLeave.length === 0 ? (
            <p style={{ margin: 0, color: colors.textMuted, fontSize: font.sm }}>No leave requests in this month.</p>
          ) : (() => {
            const approvedByType: Record<string, number> = {}
            monthlyLeave.filter(r => r.status === 'approved').forEach(r => {
              const code = leaveTypes[r.leave_type_id]?.code || 'Other'
              approvedByType[code] = (approvedByType[code] || 0) + (r.total_hours || 0) / 8
            })
            const totalApprovedDays = Object.values(approvedByType).reduce((a, b) => a + b, 0)
            return (
              <>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <div style={{ padding: '8px 14px', background: colors.successBg, borderRadius: radius.sm }}>
                    <span style={{ fontSize: font.xs, color: colors.successText, fontWeight: '700' }}>
                      Approved Total: {totalApprovedDays % 1 === 0 ? totalApprovedDays.toFixed(0) : totalApprovedDays.toFixed(1)} day(s)
                    </span>
                  </div>
                  {Object.entries(approvedByType).map(([code, days]) => (
                    <div key={code} style={{ padding: '8px 14px', background: colors.infoBg, borderRadius: radius.sm }}>
                      <span style={{ fontSize: font.xs, color: colors.infoText, fontWeight: '700' }}>
                        {code}: {days % 1 === 0 ? days.toFixed(0) : days.toFixed(1)} day(s)
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {monthlyLeave.map(r => {
                    const type = leaveTypes[r.leave_type_id]
                    const days = (r.total_hours || 0) / 8
                    return (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: colors.borderLight, borderRadius: radius.sm, flexWrap: 'wrap', gap: '6px' }}>
                        <div>
                          <span style={{ fontSize: font.sm, fontWeight: '600', color: colors.textPrimary }}>{type?.name || 'Leave'}</span>
                          <span style={{ fontSize: font.xs, color: colors.textMuted, marginLeft: '8px' }}>
                            {new Date(r.start_date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                            {r.end_date !== r.start_date ? ` – ${new Date(r.end_date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}` : ''}
                            {' · '}{days % 1 === 0 ? days.toFixed(0) : days.toFixed(1)} day(s)
                          </span>
                        </div>
                        <span style={{
                          fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: radius.full, textTransform: 'capitalize',
                          background: r.status === 'approved' ? colors.successBg : r.status === 'rejected' ? colors.dangerBg : colors.warningBg,
                          color: r.status === 'approved' ? colors.successText : r.status === 'rejected' ? colors.dangerText : colors.warningText,
                        }}>{r.status}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>

        {/* Claims Summary */}
        <div style={{ ...styles.card, marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '12px', borderBottom: `1px solid ${colors.borderLight}`, flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: font.base, fontWeight: '700', color: colors.textPrimary, margin: 0 }}>Claims Summary 报销记录</h3>
            <input type="month" value={claimMonth} onChange={e => setClaimMonth(e.target.value)} style={{ ...styles.input, padding: '6px 10px', fontSize: font.sm, width: 'auto' }} />
          </div>

          {loadingClaims ? (
            <p style={{ margin: 0, color: colors.textMuted, fontSize: font.sm }}>Loading...</p>
          ) : monthlyClaims.length === 0 ? (
            <p style={{ margin: 0, color: colors.textMuted, fontSize: font.sm }}>No claims in this month.</p>
          ) : (() => {
            const approvedByType: Record<string, number> = {}
            monthlyClaims.filter(c => c.status === 'approved').forEach(c => {
              const code = claimTypes[c.claim_type_id]?.code || 'OTHERS'
              approvedByType[code] = (approvedByType[code] || 0) + parseFloat(c.amount || 0)
            })
            const totalApprovedAmount = Object.values(approvedByType).reduce((a, b) => a + b, 0)
            const limitByCode: Record<string, number> = {}
            Object.entries(claimTypes).forEach(([typeId, t]) => {
              if (claimLimits[typeId]) limitByCode[t.code] = claimLimits[typeId]
            })
            return (
              <>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <div style={{ padding: '8px 14px', background: colors.successBg, borderRadius: radius.sm }}>
                    <span style={{ fontSize: font.xs, color: colors.successText, fontWeight: '700' }}>
                      Approved Total: RM {totalApprovedAmount.toFixed(2)}
                    </span>
                  </div>
                  {Object.entries(approvedByType).map(([code, amount]) => (
                    <div key={code} style={{ padding: '8px 14px', background: colors.infoBg, borderRadius: radius.sm }}>
                      <span style={{ fontSize: font.xs, color: colors.infoText, fontWeight: '700' }}>
                        {code}: RM {amount.toFixed(2)}{limitByCode[code] ? ` / ${limitByCode[code].toFixed(2)}` : ''}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {monthlyClaims.map(c => {
                    const type = claimTypes[c.claim_type_id]
                    return (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: colors.borderLight, borderRadius: radius.sm, flexWrap: 'wrap', gap: '6px' }}>
                        <div>
                          <span style={{ fontSize: font.sm, fontWeight: '600', color: colors.textPrimary }}>{type?.name || 'Claim'}</span>
                          <span style={{ fontSize: font.xs, color: colors.textMuted, marginLeft: '8px' }}>
                            {new Date((c.claim_date || c.created_at) + (c.claim_date ? 'T00:00:00' : '')).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                            {c.description ? ` · ${c.description}` : ''}
                            {' · '}RM {parseFloat(c.amount || 0).toFixed(2)}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: radius.full, textTransform: 'capitalize',
                          background: c.status === 'approved' ? colors.successBg : c.status === 'rejected' ? colors.dangerBg : colors.warningBg,
                          color: c.status === 'approved' ? colors.successText : c.status === 'rejected' ? colors.dangerText : colors.warningText,
                        }}>{c.status}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>

        {/* OT Summary */}
        <div style={{ ...styles.card, marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '12px', borderBottom: `1px solid ${colors.borderLight}`, flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: font.base, fontWeight: '700', color: colors.textPrimary, margin: 0 }}>OT Summary 加班记录</h3>
            <input type="month" value={otMonth} onChange={e => setOtMonth(e.target.value)} style={{ ...styles.input, padding: '6px 10px', fontSize: font.sm, width: 'auto' }} />
          </div>

          {loadingOt ? (
            <p style={{ margin: 0, color: colors.textMuted, fontSize: font.sm }}>Loading...</p>
          ) : monthlyOt.length === 0 ? (
            <p style={{ margin: 0, color: colors.textMuted, fontSize: font.sm }}>No OT requests in this month.</p>
          ) : (() => {
            const approved = monthlyOt.filter(r => r.status === 'approved')
            const totalApprovedHours = approved.reduce((s, r) => s + (r.total_hours || 0), 0)
            const totalApprovedPay = approved.reduce((s, r) => s + parseFloat(r.ot_pay || 0), 0)
            return (
              <>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <div style={{ padding: '8px 14px', background: colors.successBg, borderRadius: radius.sm }}>
                    <span style={{ fontSize: font.xs, color: colors.successText, fontWeight: '700' }}>
                      Approved Total: {totalApprovedHours.toFixed(1)}h
                    </span>
                  </div>
                  {totalApprovedPay > 0 && (
                    <div style={{ padding: '8px 14px', background: colors.infoBg, borderRadius: radius.sm }}>
                      <span style={{ fontSize: font.xs, color: colors.infoText, fontWeight: '700' }}>
                        OT Pay: RM {totalApprovedPay.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {monthlyOt.map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: colors.borderLight, borderRadius: radius.sm, flexWrap: 'wrap', gap: '6px' }}>
                      <div>
                        <span style={{ fontSize: font.sm, fontWeight: '600', color: colors.textPrimary }}>
                          {new Date(r.date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                        </span>
                        <span style={{ fontSize: font.xs, color: colors.textMuted, marginLeft: '8px' }}>
                          {r.start_time?.slice(0, 5)} – {r.end_time?.slice(0, 5)}
                          {' · '}{r.total_hours?.toFixed(1)}h
                          {r.ot_pay ? ` · RM ${parseFloat(r.ot_pay).toFixed(2)}` : ''}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: radius.full, textTransform: 'capitalize',
                        background: r.status === 'approved' ? colors.successBg : r.status === 'rejected' ? colors.dangerBg : colors.warningBg,
                        color: r.status === 'approved' ? colors.successText : r.status === 'rejected' ? colors.dangerText : colors.warningText,
                      }}>{r.status}</span>
                    </div>
                  ))}
                </div>
              </>
            )
          })()}
        </div>

        {/* Employment */}
        <Section title="Employment Details 工作资料">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <Label>Department</Label>
              <select value={form.department || ''} onChange={e => f('department', e.target.value)} style={inputStyle}>
                <option value="">Select department...</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div><Label>Position</Label><input value={form.position || ''} onChange={e => f('position', e.target.value)} style={inputStyle} /></div>
            <div>
              <Label>Role</Label>
              <select value={form.role || 'employee'} onChange={e => f('role', e.target.value)} style={inputStyle}>
                {form.role === 'pending' && <option value="pending">Pending 待审核</option>}
                <option value="employee">Employee</option>
                <option value="supervisor">Supervisor</option>
                <option value="hr">HR</option>
                <option value="director">Director 老板</option>
              </select>
            </div>
            <div><Label>Join Date</Label><input type="date" value={form.join_date || ''} onChange={e => f('join_date', e.target.value)} style={inputStyle} /></div>
            <div>
              <Label>Shift</Label>
              <select value={form.shift || 'A'} onChange={e => f('shift', e.target.value)} style={inputStyle}>
                <option value="A">Shift A (8am – 5pm)</option>
                <option value="B">Shift B (8am – 6pm)</option>
                <option value="C">Shift C (Flexible)</option>
              </select>
            </div>
            <div>
              <Label>Clock In Method</Label>
              <select value={form.clock_in_method || 'wifi'} onChange={e => f('clock_in_method', e.target.value)} style={inputStyle}>
                <option value="wifi">WiFi (Office Staff)</option>
                <option value="gps">GPS (Field Staff)</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <Label>Reports To 直属主管</Label>
              <select value={form.supervisor_id || ''} onChange={e => f('supervisor_id', e.target.value)} style={inputStyle}>
                <option value="">None</option>
                {supervisors.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.employee_id})</option>)}
              </select>
            </div>
          </div>
        </Section>

        {/* Salary */}
        <Section title="Salary & Statutory 薪资法定">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div><Label>Basic Salary (RM)</Label><input type="number" value={form.basic_salary || ''} onChange={e => f('basic_salary', e.target.value)} placeholder="0.00" style={inputStyle} /></div>
            <div><Label>EPF Number</Label><input value={form.epf_number || ''} onChange={e => f('epf_number', e.target.value)} style={inputStyle} /></div>
            <div><Label>SOCSO Number</Label><input value={form.socso_number || ''} onChange={e => f('socso_number', e.target.value)} style={inputStyle} /></div>
            <div><Label>Tax (PCB) Number</Label><input value={form.tax_number || ''} onChange={e => f('tax_number', e.target.value)} style={inputStyle} /></div>
            <div><Label>Bank Name</Label><input value={form.bank_name || ''} onChange={e => f('bank_name', e.target.value)} placeholder="e.g. Maybank" style={inputStyle} /></div>
            <div><Label>Bank Account No.</Label><input value={form.bank_account || ''} onChange={e => f('bank_account', e.target.value)} style={inputStyle} /></div>
          </div>
        </Section>

        {/* Special Holidays */}
        <Section title="Special Holidays 特别假期">
          <p style={{ margin: '-8px 0 14px', fontSize: font.xs, color: colors.textMuted }}>
            Extra state-specific public holidays for this employee. These dates won't be deducted from their leave balance.
          </p>
          {specialHolidays.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {specialHolidays.map(h => (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: colors.borderLight, borderRadius: radius.sm }}>
                  <span style={{ fontSize: font.sm, color: colors.textPrimary, fontWeight: '600' }}>
                    {new Date(h.date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })} — {h.name}
                  </span>
                  <button onClick={() => handleDeleteHoliday(h.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.danger, display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {specialHolidays.length < 3 && (
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: '10px', alignItems: 'end' }}>
              <div>
                <Label>Date</Label>
                <input type="date" value={newHoliday.date} onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <Label>Holiday Name</Label>
                <input value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} placeholder="e.g. Sarawak Day" style={inputStyle} />
              </div>
              <button onClick={handleAddHoliday} disabled={savingHoliday || !newHoliday.date || !newHoliday.name}
                style={{ ...styles.outlineButton, padding: '10px', display: 'flex', alignItems: 'center', gap: '6px', opacity: (savingHoliday || !newHoliday.date || !newHoliday.name) ? 0.5 : 1 }}>
                <Plus size={14} />Add
              </button>
            </div>
          )}
        </Section>

        {/* Save */}
        <button onClick={handleSave} disabled={saving}
          style={{ ...styles.primaryButton, width: '100%', justifyContent: 'center', fontSize: font.base, padding: '14px', opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Save size={16} />{saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
