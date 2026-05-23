'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function EmployeePayslipPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
    setLoading(false)
  }

  const salary = profile?.basic_salary || 0
  const epf = salary * (profile?.epf_rate || 0.11)
  const socso = Math.min(salary * (profile?.socso_rate || 0.005), 49.40)
  const eis = Math.min(salary * (profile?.eis_rate || 0.002), 7.90)
  const pcb = profile?.pcb_amount || 0
  const totalDeductions = epf + socso + eis + pcb
  const netSalary = salary - totalDeductions

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })

  if (loading) return <div style={{ padding: '32px', color: '#9CA3AF' }}>Loading...</div>

  return (
    <div style={{ padding: '32px', maxWidth: '700px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1B4332', margin: '0 0 4px' }}>Payslip 薪资单</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>Your monthly salary breakdown</p>
        </div>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px' }} />
      </div>

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ background: '#1B4332', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: '#74C69D', fontSize: '12px', margin: '0 0 4px' }}>MamaVege HR</p>
              <p style={{ color: 'white', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>{profile?.full_name}</p>
              <p style={{ color: '#95D5B2', fontSize: '13px', margin: 0 }}>{profile?.employee_id} · {profile?.department || 'N/A'}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: '#74C69D', fontSize: '12px', margin: '0 0 4px' }}>Pay Period</p>
              <p style={{ color: 'white', fontSize: '16px', fontWeight: '600', margin: 0 }}>{monthLabel}</p>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', margin: '0 0 12px', letterSp
