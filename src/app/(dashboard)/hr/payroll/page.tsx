'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Wallet, Banknote, Search } from 'lucide-react'
import { colors, radius, shadow, styles, font } from '@/lib/design'

export default function HRPayrollPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [rates, setRates] = useState({ epf: 11, socso: 0.5, eis: 0.2 })
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const supabase = createClient()

  useEffect(() => { loadData() }, [month])

  async function loadData() {
    setLoading(true)
    const [empRes, settingsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, employee_id, department, position, basic_salary, bank_account, bank_name')
        .eq('is_active', true).neq('role', 'director').order('employee_id'),
      supabase.from('company_settings').select('key, value').in('key', ['epf_employee_rate', 'socso_employee_rate', 'eis_rate']),
    ])
    setEmployees(empRes.data || [])
    const s: any = {}
    for (const row of settingsRes.data || []) s[row.key] = parseFloat(row.value)
    setRates({
      epf: s.epf_employee_rate ?? 11,
      socso: s.socso_employee_rate ?? 0.5,
      eis: s.eis_rate ?? 0.2,
    })
    setLoading(false)
  }

  function calc(salary: number) {
    const epf = salary * (rates.epf / 100)
    const socso = Math.min(salary, 4000) * (rates.socso / 100)
    const eis = Math.min(salary, 4000) * (rates.eis / 100)
    const deductions = epf + socso + eis
    return { epf, socso, eis, deductions, net: salary - deductions }
  }

  const filtered = employees.filter(e =>
    !search ||
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  )

  const totalSalary = filtered.reduce((sum, e) => sum + (e.basic_salary || 0), 0)
  const totalDeductions = filtered.reduce((sum, e) => sum + calc(e.basic_salary || 0).deductions, 0)
  const totalNet = totalSalary - totalDeductions

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })

  return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ ...styles.pageTitle }}>Payroll 薪资管理</h1>
            <p style={{ ...styles.pageSubtitle }}>Monthly payroll summary — {monthLabel}</p>
          </div>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ ...styles.input, width: 'auto' }} />
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
          <div style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: radius.md, background: colors.infoBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} color={colors.infoText} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: colors.textPrimary, letterSpacing: '-0.5px' }}>{filtered.length}</p>
              <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Employees</p>
            </div>
          </div>
          <div style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: radius.md, background: colors.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={20} color={colors.successText} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: colors.textPrimary, letterSpacing: '-0.5px' }}>RM {totalSalary.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
              <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Basic Salary</p>
            </div>
          </div>
          <div style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: radius.md, background: colors.warningBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Banknote size={20} color={colors.warningText} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: colors.textPrimary, letterSpacing: '-0.5px' }}>RM {totalNet.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
              <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Net Pay</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '14px', maxWidth: '320px' }}>
          <Search size={15} color={colors.textMuted} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, ID, department..."
            style={{ ...styles.input, paddingLeft: '38px' }} />
        </div>

        {/* Table */}
        <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: colors.pageBg, borderBottom: `1px solid ${colors.borderLight}` }}>
                  {['Employee', 'Department', 'Basic Salary', `EPF (${rates.epf}%)`, `SOCSO (${rates.socso}%)`, `EIS (${rates.eis}%)`, 'Net Pay', 'Bank'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: colors.textMuted }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: colors.textMuted }}>No employees found</td></tr>
                ) : filtered.map(e => {
                  const c = calc(e.basic_salary || 0)
                  return (
                    <tr key={e.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ fontSize: font.base, fontWeight: '700', color: colors.textPrimary, margin: '0 0 2px' }}>{e.full_name}</p>
                        <p style={{ fontSize: font.xs, color: colors.textMuted, margin: 0 }}>{e.employee_id} · {e.position || '-'}</p>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: font.sm, color: colors.textSecondary }}>{e.department || '-'}</td>
                      <td style={{ padding: '12px 16px', fontSize: font.sm, fontWeight: '700', color: colors.textPrimary }}>RM {(e.basic_salary || 0).toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', fontSize: font.sm, color: colors.dangerText }}>- {c.epf.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', fontSize: font.sm, color: colors.dangerText }}>- {c.socso.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', fontSize: font.sm, color: colors.dangerText }}>- {c.eis.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', fontSize: font.sm, fontWeight: '800', color: colors.successText }}>RM {c.net.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', fontSize: font.sm, color: colors.textSecondary }}>
                        {e.bank_name || '-'}<br />
                        <span style={{ fontSize: font.xs, color: colors.textMuted }}>{e.bank_account || '-'}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {!loading && filtered.length > 0 && (
                <tfoot>
                  <tr style={{ background: colors.pageBg, borderTop: `2px solid ${colors.border}` }}>
                    <td colSpan={2} style={{ padding: '12px 16px', fontSize: font.sm, fontWeight: '800', color: colors.textPrimary }}>Total</td>
                    <td style={{ padding: '12px 16px', fontSize: font.sm, fontWeight: '800', color: colors.textPrimary }}>RM {totalSalary.toFixed(2)}</td>
                    <td colSpan={3} style={{ padding: '12px 16px', fontSize: font.sm, fontWeight: '800', color: colors.dangerText }}>- {totalDeductions.toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', fontSize: font.sm, fontWeight: '800', color: colors.successText }}>RM {totalNet.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <p style={{ fontSize: font.xs, color: colors.textMuted, marginTop: '12px' }}>
          * Statutory rates (EPF/SOCSO/EIS) follow the values configured in HR Settings → Payroll Rates.
        </p>
      </div>
    </div>
  )
}
