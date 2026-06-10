'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Printer, Download } from 'lucide-react'
import { colors, styles } from '@/lib/design'

function rm(n: number) { return 'RM ' + n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default function EmployeePayslipPage() {
  const [profile, setProfile] = useState<any>(null)
  const [rates, setRates] = useState({ epf: 11, socso: 0.5, eis: 0.2 })
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
    const [{ data: profileData }, { data: settings }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('company_settings').select('key,value').in('key', ['epf_employee_rate', 'socso_employee_rate', 'eis_rate']),
    ])
    setProfile(profileData)
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
  const netSalary = salary - totalDeductions
  const [year, month] = selectedMonth.split('-').map(Number)
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })

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
                <div style={{ marginTop: '12px', padding: '12px 14px', background: colors.successBg, borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: colors.successText }}>Total Earnings</span>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: colors.successText }}>{rm(salary)}</span>
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
                <p style={{ margin: 0, fontSize: '12px', color: '#4ADE80' }}>{rm(salary)} − {rm(totalDeductions)}</p>
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
