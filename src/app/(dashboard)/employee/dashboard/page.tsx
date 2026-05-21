import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Clock, Calendar, FileText, DollarSign, AlertCircle } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import Link from 'next/link'

export default async function EmployeeDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const today = new Date().toISOString().split('T')[0]

  // Today attendance
  const { data: todayAttendance } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', user.id)
    .eq('date', today)
    .single()

  // Leave balances this year
  const currentYear = new Date().getFullYear()
  const { data: leaveBalances } = await supabase
    .from('leave_entitlements')
    .select('*, leave_type:leave_types(name, code)')
    .eq('employee_id', user.id)
    .eq('year', currentYear)

  // Pending leave requests
  const { data: pendingLeaves } = await supabase
    .from('leave_requests')
    .select('*, leave_type:leave_types(name)')
    .eq('employee_id', user.id)
    .eq('status', 'pending')
    .order('applied_at', { ascending: false })
    .limit(3)

  // Latest payslip
  const { data: latestPayroll } = await supabase
    .from('payroll')
    .select('*')
    .eq('employee_id', user.id)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(1)
    .single()

  const clockedIn = !!todayAttendance?.clock_in
  const clockedOut = !!todayAttendance?.clock_out

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {profile?.full_name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">{formatDate(today)} · {profile?.department} · {profile?.position}</p>
      </div>

      {/* Attendance Card */}
      <div className={`rounded-2xl p-6 mb-6 ${clockedIn && !clockedOut ? 'bg-green-700' : clockedOut ? 'bg-gray-700' : 'bg-orange-600'} text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80 mb-1">Today's Attendance  今日打卡</p>
            <p className="text-2xl font-bold">
              {clockedOut ? '✅ Completed' : clockedIn ? '🟢 Clocked In' : '⏰ Not Clocked In'}
            </p>
            {todayAttendance?.clock_in && (
              <p className="text-sm opacity-80 mt-1">
                In: {new Date(todayAttendance.clock_in).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                {todayAttendance.clock_out && ` · Out: ${new Date(todayAttendance.clock_out).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}`}
              </p>
            )}
            {todayAttendance?.is_late && (
              <span className="inline-block mt-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                Late by {todayAttendance.late_minutes} mins
              </span>
            )}
          </div>
          <Link
            href="/employee/attendance"
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors text-sm"
          >
            {clockedOut ? 'View' : clockedIn ? 'Clock Out' : 'Clock In'}
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {leaveBalances?.slice(0, 3).map(bal => (
          <div key={bal.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">{bal.leave_type?.name}</p>
            <p className="text-2xl font-bold text-gray-800">
              {((bal.entitled_hours + bal.carried_forward_hours - bal.used_hours) / 8).toFixed(1)}
            </p>
            <p className="text-xs text-gray-400">days remaining</p>
          </div>
        ))}
        {latestPayroll && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Last Payslip</p>
            <p className="text-xl font-bold text-green-700">{formatCurrency(latestPayroll.net_salary || 0)}</p>
            <p className="text-xs text-gray-400">Net Salary</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { href: '/employee/leave', label: 'Apply Leave', sublabel: '申请假期', icon: Calendar, color: 'bg-blue-50 text-blue-600' },
          { href: '/employee/ot', label: 'Apply OT', sublabel: '申请加班', icon: Clock, color: 'bg-orange-50 text-orange-600' },
          { href: '/employee/claims', label: 'Submit Claim', sublabel: '提交报销', icon: FileText, color: 'bg-purple-50 text-purple-600' },
          { href: '/employee/payslip', label: 'My Payslip', sublabel: '我的薪资单', icon: DollarSign, color: 'bg-green-50 text-green-600' },
        ].map(action => {
          const Icon = action.icon
          return (
            <Link key={action.href} href={action.href} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="font-semibold text-gray-800 text-sm">{action.label}</p>
              <p className="text-gray-400 text-xs">{action.sublabel}</p>
            </Link>
          )
        })}
      </div>

      {/* Pending Requests */}
      {pendingLeaves && pendingLeaves.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            <h3 className="font-semibold text-gray-800">Pending Requests  待审批</h3>
          </div>
          <div className="space-y-3">
            {pendingLeaves.map(req => (
              <div key={req.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-700">{req.leave_type?.name}</p>
                  <p className="text-xs text-gray-400">{formatDate(req.start_date)} · {req.total_hours / 8} day(s)</p>
                </div>
                <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
