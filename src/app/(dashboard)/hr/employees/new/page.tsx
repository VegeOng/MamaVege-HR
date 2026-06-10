'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Upload, User, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
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

export default function NewEmployeePage() {
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<any[]>([])
  const [offerFile, setOfferFile] = useState<File | null>(null)
  const [icFile, setIcFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', whatsapp_number: '',
    ic_number: '', ic_type: 'nric',
    department: '', position: '', role: 'employee',
    join_date: '', shift: 'A', clock_in_method: 'wifi',
    basic_salary: '', epf_number: '', socso_number: '', tax_number: '',
    bank_name: '', bank_account: '',
    annual_leave_days: '12', medical_leave_days: '14', emergency_leave_days: '3',
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.from('departments').select('*').order('name').then(({ data }) => setDepartments(data || []))
  }, [])

  const f = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  async function handleSubmit() {
    if (!form.full_name || !form.email || !form.join_date) { alert('Please fill all required fields'); return }
    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: form.email, email_confirm: true,
        user_metadata: { full_name: form.full_name }
      })
      let userId = authData?.user?.id
      if (authError || !userId) {
        const { data: inviteData } = await supabase.auth.admin.inviteUserByEmail(form.email)
        userId = inviteData?.user?.id
      }
      if (!userId) { alert('Error creating user. Please try again.'); setLoading(false); return }

      const { data: countData } = await supabase.from('profiles').select('id', { count: 'exact' })
      const empId = `MV${String((countData?.length || 0) + 1).padStart(4, '0')}`

      let offerUrl = null, icUrl = null
      if (offerFile) {
        const path = `${userId}/offer_letter_${Date.now()}.pdf`
        await supabase.storage.from('employee-documents').upload(path, offerFile)
        const { data } = supabase.storage.from('employee-documents').getPublicUrl(path)
        offerUrl = data?.publicUrl
      }
      if (icFile) {
        const ext = icFile.name.split('.').pop()
        const path = `${userId}/ic_copy_${Date.now()}.${ext}`
        await supabase.storage.from('employee-documents').upload(path, icFile)
        const { data } = supabase.storage.from('employee-documents').getPublicUrl(path)
        icUrl = data?.publicUrl
      }

      await supabase.from('profiles').insert({
        id: userId, employee_id: empId, full_name: form.full_name, email: form.email,
        phone: form.phone, whatsapp_number: form.whatsapp_number,
        ic_number: form.ic_number, ic_type: form.ic_type,
        department: form.department, position: form.position, role: form.role,
        join_date: form.join_date, shift: form.shift, clock_in_method: form.clock_in_method,
        basic_salary: parseFloat(form.basic_salary) || 0,
        epf_number: form.epf_number, socso_number: form.socso_number, tax_number: form.tax_number,
        bank_name: form.bank_name, bank_account: form.bank_account, is_active: true,
      })

      if (offerUrl && offerFile) {
        await supabase.from('employee_documents').insert({ employee_id: userId, document_type: 'offer_letter', title: 'Offer Letter', file_url: offerUrl, file_name: offerFile.name, file_size: offerFile.size })
      }
      if (icUrl && icFile) {
        await supabase.from('employee_documents').insert({ employee_id: userId, document_type: 'ic_copy', title: 'IC / Work Permit Copy', file_url: icUrl, file_name: icFile.name, file_size: icFile.size })
      }

      const currentYear = new Date().getFullYear()
      const { data: leaveTypes } = await supabase.from('leave_types').select('id, code')
      const entitlements = []
      for (const lt of leaveTypes || []) {
        let hours = 0
        if (lt.code === 'AL') hours = parseInt(form.annual_leave_days || '0') * 8
        else if (lt.code === 'ML') hours = parseInt(form.medical_leave_days || '0') * 8
        else if (lt.code === 'EL') hours = parseInt(form.emergency_leave_days || '0') * 8
        else if (lt.code === 'MAT') hours = 98 * 8
        if (hours > 0) entitlements.push({ employee_id: userId, leave_type_id: lt.id, year: currentYear, entitled_hours: hours, used_hours: 0 })
      }
      if (entitlements.length > 0) await supabase.from('leave_entitlements').insert(entitlements)

      router.push('/hr/employees')
    } catch (err) {
      console.error(err)
      alert('Error creating employee. Please try again.')
    }
    setLoading(false)
  }

  const inputStyle = { ...styles.input, width: '100%' }
  const selectStyle = { ...styles.input, width: '100%' }

  return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <Link href="/hr/employees" style={{ width: '36px', height: '36px', borderRadius: radius.md, border: `1.5px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, textDecoration: 'none', background: 'white' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ ...styles.pageTitle }}>Add New Employee 添加员工</h1>
            <p style={{ ...styles.pageSubtitle }}>Fill in the details to create a new account</p>
          </div>
        </div>

        {/* Basic Info */}
        <Section title="Basic Information 基本资料">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <Label required>Full Name</Label>
              <input value={form.full_name} onChange={e => f('full_name', e.target.value)} placeholder="As per IC" style={inputStyle} />
            </div>
            <div>
              <Label required>Email</Label>
              <input type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="email@example.com" style={inputStyle} />
            </div>
            <div>
              <Label>Phone</Label>
              <input value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="+60 12-345 6789" style={inputStyle} />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <input value={form.whatsapp_number} onChange={e => f('whatsapp_number', e.target.value)} placeholder="+60 12-345 6789" style={inputStyle} />
            </div>
            <div>
              <Label required>IC Type</Label>
              <select value={form.ic_type} onChange={e => f('ic_type', e.target.value)} style={selectStyle}>
                <option value="nric">MyKad (NRIC)</option>
                <option value="work_permit">Work Permit</option>
                <option value="passport">Passport</option>
              </select>
            </div>
            <div>
              <Label required>IC / Permit Number</Label>
              <input value={form.ic_number} onChange={e => f('ic_number', e.target.value)} placeholder="e.g. 901234-56-7890" style={inputStyle} />
            </div>
          </div>
        </Section>

        {/* Employment */}
        <Section title="Employment Details 工作资料">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <Label required>Department</Label>
              <select value={form.department} onChange={e => f('department', e.target.value)} style={selectStyle}>
                <option value="">Select department...</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Position</Label>
              <input value={form.position} onChange={e => f('position', e.target.value)} placeholder="e.g. Sales Executive" style={inputStyle} />
            </div>
            <div>
              <Label required>Role</Label>
              <select value={form.role} onChange={e => f('role', e.target.value)} style={selectStyle}>
                <option value="employee">Employee</option>
                <option value="supervisor">Supervisor</option>
                <option value="hr">HR</option>
              </select>
            </div>
            <div>
              <Label required>Join Date</Label>
              <input type="date" value={form.join_date} onChange={e => f('join_date', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <Label required>Shift</Label>
              <select value={form.shift} onChange={e => f('shift', e.target.value)} style={selectStyle}>
                <option value="A">Shift A (8am – 5pm)</option>
                <option value="B">Shift B (8am – 6pm)</option>
                <option value="C">Shift C (Flexible)</option>
              </select>
            </div>
            <div>
              <Label>Clock In Method</Label>
              <select value={form.clock_in_method} onChange={e => f('clock_in_method', e.target.value)} style={selectStyle}>
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
            <div>
              <Label required>Basic Salary (RM)</Label>
              <input type="number" value={form.basic_salary} onChange={e => f('basic_salary', e.target.value)} placeholder="0.00" style={inputStyle} />
            </div>
            <div>
              <Label>EPF Number</Label>
              <input value={form.epf_number} onChange={e => f('epf_number', e.target.value)} placeholder="EPF account number" style={inputStyle} />
            </div>
            <div>
              <Label>SOCSO Number</Label>
              <input value={form.socso_number} onChange={e => f('socso_number', e.target.value)} placeholder="SOCSO number" style={inputStyle} />
            </div>
            <div>
              <Label>Tax (PCB) Number</Label>
              <input value={form.tax_number} onChange={e => f('tax_number', e.target.value)} placeholder="Income tax number" style={inputStyle} />
            </div>
            <div>
              <Label>Bank Name</Label>
              <input value={form.bank_name} onChange={e => f('bank_name', e.target.value)} placeholder="e.g. Maybank" style={inputStyle} />
            </div>
            <div>
              <Label>Bank Account No.</Label>
              <input value={form.bank_account} onChange={e => f('bank_account', e.target.value)} placeholder="Account number" style={inputStyle} />
            </div>
          </div>
        </Section>

        {/* Leave */}
        <Section title="Leave Entitlement 假期设置">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div>
              <Label>Annual Leave (days)</Label>
              <input type="number" value={form.annual_leave_days} onChange={e => f('annual_leave_days', e.target.value)} placeholder="12" style={inputStyle} />
            </div>
            <div>
              <Label>Medical Leave (days)</Label>
              <input type="number" value={form.medical_leave_days} onChange={e => f('medical_leave_days', e.target.value)} placeholder="14" style={inputStyle} />
            </div>
            <div>
              <Label>Emergency Leave (days)</Label>
              <input type="number" value={form.emergency_leave_days} onChange={e => f('emergency_leave_days', e.target.value)} placeholder="3" style={inputStyle} />
            </div>
          </div>
        </Section>

        {/* Documents */}
        <Section title="Documents 文件上传">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[
              { label: 'Offer Letter (PDF)', file: offerFile, setter: setOfferFile, accept: 'application/pdf', icon: <Upload size={20} />, note: 'Optional — PDF only' },
              { label: 'IC / Work Permit Copy', file: icFile, setter: setIcFile, accept: 'application/pdf,image/*', icon: <User size={20} />, note: 'Optional — PDF or image' },
            ].map(item => (
              <div key={item.label} style={{ border: `2px dashed ${item.file ? colors.primaryLight : colors.border}`, borderRadius: radius.lg, padding: '20px', textAlign: 'center', background: item.file ? '#F0FDF4' : colors.borderLight }}>
                <div style={{ color: item.file ? colors.primaryLight : colors.textMuted, marginBottom: '8px' }}>{item.icon}</div>
                <p style={{ margin: '0 0 4px', fontSize: font.sm, fontWeight: '600', color: colors.textPrimary }}>{item.label}</p>
                <p style={{ margin: '0 0 10px', fontSize: font.xs, color: colors.textMuted }}>{item.note}</p>
                <input type="file" accept={item.accept} onChange={e => item.setter(e.target.files?.[0] || null)}
                  style={{ width: '100%', fontSize: '12px', color: colors.textMuted }} />
                {item.file && <p style={{ margin: '6px 0 0', fontSize: '11px', color: colors.success, fontWeight: '600' }}>{item.file.name}</p>}
              </div>
            ))}
          </div>
        </Section>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading}
          style={{ ...styles.primaryButton, width: '100%', justifyContent: 'center', fontSize: font.base, padding: '14px', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Save size={16} />{loading ? 'Creating Employee Account...' : 'Create Employee Account'}
        </button>
      </div>
    </div>
  )
}
