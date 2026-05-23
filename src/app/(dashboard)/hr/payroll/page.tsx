'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function HRPayrollPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const supabase = createClient()

  useEffect(() => { loadData() }, [month])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, employee_id, department, basic_salary, bank_account, bank_name')
      .eq('is_active', true)
      .neq('role', 'director')
      .order('employee_id')
    setEmployees(data || [])
    setLoading(false)
  }

  const totalSalary = employees.reduce((sum, e) => sum + (e.basic_salary || 0), 0)

  return (
    <div style={{ padding: '32px', maxWidth: '1200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1B4332', margin: '0 0 4px' }}>Payroll 薪资管理</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>Monthly payroll summary</p>
        </div>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ padding: '8px 12px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#6B7280', fontSize: '13px', margin: '0 0 8px' }}>Total Employees</p>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#16a34a', margin: 0 }}>{employees.length}</p>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#6B7280', fontSize: '13px', margin: '0 0 8px' }}>Total Basic Salary</p>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#2563eb', margin: 0 }}>RM {totalSalary.toFixed(2)}</p>
        </div>
      </div>
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              {['ID', 'Name', 'Department', 'Basic Salary', 'Bank', 'Account'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading...</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>No employees found</td></tr>
            ) : employees.map((e, i) => (
              <tr key={e.id} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6B7280' }}>{e.employee_id}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#111827' }}>{e.full_name}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6B7280' }}>{e.department || '-'}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#16a34a' }}>RM {(e.basic_salary || 0).toFixed(2)}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6B7280' }}>{e.bank_name || '-'}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6B7280' }}>{e.bank_account || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
