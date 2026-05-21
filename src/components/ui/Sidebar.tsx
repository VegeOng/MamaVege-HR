'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Leaf, LayoutDashboard, Clock, Calendar, FileText,
  Users, DollarSign, BarChart2, Settings, LogOut,
  MessageSquare, ClipboardList, Bell
} from 'lucide-react'
import { UserRole } from '@/types'

interface SidebarProps {
  role: UserRole
  userName: string
}

const employeeNav = [
  { href: '/employee/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/employee/attendance', label: 'Attendance  打卡', icon: Clock },
  { href: '/employee/leave', label: 'Leave  假期', icon: Calendar },
  { href: '/employee/ot', label: 'Overtime  加班', icon: ClipboardList },
  { href: '/employee/claims', label: 'Claims  报销', icon: FileText },
  { href: '/employee/payslip', label: 'Payslip  薪资单', icon: DollarSign },
  { href: '/employee/documents', label: 'Documents  文件', icon: FileText },
  { href: '/employee/suggestion', label: 'Suggestion Box  建议箱', icon: MessageSquare },
]

const hrNav = [
  { href: '/hr/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/hr/employees', label: 'Employees  员工', icon: Users },
  { href: '/hr/attendance', label: 'Attendance  打卡', icon: Clock },
  { href: '/hr/leave', label: 'Leave  假期', icon: Calendar },
  { href: '/hr/ot', label: 'Overtime  加班', icon: ClipboardList },
  { href: '/hr/claims', label: 'Claims  报销', icon: FileText },
  { href: '/hr/payroll', label: 'Payroll  薪资', icon: DollarSign },
  { href: '/hr/holidays', label: 'Public Holidays  公假', icon: Calendar },
  { href: '/hr/settings', label: 'Settings  设置', icon: Settings },
]

const directorNav = [
  { href: '/director/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/director/reports', label: 'Reports  报表', icon: BarChart2 },
  { href: '/director/payroll', label: 'Payroll  薪资', icon: DollarSign },
  { href: '/director/suggestions', label: 'Suggestions  建议箱', icon: MessageSquare },
]

const supervisorNav = [
  { href: '/employee/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/employee/attendance', label: 'Attendance  打卡', icon: Clock },
  { href: '/employee/leave', label: 'Leave  假期', icon: Calendar },
  { href: '/employee/ot', label: 'My OT  我的加班', icon: ClipboardList },
  { href: '/supervisor/ot', label: 'Approve OT  审批加班', icon: ClipboardList },
  { href: '/supervisor/team', label: 'My Team  我的团队', icon: Users },
  { href: '/employee/claims', label: 'Claims  报销', icon: FileText },
  { href: '/employee/payslip', label: 'Payslip  薪资单', icon: DollarSign },
  { href: '/employee/suggestion', label: 'Suggestion Box', icon: MessageSquare },
]

export default function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const navItems = role === 'hr' ? hrNav
    : role === 'director' ? directorNav
    : role === 'supervisor' ? supervisorNav
    : employeeNav

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="w-64 bg-green-900 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-green-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">MamaVege HR</p>
            <p className="text-green-400 text-xs capitalize">{role}</p>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="px-4 py-3 border-b border-green-800">
        <p className="text-green-300 text-xs">Logged in as</p>
        <p className="text-white text-sm font-medium truncate">{userName}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                active
                  ? 'bg-green-500 text-white'
                  : 'text-green-200 hover:bg-green-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-green-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-green-200 hover:bg-green-800 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out  登出</span>
        </button>
      </div>
    </div>
  )
}
