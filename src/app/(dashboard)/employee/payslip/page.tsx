'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Printer, Download } from 'lucide-react'
import { colors, radius, styles } from '@/lib/design'

function rm(n: number) { return 'RM ' + n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

const MEDICAL_ID = 'd543eca8-7754-4378-a3e2-e7a9541358e3'

export default function EmployeePayslipPage() {
  const [profile, setProfile] = useState<any>(null)
  const [rates, setRates] = useState({ epf: 11, socso: 0.5, eis: 0.2 })
  const [leaveBalances, setLeaveBalances] = useState<any[]>([])
  const [claims, setClaims] = useState<any[]>([])
  const [claimLimits, setClaimLimits] = useState<any[]>([])
  const [otRequests, setOtRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
  })
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: profileData }, { data: settings }, { data: leaveBal }, { data: claimsData }, { data: limits }, { data: otData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('company_settings').select('key,value').in('key', ['epf_employee_rate', 'socso_employee_rate', 'eis_rate']),
      supabase.from('leave_entitlements').select('*, leave_type:leave_types(name, code)').eq('employee_id', user.id).eq('year', new Date().getFullYear()),
      supabase.from('claims').select('*, claim_type:claim_types(name, code)').eq('employee_id', user.id),
      supabase.from('claim_limits').select('*').eq('employee_id', user.id),
      supabase.from('ot_requests').select('*').eq('employee_id', user.id).eq('status', 'approved'),
    ])
    setProfile(profileData)
    setLeaveBalances(leaveBal || [])
    setClaims(claimsData || [])
    setClaimLimits(limits || [])
    setOtRequests(otData || [])
    if (settings) {
      const s: Record<string, string> = Object.fromEntries(settings.map((r: any) => [r.key, r.value]))
      setRates({
        epf: parseFloat(s.epf_employee_rate ?? '11'),
        socso: parseFloat(s.socso_employee_rate ?? '0.5'),
        eis: parseFloat(s.eis_rate ?? '0.2'),
      })
    }
    setLoading(false)
  }

  async function handleDownload() {
    setDownloading(true)
    const html2pdf = (await import('html2pdf.js')).default
    const element = document.getElementById('payslip-print')!
    const filename = `Payslip_${profile?.employee_id || 'employee'}_${selectedMonth}.pdf`
    await html2pdf().set({
      margin: 0,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(element).save()
    setDownloading(false)
  }

  if (loading) return <div style={{ padding: '32px', color: colors.textMuted }}>Loading...</div>

  const salary = parseFloat(profile?.basic_salary || '0') || 0
  const epf = Math.round(salary * (rates.epf / 100) * 100) / 100
  const socso = Math.round(Math.min(salary, 4000) * (rates.socso / 100) * 100) / 100
  const eis = Math.round(Math.min(salary, 4000) * (rates.eis / 100) * 100) / 100
  const pcb = 0
  const totalDeductions = epf + socso + eis + pcb
  const [year, month] = selectedMonth.split('-').map(Number)
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })

  // Approved OT for the selected month (OT is excluded from EPF/SOCSO/EIS wage base)
  const monthOt = otRequests.filter(r => {
    const d = new Date(r.date + 'T00:00:00')
    return d.getFullYear() === year && d.getMonth() + 1 === month
  })
  const otHours = monthOt.reduce((s, r) => s + (r.total_hours || 0), 0)
  const otPay = monthOt.reduce((s, r) => s + parseFloat(r.ot_pay || 0), 0)

  const totalEarnings = salary + otPay
  const netSalary = totalEarnings - totalDeductions

  // Leave balances (current year)
  const leaveRows = leaveBalances
    .filter(b => b.leave_type?.code !== 'PH')
    .map(b => ({
      name: b.leave_type?.name,
      remaining: ((b.entitled_hours || 0) + (b.carried_forward_hours || 0) - (b.used_hours || 0)) / 8,
    }))

  // Medical claim yearly balance
  const medicalLimit = claimLimits.find(l => l.claim_type_id === MEDICAL_ID)?.monthly_limit
  const medicalUsed = claims
    .filter(c => c.claim_type_id === MEDICAL_ID && c.status !== 'rejected' && c.year === year)
    .reduce((s, c) => s + parseFloat(c.amount || 0), 0)
  const medicalRemaining = medicalLimit !== undefined ? Math.max(0, medicalLimit - medicalUsed) : null

  // Claims submitted in the selected month
  const monthClaims = claims.filter(c => c.month === month && c.year === year)

  const DeductRow = ({ label, value }: { label: string; value: number }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${colors.borderLight}` }}>
      <span style={{ fontSize: '14px', color: colors.textSecondary }}>{label}</span>
      <span style={{ fontSize: '14px', color: colors.danger, fontWeight: '500' }}>{rm(value)}</span>
    </div>
  )

  return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ ...styles.pageTitle }}>Payslip 薪資單</h1>
            <p style={{ ...styles.pageSubtitle }}>Your monthly salary statement</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
              style={{ ...styles.input, width: 'auto', fontSize: '13px' }} />
            <button onClick={handleDownload} disabled={downloading}
              style={{ ...styles.primaryButton, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', opacity: downloading ? 0.6 : 1 }}>
              <Download size={14} />{downloading ? 'Generating...' : 'Download PDF'}
            </button>
            <button onClick={() => window.print()}
              style={{ ...styles.outlineButton, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              <Printer size={14} />Print
            </button>
          </div>
        </div>

        <div id="payslip-print" style={{ ...styles.card, overflow: 'hidden', padding: 0 }}>

          {/* Banner */}
          <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1B4332 100%)', padding: '28px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                  Mama Global International Sdn Bhd (1247551-X)
                </p>
                <p style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
                  {profile?.full_name || '-'}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', margin: 0 }}>
                  {profile?.employee_id}{profile?.position ? ` · ${profile.position}` : ''}{profile?.department ? ` · ${profile.department}` : ''}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>Pay Period</p>
                <p style={{ color: 'white', fontSize: '18px', fontWeight: '700', margin: 0 }}>{monthLabel}</p>
              </div>
            </div>
            <div style={{ marginTop: '20px', padding: '16px 20px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Net Take-Home Pay</p>
                <p style={{ color: 'white', fontSize: '30px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>{rm(netSalary)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Basic Salary</p>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '18px', fontWeight: '700', margin: 0 }}>{rm(salary)}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '28px 32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              <div>
                <p style={{ margin: '0 0 14px', fontSize: '11px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Earnings</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${colors.borderLight}` }}>
                  <span style={{ fontSize: '14px', color: colors.textSecondary }}>Basic Salary</span>
                  <span style={{ fontSize: '14px', color: colors.textPrimary, fontWeight: '700' }}>{rm(salary)}</span>
                </div>
                {otPay > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${colors.borderLight}` }}>
                    <span style={{ fontSize: '14px', color: colors.textSecondary }}>Overtime ({otHours.toFixed(1)}h)</span>
                    <span style={{ fontSize: '14px', color: colors.textPrimary, fontWeight: '700' }}>{rm(otPay)}</span>
                  </div>
                )}
                <div style={{ marginTop: '12px', padding: '12px 14px', background: colors.successBg, borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: colors.successText }}>Total Earnings</span>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: colors.successText }}>{rm(totalEarnings)}</span>
                </div>
              </div>
              <div>
                <p style={{ margin: '0 0 14px', fontSize: '11px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Deductions</p>
                <DeductRow label={`EPF (${rates.epf}%)`} value={epf} />
                <DeductRow label={`SOCSO (${rates.socso}%)`} value={socso} />
                <DeductRow label={`EIS (${rates.eis}%)`} value={eis} />
                <DeductRow label="PCB / Income Tax" value={pcb} />
                <div style={{ marginTop: '12px', padding: '12px 14px', background: colors.dangerBg, borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: colors.dangerText }}>Total Deductions</span>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: colors.dangerText }}>{rm(totalDeductions)}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', padding: '20px 24px', background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', borderRadius: '14px', border: '1px solid #BBF7D0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: '700', color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Net Pay (Take-Home)</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#4ADE80' }}>{rm(totalEarnings)} − {rm(totalDeductions)}</p>
              </div>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#15803D', letterSpacing: '-0.5px' }}>{rm(netSalary)}</p>
            </div>

            <div style={{ marginTop: '20px', padding: '16px 20px', background: colors.borderLight, borderRadius: '12px' }}>
              <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Statutory References</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { label: 'EPF No.', value: profile?.epf_number },
                  { label: 'SOCSO No.', value: profile?.socso_number },
                  { label: 'Tax (PCB) No.', value: profile?.tax_number },
                ].map(item => (
                  <div key={item.label}>
                    <p style={{ margin: '0 0 2px', fontSize: '10px', color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' }}>{item.label}</p>
                    <p style={{ margin: 0, fontSize: '13px', color: colors.textPrimary, fontWeight: '600' }}>{item.value || '-'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Leave Balance & Medical Claim Balance */}
            <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: medicalRemaining !== null ? '1fr 1fr' : '1fr', gap: '16px' }}>
              {leaveRows.length > 0 && (
                <div style={{ padding: '16px 20px', background: colors.borderLight, borderRadius: '12px' }}>
                  <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Leave Balance 假期余额 ({year})</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px' }}>
                    {leaveRows.map(r => (
                      <div key={r.name}>
                        <p style={{ margin: '0 0 2px', fontSize: '10px', color: colors.textMuted, fontWeight: '600' }}>{r.name}</p>
                        <p style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: colors.textPrimary }}>
                          {r.remaining % 1 === 0 ? r.remaining.toFixed(0) : r.remaining.toFixed(1)} <span style={{ fontSize: '10px', fontWeight: '600', color: colors.textMuted }}>days</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {medicalRemaining !== null && (
                <div style={{ padding: '16px 20px', background: colors.borderLight, borderRadius: '12px' }}>
                  <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Medical Claim Balance 医药报销余额 ({year})</p>
                  <p style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: '800', color: colors.textPrimary }}>{rm(medicalRemaining)} <span style={{ fontSize: '10px', fontWeight: '600', color: colors.textMuted }}>remaining</span></p>
                  <p style={{ margin: 0, fontSize: '11px', color: colors.textMuted }}>Used {rm(medicalUsed)} of {rm(medicalLimit)} yearly limit</p>
                </div>
              )}
            </div>

            {/* Claims Submitted This Month */}
            <div style={{ marginTop: '20px', padding: '16px 20px', background: colors.borderLight, borderRadius: '12px' }}>
              <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Claims Submitted 本月报销 — {monthLabel}</p>
              {monthClaims.length === 0 ? (
                <p style={{ margin: 0, fontSize: '13px', color: colors.textMuted }}>No claims submitted this month.</p>
              ) : (
                <div>
                  {monthClaims.map((c, i) => {
                    const s = styles.statusBadge(c.status)
                    return (
                      <div key={c.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 0', borderBottom: i < monthClaims.length - 1 ? `1px solid ${colors.border}` : 'none',
                      }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: colors.textPrimary }}>{c.claim_type?.name || '-'}</p>
                          {c.description && <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.textMuted }}>{c.description}</p>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: colors.textPrimary }}>{rm(parseFloat(c.amount || 0))}</span>
                          <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 9px', borderRadius: radius.full, background: s.bg, color: s.color, textTransform: 'capitalize' }}>{s.label}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 32px', borderTop: `1px solid ${colors.border}`, background: colors.borderLight, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '32px' }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: '10px', color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' }}>Bank</p>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: colors.textPrimary }}>{profile?.bank_name || '-'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: '10px', color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' }}>Account No.</p>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: colors.textPrimary }}>{profile?.bank_account || '-'}</p>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: colors.textMuted }}>Computer-generated · {monthLabel}</p>
          </div>
        </div>

        {salary === 0 && (
          <div style={{ marginTop: '16px', padding: '14px 18px', background: colors.warningBg, borderRadius: '10px', border: '1px solid #FDE68A' }}>
            <p style={{ margin: 0, fontSize: '13px', color: colors.warningText }}>
              Basic salary not configured. Please contact HR to update your profile.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body > * { visibility: hidden !important; }
          #payslip-print, #payslip-print * { visibility: visible !important; }
          #payslip-print { position: fixed; top: 0; left: 0; width: 100%; box-shadow: none !important; }
        }
      `}</style>
    </div>
  )
}
