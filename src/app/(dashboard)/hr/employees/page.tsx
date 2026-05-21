'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, User, Mail, Phone, Edit2, UserX, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    let result = employees
    if (search) result = result.filter(e => e.full_name.toLowerCase().includes(search.toLowerCase()) || e.employee_id.toLowerCase().includes(search.toLowerCase()))
    if (deptFilter !== 'all') result = result.filter(e => e.department === deptFilter)
    setFiltered(result)
  }, [search, deptFilter, employees])

  async function loadData() {
    const [empRes, deptRes] = await Promise.all([
      supabase.from('profiles').select('*').neq('role', 'director').order('full_name'),
      supabase.from('departments').select('*').order('name'),
    ])
    setEmployees(empRes.data || [])
    setFiltered(empRes.data || [])
    setDepartments(deptRes.data || [])
    setLoading(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('profiles').update({ is_active: !current }).eq('id', id)
    loadData()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Employees  员工管理</h1>
          <p className="text-gray-500 text-sm mt-1">{employees.filter(e => e.is_active).length} active employees</p>
        </div>
        <Link href="/hr/employees/new" className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Employee
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or ID..." className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none text-sm" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none text-sm">
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No employees found</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(emp => (
              <div key={emp.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-700 font-semibold text-sm">{emp.full_name.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800 text-sm">{emp.full_name}</p>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{emp.employee_id}</span>
                      {!emp.is_active && <span className="text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full">Inactive</span>}
                    </div>
                    <p className="text-xs text-gray-400">{emp.position} · {emp.department} · Shift {emp.shift}</p>
                    <p className="text-xs text-gray-400">{emp.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${emp.role === 'supervisor' ? 'bg-blue-100 text-blue-600' : emp.role === 'hr' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                    {emp.role}
                  </span>
                  <Link href={`/hr/employees/${emp.id}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4 text-gray-400" />
                  </Link>
                  <button onClick={() => toggleActive(emp.id, emp.is_active)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <UserX className={`w-4 h-4 ${emp.is_active ? 'text-red-400' : 'text-green-400'}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
