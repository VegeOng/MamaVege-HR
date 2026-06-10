'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Search, Plus, UserX, UserCheck } from 'lucide-react'
import { colors, radius, shadow, styles, font } from '@/lib/design'

const roleStyle: Record<string, { background: string; color: string }> = {
  hr:         { background: colors.infoBg,     color: colors.infoText },
  supervisor: { background: colors.warningBg,  color: colors.warningText },
  employee:   { background: colors.successBg,  color: colors.successText },
  director:   { background: colors.infoBg, color: colors.infoText },
  pending:    { background: colors.warningBg,  color: colors.warningText },
}

export default function HREmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [pending, setPending] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('all')
  const [tab, setTab] = useState<'active' | 'pending'>('active')
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [{ data }, { data: pend }] = await Promise.all([
      supabase.from('profiles').select('*').eq('is_active', true).neq('role', 'director').order('employee_id'),
      supabase.from('profiles').select('*').eq('role', 'pending').order('created_at', { ascending: false }),
    ])
    setEmployees(data || [])
    setPending(pend || [])
    setLoading(false)
  }

  async function handleDeactivate(id: string, name: string) {
    if (!confirm(`Deactivate ${name}?`)) return
    await fetch('/api/admin/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates: { is_active: false } }),
    })
    loadData()
  }

  const depts = ['all', ...Array.from(new Set(employees.map(e => e.department).filter(Boolean)))]
  const filtered = employees.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = !q || e.full_name?.toLowerCase().includes(q) || e.employee_id?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q)
    const matchDept = dept === 'all' || e.department === dept
    return matchSearch && matchDept
  })

  const initials = (name: string) => (name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ ...styles.pageTitle }}>Employees 员工管理</h1>
            <p style={{ ...styles.pageSubtitle }}>{filtered.length} active employee{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          <Link href="/hr/employees/new" style={{ ...styles.primaryButton, display: 'flex', alignItems: 'center', gap: '7px', textDecoration: 'none' }}>
            <Plus size={15} />Add Employee
          </Link>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {([
            { id: 'active', label: 'Active', icon: <UserCheck size={13} />, count: employees.length },
            { id: 'pending', label: 'Pending 待审核', icon: <UserX size={13} />, count: pending.length },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: radius.full, fontSize: font.sm, fontWeight: '600',
              border: 'none', cursor: 'pointer',
              background: tab === t.id ? colors.primary : 'white',
              color: tab === t.id ? 'white' : colors.textMuted,
              boxShadow: shadow.card,
            }}>
              {t.icon}{t.label}
              {t.count > 0 && (
                <span style={{
                  background: tab === t.id ? 'rgba(255,255,255,0.25)' : colors.warningBg,
                  color: tab === t.id ? 'white' : colors.warningText,
                  borderRadius: radius.full, padding: '1px 7px', fontSize: '11px', fontWeight: '700',
                }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'pending' ? (
          <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: colors.borderLight, borderBottom: `1px solid ${colors.border}` }}>
                  {['User', 'Email', 'Signed Up', ''].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '48px', color: colors.textMuted, fontSize: font.base }}>Loading...</td></tr>
                ) : pending.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '48px', color: colors.textMuted, fontSize: font.base }}>No accounts awaiting approval 🎉</td></tr>
                ) : pending.map((p) => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: radius.md, flexShrink: 0,
                          background: 'linear-gradient(135deg, #1B4332, #52B788)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontSize: '12px', fontWeight: '700'
                        }}>
                          {initials(p.full_name)}
                        </div>
                        <p style={{ margin: 0, fontSize: font.base, fontWeight: '600', color: colors.textPrimary }}>{p.full_name}</p>
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: font.sm, color: colors.textMuted }}>{p.email}</td>
                    <td style={{ padding: '13px 16px', fontSize: font.sm, color: colors.textMuted }}>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <Link href={`/hr/employees/${p.id}`} style={{
                        padding: '5px 12px', background: colors.primary, color: 'white',
                        borderRadius: radius.sm, fontSize: '12px', textDecoration: 'none', fontWeight: '600'
                      }}>Assign Role 分配角色</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
        <>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted, pointerEvents: 'none' }} />
            <input
              type="text" placeholder="Search name, ID or email..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...styles.input, paddingLeft: '34px', width: '100%' }}
            />
          </div>
          <select value={dept} onChange={e => setDept(e.target.value)} style={{ ...styles.input, width: 'auto' }}>
            {depts.map(d => <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>)}
          </select>
        </div>

        {/* Table */}
        <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: colors.borderLight, borderBottom: `1px solid ${colors.border}` }}>
                {['Employee', 'ID', 'Department / Position', 'Role', 'Shift', 'Basic Salary', ''].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: colors.textMuted, fontSize: font.base }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: colors.textMuted, fontSize: font.base }}>No employees found</td></tr>
              ) : filtered.map((e) => (
                <tr key={e.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: radius.md, flexShrink: 0,
                        background: 'linear-gradient(135deg, #1B4332, #52B788)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '12px', fontWeight: '700'
                      }}>
                        {initials(e.full_name)}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: font.base, fontWeight: '600', color: colors.textPrimary }}>{e.full_name}</p>
                        <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted }}>{e.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: font.sm, color: colors.textMuted, fontWeight: '500' }}>{e.employee_id}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <p style={{ margin: 0, fontSize: font.sm, color: colors.textPrimary }}>{e.department || '-'}</p>
                    {e.position && <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted }}>{e.position}</p>}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ ...(roleStyle[e.role] || { background: colors.borderLight, color: colors.textMuted }), padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'capitalize' }}>
                      {e.role}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: font.sm, color: colors.textSecondary }}>Shift {e.shift || '-'}</td>
                  <td style={{ padding: '13px 16px', fontSize: font.sm, color: colors.textPrimary, fontWeight: '600' }}>
                    {e.basic_salary ? `RM ${parseFloat(e.basic_salary).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Link href={`/hr/employees/${e.id}`} style={{
                        padding: '5px 12px', background: colors.infoBg, color: colors.infoText,
                        borderRadius: radius.sm, fontSize: '12px', textDecoration: 'none', fontWeight: '600'
                      }}>Edit</Link>
                      <button onClick={() => handleDeactivate(e.id, e.full_name)} style={{
                        padding: '5px 12px', background: colors.dangerBg, color: colors.dangerText,
                        border: 'none', borderRadius: radius.sm, fontSize: '12px', cursor: 'pointer', fontWeight: '600',
                        display: 'flex', alignItems: 'center', gap: '4px'
                      }}>
                        <UserX size={11} />Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}
      </div>
    </div>
  )
}
