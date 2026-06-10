'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Users, CheckCircle2, Clock, CalendarDays, Briefcase, Timer, Wallet, ArrowRight, PartyPopper } from 'lucide-react'
import { colors, radius, shadow, styles, font } from '@/lib/design'

export default function HRDashboard() {
  const [stats, setStats] = useState({ employees: 0, present: 0, late: 0, leaves: 0, claims: 0, ot: 0 })
  const [payroll, setPayroll] = useState(0)
  const [leaves, setLeaves] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const [a, b, c, d, e, f, g, h] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true).neq('role', 'director'),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'present'),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'late'),
        supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('claims').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('ot_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('profiles').select('basic_salary').eq('is_active', true).neq('role', 'director'),
        supabase.from('leave_requests').select('*, profiles(full_name, employee_id)').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
      ])
      setStats({ employees: a.count || 0, present: b.count || 0, late: c.count || 0, leaves: d.count || 0, claims: e.count || 0, ot: f.count || 0 })
      setPayroll((g.data || []).reduce((s: number, x: any) => s + (x.basic_salary || 0), 0))
      setLeaves(h.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const cards = [
    { label: 'Total Employees', value: stats.employees, icon: <Users size={18} />, gradient: colors.gradients.blue, link: '/hr/employees' },
    { label: 'Present Today', value: stats.present, icon: <CheckCircle2 size={18} />, gradient: colors.gradients.green, link: '/hr/attendance' },
    { label: 'Late Today', value: stats.late, icon: <Clock size={18} />, gradient: colors.gradients.orange, link: '/hr/attendance' },
    { label: 'Pending Leaves', value: stats.leaves, icon: <CalendarDays size={18} />, gradient: colors.gradients.purple, link: '/hr/leave' },
    { label: 'Pending Claims', value: stats.claims, icon: <Briefcase size={18} />, gradient: colors.gradients.pink, link: '/hr/claims' },
    { label: 'Pending OT', value: stats.ot, icon: <Timer size={18} />, gradient: colors.gradients.teal, link: '/hr/ot' },
  ]

  const today = new Date()

  return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ ...styles.pageTitle }}>HR Dashboard</h1>
          <p style={{ ...styles.pageSubtitle }}>{today.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {cards.map(c => (
            <Link key={c.label} href={c.link} style={{ textDecoration: 'none' }}>
              <div style={{ ...styles.card, transition: 'box-shadow 0.15s', cursor: 'pointer' }}>
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
            </Link>
          ))}
        </div>

        {/* Payroll + Pending Leaves */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '14px' }}>
          {/* Payroll card */}
          <div style={{
            borderRadius: radius.lg, padding: '24px',
            background: colors.gradients.green, boxShadow: shadow.banner,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
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
              marginTop: '20px', display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: font.sm, color: 'white', textDecoration: 'none', fontWeight: '700',
              background: 'rgba(255,255,255,0.12)', padding: '10px 16px', borderRadius: radius.md, width: 'fit-content',
            }}>
              Manage Payroll <ArrowRight size={14} />
            </Link>
          </div>

          {/* Pending leaves */}
          <div style={{ ...styles.card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: font.lg, fontWeight: '700', color: colors.textPrimary }}>Pending Leave Requests</p>
              <Link href="/hr/leave" style={{ fontSize: font.xs, color: colors.primary, textDecoration: 'none', fontWeight: '700' }}>View all →</Link>
            </div>
            {leaves.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
                <PartyPopper size={28} color={colors.textMuted} style={{ marginBottom: '8px' }} />
                <p style={{ margin: 0, color: colors.textMuted, fontSize: font.base }}>No pending requests</p>
              </div>
            ) : (
              <div style={{ padding: '8px' }}>
                {leaves.map(l => (
                  <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: radius.md, marginBottom: '2px' }}>
                    <div>
                      <p style={{ fontSize: font.base, fontWeight: '700', color: colors.textPrimary, margin: '0 0 2px' }}>{l.profiles?.full_name}</p>
                      <p style={{ fontSize: font.xs, color: colors.textMuted, margin: 0, textTransform: 'capitalize' }}>{l.leave_type} leave · {new Date(l.start_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: radius.full,
                      background: colors.warningBg, color: colors.warningText,
                    }}>Pending</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
