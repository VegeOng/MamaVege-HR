'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Upload, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
    epf_employee_rate: '11', epf_employer_rate: '13',
    socso_employee: '', socso_employer: '',
    eis_employee: '', eis_employer: '', pcb: '',
    annual_leave_days: '', medical_leave_days: '', emergency_leave_days: '',
    petrol_claim_limit: '', meal_claim_limit: '', others_claim_limit: '',
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.from('departments').select('*').order('name').then(({ data }) => setDepartments(data || []))
  }, [])

  const f = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  async function handleSubmit() {
    if (!offerFile) { alert('Please upload Offer Letter'); return }
    if (!form.full_name || !form.email || !form.join_date) { alert('Please fill all required fields'); return }
    setLoading(true)

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: form.email,
        email_confirm: true,
        user_metadata: { full_name: form.full_name }
      })

      // Fallback: invite user
      let userId = authData?.user?.id
      if (authError || !userId) {
        const { data: inviteData } = await supabase.auth.admin.inviteUserByEmail(form.email)
        userId = inviteData?.user?.id
      }

      if (!userId) {
        alert('Error creating user account. Please try again.')
        setLoading(false)
        return
      }

      // Generate employee ID
      const { data: countData } = await supabase.from('profiles').select('id', { count: 'exact' })
      const empId = `MV${String((countData?.length || 0) + 1).padStart(4, '0')}`

      // Upload offer letter
      const offerPath = `${userId}/offer_letter_${Date.now()}.pdf`
      await supabase.storage.from('employee-documents').upload(offerPath, offerFile)
      const { data: offerUrl } = supabase.storage.from('employee-documents').getPublicUrl(offerPath)

      // Upload IC if provided
      let icUrl = null
      if (icFile) {
        const icPath = `${userId}/ic_copy_${Date.now()}.${icFile.name.split('.').pop()}`
        await supabase.storage.from('employee-documents').upload(icPath, icFile)
        const { data: icUrlData } = supabase.storage.from('employee-documents').getPublicUrl(icPath)
        icUrl = icUrlData?.publicUrl
      }

      // Create profile
      await supabase.from('profiles').insert({
        id: userId,
        employee_id: empId,
        full_name: form.full_name,
        email: form.email,
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
        is_active: true,
      })

      // Save offer letter document
      await supabase.from('employee_documents').insert({
        employee_id: userId,
        document_type: 'offer_letter',
        title: 'Offer Letter',
        file_url: offerUrl?.publicUrl || '',
        file_name: offerFile.name,
        file_size: offerFile.size,
      })

      // Save IC copy if uploaded
      if (icUrl && icFile) {
        await supabase.from('employee_documents').insert({
          employee_id: userId,
          document_type: 'ic_copy',
          title: 'IC / Work Permit Copy',
          file_url: icUrl,
          file_name: icFile.name,
          file_size: icFile.size,
        })
      }

      // Save leave entitlements
      const currentYear = new Date().getFullYear()
      const { data: leaveTypes } = await supabase.from('leave_types').select('id, code')
      const entitlements = []
      for (const lt of leaveTypes || []) {
        let hours = 0
        if (lt.code === 'AL') hours = parseInt(form.annual_leave_days || '0') * 8
        else if (lt.code === 'ML') hours = parseInt(form.medical_leave_days || '0') * 8
        else if (lt.code === 'EL') hours = parseInt(form.emergency_leave_days || '0') * 8
        else if (lt.code === 'MAT') hours = 98 * 8
        if (hours > 0) {
          entitlements.push({ employee_id: userId, leave_type_id: lt.id, year: currentYear, entitled_hours: hours, used_hours: 0 })
        }
      }
      if (entitlements.length > 0) await supabase.from('leave_entitlements').insert(entitlements)

      // Save claim limits
      const { data: claimTypes } = await supabase.from('claim_types').select('id, code')
      const claimLimits = []
      for (const ct of claimTypes || []) {
        let limit = null
        if (ct.code === 'PETROL') limit = parseFloat(form.petrol_claim_limit) || null
        else if (ct.code === 'MEAL') limit = parseFloat(form.meal_claim_limit) || null
        else if (ct.code === 'OTHERS') limit = parseFloat(form.others_claim_limit) || null
        if (limit !== null) {
          claimLimits.push({ employee_id: userId, claim_type_id: ct.id, monthly_limit: limit })
        }
      }
      if (claimLimits.length > 0) await supabase.from('claim_limits').insert(claimLimits)

      router.push('/hr/employees')
    } catch (err) {
      console.error(err)
      alert('Error creating employee. Please try again.')
    }
    setLoading(false)
  }

  const Section = ({ title, children }: any) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
      <h3 className="font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">{title}</h3>
      {children}
    </div>
  )

  const Field = ({ label, required, children }: any) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      {children}
    </div>
  )

  const Input = ({ field, type = 'text', placeholder = '' }: any) => (
    <input type={type} value={form[field as keyof typeof form]} onChange={e => f(field, e.target.value)}
      placeholder={placeholder} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none text-sm" />
  )

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/hr/employees" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Add New Employee  添加新员工</h1>
          <p className="text-gray-500 text-sm">Fill in all required fields</p>
        </div>
      </div>

      <Section title="👤 Basic Information  基本资料">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name" required><Input field="full_name" placeholder="As per IC" /></Field>
          <Field label="Email" required><Input field="email" type="email" placeholder="email@example.com" /></Field>
          <Field label="Phone"><Input field="phone" placeholder="+60 12-345 6789" /></Field>
          <Field label="WhatsApp"><Input field="whatsapp_number" placeholder="+60 12-345 6789" /></Field>
          <Field label="IC Type" required>
            <select value={form.ic_type} onChange={e => f('ic_type', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none text-sm">
              <option value="nric">MyKad (NRIC)</option>
              <option value="work_permit">Work Permit</option>
              <option value="passport">Passport</option>
            </select>
          </Field>
          <Field label="IC / Permit Number" required><Input field="ic_number" placeholder="e.g. 901234-56-7890" /></Field>
        </div>
      </Section>

      <Section title="🏢 Employment Details  工作资料">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Department" required>
            <select value={form.department} onChange={e => f('department', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none text-sm">
              <option value="">Select department...</option>
              {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Position"><Input field="position" placeholder="e.g. Sales Executive" /></Field>
          <Field label="Role" required>
            <select value={form.role} onChange={e => f('role', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none text-sm">
              <option value="employee">Employee</option>
              <option value="supervisor">Supervisor</option>
              <option value="hr">HR</option>
            </select>
          </Field>
          <Field label="Join Date" required><Input field="join_date" type="date" /></Field>
          <Field label="Shift" required>
            <select value={form.shift} onChange={e => f('shift', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none text-sm">
              <option value="A">Shift A (8am - 5pm)</option>
              <option value="B">Shift B (8am - 6pm)</option>
              <option value="C">Shift C (Flexible)</option>
            </select>
          </Field>
          <Field label="Clock In Method">
            <select value={form.clock_in_method} onChange={e => f('clock_in_method', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none text-sm">
              <option value="wifi">WiFi (Office Staff)</option>
              <option value="gps">GPS (Field Staff)</option>
              <option value="both">Both</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title="💰 Salary & Statutory  薪资与法定扣除">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Basic Salary (RM)" required><Input field="basic_salary" type="number" placeholder="0.00" /></Field>
          <Field label="EPF Number"><Input field="epf_number" placeholder="EPF account number" /></Field>
          <Field label="SOCSO Number"><Input field="socso_number" placeholder="SOCSO number" /></Field>
          <Field label="Tax (PCB) Number"><Input field="tax_number" placeholder="Income tax number" /></Field>
          <Field label="Bank Name"><Input field="bank_name" placeholder="e.g. Maybank" /></Field>
          <Field label="Bank Account"><Input field="bank_account" placeholder="Account number" /></Field>
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded-xl">
          <p className="text-sm font-medium text-gray-700 mb-3">Monthly Deductions  每月扣除额</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="EPF Employee (RM)"><Input field="socso_employee" type="number" placeholder="e.g. 110.00" /></Field>
            <Field label="EPF Employer (RM)"><Input field="socso_employer" type="number" placeholder="e.g. 130.00" /></Field>
            <Field label="SOCSO Employee (RM)"><Input field="eis_employee" type="number" placeholder="e.g. 5.00" /></Field>
            <Field label="SOCSO Employer (RM)"><Input field="eis_employer" type="number" placeholder="e.g. 17.50" /></Field>
            <Field label="EIS Employee (RM)"><Input field="epf_employee_rate" type="number" placeholder="e.g. 2.00" /></Field>
            <Field label="EIS Employer (RM)"><Input field="epf_employer_rate" type="number" placeholder="e.g. 2.00" /></Field>
            <Field label="PCB / Income Tax (RM)"><Input field="pcb" type="number" placeholder="e.g. 50.00" /></Field>
          </div>
        </div>
      </Section>

      <Section title="🌴 Leave Entitlement  假期设置">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Annual Leave (days)"><Input field="annual_leave_days" type="number" placeholder="e.g. 12" /></Field>
          <Field label="Medical Leave (days)"><Input field="medical_leave_days" type="number" placeholder="e.g. 14" /></Field>
          <Field label="Emergency Leave (days)"><Input field="emergency_leave_days" type="number" placeholder="e.g. 3" /></Field>
        </div>
      </Section>

      <Section title="💼 Claim Limits  报销上限 (Monthly RM)">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Petrol / Toll"><Input field="petrol_claim_limit" type="number" placeholder="e.g. 300" /></Field>
          <Field label="Meal"><Input field="meal_claim_limit" type="number" placeholder="e.g. 200" /></Field>
          <Field label="Others"><Input field="others_claim_limit" type="number" placeholder="e.g. 100" /></Field>
        </div>
      </Section>

      <Section title="📄 Documents  文件上传">
        <div className="grid grid-cols-2 gap-4">
          <div className={`border-2 border-dashed rounded-xl p-4 text-center ${offerFile ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50'}`}>
            <Upload className={`w-6 h-6 mx-auto mb-2 ${offerFile ? 'text-green-500' : 'text-red-400'}`} />
            <p className="text-sm font-medium text-gray-700 mb-1">Offer Letter (PDF) <span className="text-red-500">*</span></p>
            <p className="text-xs text-gray-400 mb-2">Required to create account</p>
            <input type="file" accept="application/pdf" onChange={e => setOfferFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-green-100 file:text-green-700" />
            {offerFile && <p className="text-xs text-green-600 mt-1">✅ {offerFile.name}</p>}
          </div>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
            <User className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700 mb-1">IC / Work Permit Copy</p>
            <p className="text-xs text-gray-400 mb-2">PDF or image</p>
            <input type="file" accept="application/pdf,image/*" onChange={e => setIcFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-600" />
            {icFile && <p className="text-xs text-green-600 mt-1">✅ {icFile.name}</p>}
          </div>
        </div>
      </Section>

      <button onClick={handleSubmit} disabled={loading || !offerFile}
        className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-4 rounded-xl transition-colors disabled:opacity-50 text-base">
        {loading ? 'Creating Employee Account...' : '✅ Create Employee Account'}
      </button>
    </div>
  )
}
