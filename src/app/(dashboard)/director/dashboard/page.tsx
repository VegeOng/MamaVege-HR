'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Users, CheckCircle2, XCircle, CalendarDays, Wallet, MessageSquare, ArrowRight, Sparkles, FileBarChart } from 'lucide-react'
import { colors, radius, shadow, styles, font } from '@/lib/design'

export default function DirectorDashboard() {
  const [stats, setStats] = useState({ employees: 0, present: 0, absent: 0, pendingLeaves: 0 })
  const [payroll, setPayroll] = useState(0)
  const [suggestions, setSuggestions] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const [{ count: emp }, { count: present }, { count: absent }, { count: leaves }, salaryRes, { count: sugg }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true).neq('role', 'director'),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).in('status', ['present', 'late']),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'absent'),
        supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('profiles').select('basic_salary').eq('is_active', true),
        supabase.from('suggestions').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      ])
      setStats({ employees: emp || 0, present: present || 0, absent: absent || 0, pendingLeaves: leaves || 0 })
      setPayroll((salaryRes.data || []).reduce((s: number, x: any) => s + (x.basic_salary || 0), 0))
      setSuggestions(sugg || 0)
      setLoading(false)
    }
    load()
  }, [])

  const cards = [
    { label: 'Total Employees', value: stats.employees, icon: <Users size={18} />, gradient: colors.gradients.blue },
    { label: 'Present Today', value: stats.present, icon: <CheckCircle2 size={18} />, gradient: colors.gradients.green },
    { label: 'Absent Today', value: stats.absent, icon: <XCircle size={18} />, gradient: colors.gradients.orange },
    { label: 'Pending Leaves', value: stats.pendingLeaves, icon: <CalendarDays size={18} />, gradient: colors.gradients.purple },
  ]

  const quickLinks = [
    { label: 'Employees 员工', desc: 'View employee directory', href: '/hr/employees', icon: <Users size={18} />, gradient: colors.gradients.indigo },
    { label: 'Payroll 薪资', desc: 'Review monthly payroll', href: '/hr/payroll', icon: <Wallet size={18} />, gradient: colors.gradients.teal },
    { label: 'Reports 报表', desc: 'Company-wide insights', href: '/director/reports', icon: <FileBarChart size={18} />, gradient: colors.gradients.blue },
    { label: 'Suggestions 建议箱', desc: `${suggestions} new suggestion${suggestions === 1 ? '' : 's'}`, href: '/director/suggestions', icon: <MessageSquare size={18} />, gradient: colors.gradients.pink },
  ]

  return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ ...styles.pageTitle }}>Director Dashboard</h1>
          <p style={{ ...styles.pageSubtitle }}>{new Date().toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {cards.map(c => (
            <div key={c.label} style={{ ...styles.card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <span style={{ fontSize: font.xs, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</span>
                <div style={{
                  width: '36px', height: '36px', borderRadius: radius.md, background: c.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0,
                }}>
                  {c.icon}
                </div>
              </div>
              <p style={{ fontSize: '32px', fontWeight: '800', color: colors.textPrimary, margin: 0, letterSpacing: '-1px' }}>
                {loading ? '-' : c.value}
              </p>
            </div>
          ))}
        </div>

        {/* Payroll banner */}
        <div style={{
          borderRadius: radius.lg, padding: '24px', marginBottom: '20px',
          background: colors.gradients.green, boxShadow: shadow.banner,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: radius.md, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={16} color="white" />
              </div>
              <span style={{ fontSize: font.sm, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>This Month Payroll 本月薪资</span>
            </div>
            <p style={{ fontSize: '32px', fontWeight: '800', color: 'white', margin: '0 0 4px', letterSpacing: '-1px' }}>
              RM {payroll.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
            </p>
            <p style={{ fontSize: font.sm, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Total basic salary across {stats.employees} active employees</p>
          </div>
          <Link href="/hr/payroll" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontSize: font.sm, color: 'white', textDecoration: 'none', fontWeight: '700',
            background: 'rgba(255,255,255,0.12)', padding: '10px 16px', borderRadius: radius.md,
          }}>
            View Payroll <ArrowRight size={14} />
          </Link>
        </div>

        {/* Quick links */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {quickLinks.map(q => (
            <Link key={q.label} href={q.href} style={{ textDecoration: 'none' }}>
              <div style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: radius.md, background: q.gradient, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                }}>
                  {q.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', fontSize: font.base, fontWeight: '700', color: colors.textPrimary }}>{q.label}</p>
                  <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted }}>{q.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Welcome banner */}
        <div style={{
          borderRadius: radius.lg, padding: '20px 24px',
          background: colors.sidebarBg, display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <div style={{ width: '40px', height: '40px', borderRadius: radius.md, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={18} color="#52B788" />
          </div>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: font.base, fontWeight: '700', color: 'white' }}>All data is real-time</p>
            <p style={{ margin: 0, fontSize: font.xs, color: 'rgba(255,255,255,0.5)' }}>Check the Suggestion Box for employee feedback and the Reports page for company-wide insights.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
