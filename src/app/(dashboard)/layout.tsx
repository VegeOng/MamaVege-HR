'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Clock, CalendarDays, Timer, Briefcase,
  Wallet, FolderOpen, MessageSquare, CheckSquare, Users,
  BarChart3, Settings, CalendarCheck, LogOut, ChevronRight
} from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (!p) { router.push('/login'); return }
      setProfile(p)
      setLoading(false)
    }
    load()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #1B4332, #2D6A4F)',
          margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ color: 'white', fontSize: '22px', fontWeight: '800', fontFamily: 'sans-serif' }}>M</span>
        </div>
        <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>Loading MamaVege HR...</p>
      </div>
    </div>
  )

  const role = profile?.role

  const employeeItems = [
    { href: '/employee/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
    { href: '/employee/attendance', label: 'Attendance', icon: <Clock size={15} /> },
    { href: '/employee/leave', label: 'Leave', icon: <CalendarDays size={15} /> },
    { href: '/employee/ot', label: 'Overtime', icon: <Timer size={15} /> },
    { href: '/employee/claims', label: 'Claims', icon: <Briefcase size={15} /> },
    { href: '/employee/payslip', label: 'Payslip', icon: <Wallet size={15} /> },
    { href: '/employee/documents', label: 'Documents', icon: <FolderOpen size={15} /> },
    { href: '/employee/suggestion', label: 'Suggestion Box', icon: <MessageSquare size={15} /> },
  ]

  const supervisorItems = [
    { href: '/supervisor/dashboard', label: 'Team Management', icon: <CheckSquare size={15} /> },
  ]

  const hrItems = [
    { href: '/hr/dashboard', label: 'HR Dashboard', icon: <BarChart3 size={15} /> },
    { href: '/hr/employees', label: 'Employees', icon: <Users size={15} /> },
    { href: '/hr/attendance', label: 'Attendance', icon: <Clock size={15} /> },
    { href: '/hr/leave', label: 'Leave', icon: <CalendarDays size={15} /> },
    { href: '/hr/ot', label: 'Overtime', icon: <Timer size={15} /> },
    { href: '/hr/claims', label: 'Claims', icon: <Briefcase size={15} /> },
    { href: '/hr/payroll', label: 'Payroll', icon: <Wallet size={15} /> },
    { href: '/hr/holidays', label: 'Holidays', icon: <CalendarCheck size={15} /> },
    { href: '/hr/settings', label: 'Settings', icon: <Settings size={15} /> },
  ]

  const directorItems = [
    { href: '/director/dashboard', label: 'Dashboard', icon: <BarChart3 size={15} /> },
    { href: '/director/suggestions', label: 'Suggestions', icon: <MessageSquare size={15} /> },
  ]

  const roleLabel: Record<string, string> = {
    employee: 'Employee',
    supervisor: 'Supervisor',
    hr: 'HR Manager',
    director: 'Director',
  }

  const roleColor: Record<string, string> = {
    employee: '#34D399',
    supervisor: '#60A5FA',
    hr: '#A78BFA',
    director: '#FBBF24',
  }

  const NavLink = ({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) => {
    const active = pathname === href
    return (
      <Link href={href} style={{
        display: 'flex', alignItems: 'center', gap: '9px',
        padding: '9px 12px', borderRadius: '9px', marginBottom: '1px',
        background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
        color: active ? 'white' : 'rgba(255,255,255,0.55)',
        textDecoration: 'none', fontSize: '13px',
        fontWeight: active ? '600' : '400',
        transition: 'all 0.15s',
      }}>
        <span style={{ opacity: active ? 1 : 0.7 }}>{icon}</span>
        {label}
        {active && <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.6 }} />}
      </Link>
    )
  }

  const SectionLabel = ({ label }: { label: string }) => (
    <p style={{
      fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.3)',
      textTransform: 'uppercase', letterSpacing: '0.1em',
      padding: '16px 12px 6px', margin: 0
    }}>
      {label}
    </p>
  )

  const initials = (profile?.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Sidebar */}
      <div style={{
        width: '232px', background: '#0F172A',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, height: '100vh',
        overflowY: 'auto', zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <img src="/logo.png" alt="MamaVege" style={{ width: '130px', height: 'auto', display: 'block', mixBlendMode: 'screen' }} />
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', margin: '6px 0 0', letterSpacing: '0.04em' }}>HR Management System</p>
        </div>

        {/* User */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
              background: 'linear-gradient(135deg, #1B4332, #52B788)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '12px', fontWeight: '700'
            }}>
              {initials}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ color: 'white', fontSize: '13px', fontWeight: '600', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile?.full_name || profile?.email}
              </p>
              <span style={{
                display: 'inline-block', fontSize: '10px', fontWeight: '700',
                color: roleColor[role] || '#94A3B8',
                background: `${roleColor[role]}20` || 'transparent',
                padding: '1px 7px', borderRadius: '20px', marginTop: '2px'
              }}>
                {roleLabel[role] || role}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '4px 8px' }}>
          {role === 'director' && (
            <>
              <SectionLabel label="Overview" />
              {directorItems.map(item => <NavLink key={item.href} {...item} />)}
            </>
          )}
          {role !== 'director' && (
            <>
              <SectionLabel label="My Work" />
              {employeeItems.map(item => <NavLink key={item.href} {...item} />)}
            </>
          )}
          {role === 'supervisor' && (
            <>
              <SectionLabel label="My Team" />
              {supervisorItems.map(item => <NavLink key={item.href} {...item} />)}
            </>
          )}
          {role === 'hr' && (
            <>
              <SectionLabel label="HR Management" />
              {hrItems.map(item => <NavLink key={item.href} {...item} />)}
            </>
          )}
        </nav>

        {/* Logout */}
        <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '9px 12px', borderRadius: '9px',
            border: 'none', background: 'transparent',
            color: 'rgba(255,255,255,0.4)', fontSize: '13px',
            cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: '9px',
            transition: 'all 0.15s',
          }}>
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, marginLeft: '232px', background: '#F8FAFC', minHeight: '100vh' }}>
        {children}
      </div>
    </div>
  )
}
