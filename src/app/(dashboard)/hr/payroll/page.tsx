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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payroll 薪资管理</h1>
          <p className="text-gray-500 text-sm mt-1">Monthly payroll summary</p>
        </div>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-xl text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-gray-500 text-sm mb-1">Total Employees</p>
          <p className="text-2xl font-bold text-green-700">{employees.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-gray-500 text-sm mb-1">Total Basic Salary</p>
          <p className="text-2xl font-bold text-blue-700">RM {totalSalary.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['ID','Name','Department','Basic Salary','Bank','Account'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">No employees found</td></tr>
            ) : employees.map((e, i) => (
              <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 text-sm text-gray-500">{e.employee_id}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{e.full_name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{e.department || '-'}</td>
                <td className="px-4 py-3 text-sm font-bold text-green-700">RM {(e.basic_salary || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{e.bank_name || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{e.bank_account || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
