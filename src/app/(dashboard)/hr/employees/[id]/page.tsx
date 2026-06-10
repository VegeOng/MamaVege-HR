'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { colors, radius, styles, font } from '@/lib/design'

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
  const [form, setForm] = useState<any>({})
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    const [{ data: profile }, { data: depts }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('departments').select('*').order('name'),
    ])
    if (profile) setForm(profile)
    setDepartments(depts || [])
    setLoading(false)
  }

  const f = (key: string, val: string) => setForm((prev: any) => ({ ...prev, [key]: val }))

  async function handleSave() {
    setSaving(true); setMsg(null)
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
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
      basic_salary: parseFloat(form.basic_salary) || 0,
      epf_number: form.epf_number,
      socso_number: form.socso_number,
      tax_number: form.tax_number,
      bank_name: form.bank_name,
      bank_account: form.bank_account,
    }).eq('id', id)
    if (error) setMsg({ type: 'error', text: error.message })
    else setMsg({ type: 'success', text: 'Employee profile updated!' })
    setSaving(false)
    setTimeout(() => setMsg(null), 3000)
  }

  async function handleDeactivate() {
    if (!confirm(`Deactivate ${form.full_name}? They will lose access.`)) return
    await supabase.from('profiles').update({ is_active: false }).eq('id', id)
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
                <option value="employee">Employee</option>
                <option value="supervisor">Supervisor</option>
                <option value="hr">HR</option>
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

        {/* Save */}
        <button onClick={handleSave} disabled={saving}
          style={{ ...styles.primaryButton, width: '100%', justifyContent: 'center', fontSize: font.base, padding: '14px', opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Save size={16} />{saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
