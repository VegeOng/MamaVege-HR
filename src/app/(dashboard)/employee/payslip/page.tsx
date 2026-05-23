'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function EmployeePayslipPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0')
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
  const net = salary - epf - socso - eis - pcb
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
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ background: '#1B4332', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
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
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', margin: '0 0 12px' }}>Earnings</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
            <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>Basic Salary</p>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>RM {salary.toFixed(2)}</p>
          </div>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', margin: '16px 0 12px' }}>Deductions</p>
          {[
            { label: 'EPF', value: epf },
            { label: 'SOCSO', value: socso },
            { label: 'EIS', value: eis },
            { label: 'PCB', value: pcb },
          ].map(d => (
            <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
              <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>{d.label}</p>
              <p style={{ fontSize: '14px', color: '#dc2626', margin: 0 }}>- RM {d.value.toFixed(2)}</p>
            </div>
          ))}
          <div style={{ background: '#F0FDF4', borderRadius: '10px', padding: '16px', display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
            <p style={{ fontSize: '16px', fontWeight: '700', color: '#1B4332', margin: 0 }}>Net Salary</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#16a34a', margin: 0 }}>RM {net.toFixed(2)}</p>
          </div>
        </div>
        <div style={{ padding: '16px 24px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 2px' }}>Bank</p>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#374151', margin: 0 }}>{profile?.bank_name || '-'}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 2px' }}>Account</p>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#374151', margin: 0 }}>{profile?.bank_account || '-'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
