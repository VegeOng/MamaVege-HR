'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function HREmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('all')
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .neq('role', 'director')
      .order('employee_id')
    setEmployees(data || [])
    setLoading(false)
  }

  async function handleDeactivate(id: string) {
    if (!confirm('Deactivate this employee?')) return
    await supabase.from('profiles').update({ is_active: false }).eq('id', id)
    loadData()
  }

  const depts = ['all', ...Array.from(new Set(employees.map(e => e.department).filter(Boolean)))]
  const filtered = employees.filter(e => {
    const matchSearch = !search || e.full_name?.toLowerCase().includes(search.toLowerCase()) || e.employee_id?.toLowerCase().includes(search.toLowerCase())
    const matchDept = dept === 'all' || e.department === dept
    return matchSearch && matchDept
  })

  const roleColor: any = {
    hr: { background: '#dbeafe', color: '#1d4ed8' },
    supervisor: { background: '#fef3c7', color: '#d97706' },
    employee: { background: '#dcfce7', color: '#16a34a' },
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1B4332', margin: '0 0 4px' }}>Employees 员工管理</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>{filtered.length} active employees</p>
        </div>
        <Link href="/hr/employees/new" style={{ padding: '10px 20px', background: '#1B4332', color: 'white', borderRadius: '10px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
          + Add Employee
        </Link>
      </div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Search by name or ID..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '9px 14px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', minWidth: '250px' }} />
        <select value={dept} onChange={e => setDept(e.target.value)}
          style={{ padding: '9px 14px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px' }}>
          {depts.map(d => <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>)}
        </select>
      </div>
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              {['Employee', 'ID', 'Department', 'Role', 'Shift', 'Email', 'Action'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>No employees found</td></tr>
            ) : filtered.map((e, i) => (
              <tr key={e.id} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#065f46', flexShrink: 0 }}>
                      {e.full_name?.[0]?.toUpperCase()}
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0 }}>{e.full_name}</p>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6B7280' }}>{e.employee_id}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{e.department || '-'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ ...(roleColor[e.role] || { background: '#F3F4F6', color: '#374151' }), padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize' }}>{e.role}</span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{e.shift || '-'}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6B7280' }}>{e.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Link href={`/hr/employees/${e.id}`} style={{ padding: '4px 10px', background: '#dbeafe', color: '#1d4ed8', borderRadius: '6px', fontSize: '12px', textDecoration: 'none', fontWeight: '500' }}>Edit</Link>
                    <button onClick={() => handleDeactivate(e.id)} style={{ padding: '4px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
