import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, TrendingUp, DollarSign, Calendar } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default async function DirectorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'director') redirect('/employee/dashboard')

  const today = new Date().toISOString().split('T')[0]
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const [{ count: totalEmp }, { count: presentToday }, { count: absentToday }, { data: payrollData }, { data: deptData }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true).neq('role', 'director'),
    supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).in('status', ['present','late']),
    supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'absent'),
    supabase.from('payroll').select('net_salary, epf_employer').eq('month', currentMonth).eq('year', currentYear),
    supabase.from('profiles').select('department').eq('is_active', true).neq('role', 'director'),
  ])

  const totalNetPayroll = payrollData?.reduce((s, p) => s + (p.net_salary || 0), 0) || 0
  const totalEPF = payrollData?.reduce((s, p) => s + (p.epf_employer || 0), 0) || 0
  const deptCounts: Record<string, number> = {}
  deptData?.forEach((e: any) => { deptCounts[e.department || 'Others'] = (deptCounts[e.department || 'Others'] || 0) + 1 })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Director Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">{new Date().toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Employees', value: totalEmp || 0, icon: Users, color: 'bg-blue-50 text-blue-600' },
          { label: 'Present Today', value: presentToday || 0, icon: TrendingUp, color: 'bg-green-50 text-green-600' },
          { label: 'Absent Today', value: absentToday || 0, icon: Calendar, color: 'bg-red-50 text-red-600' },
          { label: 'Attendance Rate', value: totalEmp ? Math.round(((presentToday||0)/totalEmp)*100)+'%' : '0%', icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
        ].map(stat => { const Icon = stat.icon; return (
          <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}><Icon className="w-5 h-5" /></div>
            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        )})}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-green-800 text-white rounded-2xl p-6">
          <p className="text-green-300 text-sm">This Month Net Payroll</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(totalNetPayroll)}</p>
          <p className="text-green-300 text-sm mt-2">EPF Employer: {formatCurrency(totalEPF)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">By Department</h3>
          {Object.entries(deptCounts).map(([dept, count]) => (
            <div key={dept} className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{dept}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-2 bg-green-500 rounded-full" style={{ width: `${((count as number) / (totalEmp || 1)) * 100}%` }} />
                </div>
                <span className="text-sm font-medium text-gray-700">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
