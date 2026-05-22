'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function HRPayrollPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` })
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

  function calcEPF(salary: number) { return salary * 0.11 }
  function calcSOCSO(salary: number) { return Math.min(salary * 0.005, 49.40) }
  function calcEIS(salary: number) { return Math.min(salary * 0.002, 7.90) }
  function calcNet(salary: number) { return salary - calcEPF(salary) - calcSOCSO(salary) - calcEIS(salary) }

  const totalPayroll = employees.reduce((sum, e) => sum + (e.basic_salary || 0), 0)

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

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Employees', value: employees.length, color: 'text-green-700' },
          { label: 'Total Basic Salary', value: 'RM ' + totalPayroll.toFixed(2), color: 'text-blue-700' },
          { label: 'Est. Net Payout', value: 'RM ' + employees.reduce((s,e) => s + calcNet(e.basic_salary||0), 0).toFixed(2), color: 'text-purple-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm">
            <p className="text-gray-500 text-sm mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['ID','Name','Department','Basic (RM)','EPF (11%)','SOCSO','EIS','Net Pay','Bank'].map(h => <th key={h} className="p
