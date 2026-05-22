import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, Clock, Calendar, DollarSign, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

export default async function HRDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['hr', 'director'].includes(profile?.role)) redirect('/employee/dashboard')

  const today = new Date().toISOString().split('T')[0]
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const [
    { count: totalEmployees },
    { count: activeToday },
    { count: lateToday },
    { count: pendingLeaves },
    { count: pendingClaims },
    { count: pendingOT },
    { data: recentLeaves },
    { data: payrollSummary },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true).neq('role', 'director'),
    supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'present'),
    supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'late'),
    supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('claims').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('ot_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('leave_requests').select('*, employee:profiles(full_name, department), leave_type:leave_types(name)').eq('status', 'pending').order('applied_at', { ascending: false }).limit(5),
    supabase.from('payroll').select('net_salary').eq('month', currentMonth).eq('year', currentYear).eq('status', 'paid'),
  ])

  const totalPayroll = payrollSummary?.reduce((sum, p) => sum + (p.net_salary || 0), 0) || 0

  const stats = [
    { label: 'Total Employees', value: totalEmployees || 0, icon: "👥", color: 'bg-blue-50 text-blue-600', link: '/hr/employees' },
    { label: 'Present Today', value: activeToday || 0, icon: "✅", color: 'bg-green-50 text-green-600', link: '/hr/attendance' },
    { label: 'Late Today', value: lateToday || 0, icon: "⏰", color: 'bg-orange-50 text-orange-600', link: '/hr/attendance' },
    { label: 'Pending Leaves', value: pendingLeaves || 0, icon: "📅", color: 'bg-yellow-50 text-yellow-600', link: '/hr/leave' },
    { label: 'Pending Claims', value: pendingClaims || 0, icon: "💼", color: 'bg-purple-50 text-purple-600', link: '/hr/claims' },
    { label: 'Pending OT', value: pendingOT || 0, icon: "📈", color: 'bg-red-50 text-red-600', link: '/hr/ot' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">HR Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">MamaVege HR Management · {new Date().toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <Link key={stat.label} href={stat.link} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                  {stat.icon}
                </div>
                {stat.value > 0 && stat.label.includes('Pending') && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{stat.value}</span>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </Link>
          )
        })}
      </div>

      {/* Monthly Payroll */}
      <div className="bg-green-800 text-white rounded-2xl p-6 mb-6">
        <p className="text-green-300 text-sm mb-1">This Month's Payroll  本月薪资</p>
        <p className="text-3xl font-bold">{formatCurrency(totalPayroll)}</p>
        <p className="text-green-300 text-sm mt-1">Total Net Salary Paid · {new Date().toLocaleString('en', { month: 'long', year: 'numeric' })}</p>
        <Link href="/hr/payroll" className="inline-block mt-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          Manage Payroll →
        </Link>
      </div>

      {/* Pending Leave Requests */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Pending Leave Requests  待审批假期</h3>
          <Link href="/hr/leave" className="text-sm text-green-600 hover:underline">View all →</Link>
        </div>
        {!recentLeaves || recentLeaves.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">✅ No pending leave requests</p>
        ) : (
          <div className="space-y-3">
            {recentLeaves.map((req: any) => (
              <div key={req.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{req.employee?.full_name}</p>
                  <p className="text-xs text-gray-400">{req.leave_type?.name} · {req.total_hours / 8} day(s) · {req.employee?.department}</p>
                </div>
                <Link href="/hr/leave" className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full font-medium hover:bg-yellow-200 transition-colors">
                  Review
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
