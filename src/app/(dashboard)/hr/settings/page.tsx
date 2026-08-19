'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, ChevronDown, ChevronUp, Percent, MapPin, LocateFixed } from 'lucide-react'
import { colors, radius, shadow, styles, font } from '@/lib/design'

const CLAIM_TYPES = [
  { id: '55188c14-0a0c-482f-b6d8-c99754b05379', name: 'Petrol / Toll', period: 'Monthly' },
  { id: '7ea28c7c-2d5a-4265-a2d1-163d08567508', name: 'Meal', period: 'Monthly' },
  { id: 'd543eca8-7754-4378-a3e2-e7a9541358e3', name: 'Medical', period: 'Yearly (max RM100/claim)' },
  { id: '1cd2ff61-0748-44b6-8230-66bad0e0ea96', name: 'Hotel', period: 'Monthly' },
]

type Tab = 'profile' | 'claims' | 'payroll' | 'attendance'

export default function HRSettingsPage() {
  const [tab, setTab] = useState<Tab>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  // Claims limits
  const [employees, setEmployees] = useState<any[]>([])
  const [limits, setLimits] = useState<Record<string, Record<string, string>>>({})
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null)
  const [savingLimits, setSavingLimits] = useState(false)

  // Payroll rates
  const [epfRate, setEpfRate] = useState('11')
  const [socsoRate, setSocsoRate] = useState('0.5')
  const [eisRate, setEisRate] = useState('0.2')
  const [savingRates, setSavingRates] = useState(false)

  // Office location (geofencing)
  const [officeLat, setOfficeLat] = useState('')
  const [officeLng, setOfficeLng] = useState('')
  const [officeRadius, setOfficeRadius] = useState('200')
  const [savingLocation, setSavingLocation] = useState(false)
  const [locating, setLocating] = useState(false)

  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setFullName(profile?.full_name || '')
    setPhone(profile?.phone || '')
    setEmployeeId(profile?.employee_id || '')

    const [empRes, limitsRes, ratesRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, employee_id, department').eq('is_active', true).neq('role', 'director').order('full_name'),
      supabase.from('claim_limits').select('*'),
      supabase.from('company_settings').select('key,value').in('key', ['epf_employee_rate', 'socso_employee_rate', 'eis_rate', 'office_lat', 'office_lng', 'office_radius_m']),
    ])
    setEmployees(empRes.data || [])

    const limitsMap: Record<string, Record<string, string>> = {}
    for (const l of limitsRes.data || []) {
      if (!limitsMap[l.employee_id]) limitsMap[l.employee_id] = {}
      limitsMap[l.employee_id][l.claim_type_id] = l.monthly_limit?.toString() || ''
    }
    setLimits(limitsMap)

    if (ratesRes.data) {
      const s: Record<string, string> = Object.fromEntries(ratesRes.data.map((r: any) => [r.key, r.value]))
      if (s.epf_employee_rate) setEpfRate(s.epf_employee_rate)
      if (s.socso_employee_rate) setSocsoRate(s.socso_employee_rate)
      if (s.eis_rate) setEisRate(s.eis_rate)
      if (s.office_lat) setOfficeLat(s.office_lat)
      if (s.office_lng) setOfficeLng(s.office_lng)
      if (s.office_radius_m) setOfficeRadius(s.office_radius_m)
    }
    setLoading(false)
  }

  async function handleSaveProfile() {
    setSaving(true); setMsg(null)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user!.id)
    setMsg({ type: 'success', text: 'Profile updated!' })
    setSaving(false)
  }

  async function handlePassword() {
    if (newPw !== confirmPw) { setMsg({ type: 'error', text: 'Passwords do not match.' }); return }
    if (newPw.length < 6) { setMsg({ type: 'error', text: 'Min 6 characters.' }); return }
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) setMsg({ type: 'error', text: error.message })
    else { setMsg({ type: 'success', text: 'Password updated!' }); setNewPw(''); setConfirmPw('') }
  }

  async function handleSaveLimits(empId: string) {
    setSavingLimits(true)
    const empLimits = limits[empId] || {}
    const upserts = CLAIM_TYPES.map(ct => ({
      employee_id: empId,
      claim_type_id: ct.id,
      monthly_limit: parseFloat(empLimits[ct.id] || '0') || 0,
    }))
    await supabase.from('claim_limits').upsert(upserts, { onConflict: 'employee_id,claim_type_id' })
    setMsg({ type: 'success', text: 'Limits saved!' })
    setSavingLimits(false)
    setTimeout(() => setMsg(null), 3000)
  }

  const setLimit = (empId: string, typeId: string, val: string) => {
    setLimits(prev => ({ ...prev, [empId]: { ...(prev[empId] || {}), [typeId]: val } }))
  }

  async function handleSaveRates() {
    setSavingRates(true); setMsg(null)
    const upserts = [
      { key: 'epf_employee_rate', value: epfRate, description: 'EPF employee contribution %' },
      { key: 'socso_employee_rate', value: socsoRate, description: 'SOCSO employee contribution %' },
      { key: 'eis_rate', value: eisRate, description: 'EIS contribution % each' },
    ]
    const { error } = await supabase.from('company_settings').upsert(upserts, { onConflict: 'key' })
    if (error) setMsg({ type: 'error', text: error.message })
    else setMsg({ type: 'success', text: 'Payroll rates saved!' })
    setSavingRates(false)
    setTimeout(() => setMsg(null), 3000)
  }

  function handleLocateMe() {
    if (!navigator.geolocation) { setMsg({ type: 'error', text: 'This browser does not support geolocation.' }); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setOfficeLat(pos.coords.latitude.toFixed(6))
        setOfficeLng(pos.coords.longitude.toFixed(6))
        setLocating(false)
      },
      err => { setMsg({ type: 'error', text: `Could not get location: ${err.message}` }); setLocating(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleSaveLocation() {
    setSavingLocation(true); setMsg(null)
    const upserts = [
      { key: 'office_lat', value: officeLat, description: 'Office latitude for clock-in geofencing' },
      { key: 'office_lng', value: officeLng, description: 'Office longitude for clock-in geofencing' },
      { key: 'office_radius_m', value: officeRadius, description: 'Allowed clock-in radius from office, in meters' },
    ]
    const { error } = await supabase.from('company_settings').upsert(upserts, { onConflict: 'key' })
    if (error) setMsg({ type: 'error', text: error.message })
    else setMsg({ type: 'success', text: 'Office location saved! WiFi-method employees must now be within range to clock in.' })
    setSavingLocation(false)
    setTimeout(() => setMsg(null), 4000)
  }

  if (loading) return <div style={{ padding: '32px', color: colors.textMuted }}>Loading...</div>

  return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ ...styles.pageTitle }}>Settings 设置</h1>
          <p style={{ ...styles.pageSubtitle }}>Manage your account and system settings</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: `2px solid ${colors.border}`, marginBottom: '24px' }}>
          {([['profile', 'My Profile'], ['claims', 'Claims Limits 报销额度'], ['payroll', 'Payroll Rates 薪资费率'], ['attendance', 'Attendance 考勤设置']] as [Tab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '10px 18px', fontSize: font.base, fontWeight: tab === id ? '700' : '400',
              color: tab === id ? colors.primary : colors.textMuted,
              borderBottom: `2px solid ${tab === id ? colors.primary : 'transparent'}`,
              marginBottom: '-2px', background: 'none', border: 'none', cursor: 'pointer',
            }}>{label}</button>
          ))}
        </div>

        {/* Message */}
        {msg && (
          <div style={{
            background: msg.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${msg.type === 'success' ? '#6EE7B7' : '#FECACA'}`,
            borderRadius: radius.md, padding: '12px 16px', marginBottom: '16px',
            fontSize: font.base, color: msg.type === 'success' ? '#065F46' : '#991B1B', fontWeight: '500'
          }}>{msg.text}</div>
        )}

        {/* Profile Tab */}
        {tab === 'profile' && (
          <>
            <div style={{ ...styles.card, marginBottom: '16px' }}>
              <h2 style={{ fontSize: font.lg, fontWeight: '700', color: colors.textPrimary, margin: '0 0 20px' }}>Profile Information</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                {[
                  { label: 'Full Name', value: fullName, setter: setFullName, disabled: false },
                  { label: 'Phone', value: phone, setter: setPhone, disabled: false },
                  { label: 'Employee ID', value: employeeId, setter: () => {}, disabled: true },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ display: 'block', fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{f.label}</label>
                    <input value={f.value} onChange={e => f.setter(e.target.value)} disabled={f.disabled}
                      style={{ ...styles.input, background: f.disabled ? colors.borderLight : 'white', color: f.disabled ? colors.textMuted : colors.textPrimary }} />
                  </div>
                ))}
              </div>
              <button onClick={handleSaveProfile} disabled={saving} style={{ ...styles.primaryButton, opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Save size={15} />{saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <div style={{ ...styles.card }}>
              <h2 style={{ fontSize: font.lg, fontWeight: '700', color: colors.textPrimary, margin: '0 0 20px' }}>Change Password</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                {[
                  { label: 'New Password', value: newPw, setter: setNewPw, placeholder: 'Min 6 characters' },
                  { label: 'Confirm Password', value: confirmPw, setter: setConfirmPw, placeholder: 'Repeat new password' },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ display: 'block', fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{f.label}</label>
                    <input type="password" value={f.value} onChange={e => f.setter(e.target.value)}
                      style={{ ...styles.input }} placeholder={f.placeholder} />
                  </div>
                ))}
              </div>
              <button onClick={handlePassword} style={{ ...styles.outlineButton }}>Update Password</button>
            </div>
          </>
        )}

        {/* Payroll Rates Tab */}
        {tab === 'payroll' && (
          <div style={{ ...styles.card }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #1B4332, #52B788)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Percent size={15} color="white" />
              </div>
              <h2 style={{ fontSize: font.lg, fontWeight: '700', color: colors.textPrimary, margin: 0 }}>Statutory Contribution Rates</h2>
            </div>
            <p style={{ fontSize: font.sm, color: colors.textMuted, margin: '0 0 24px' }}>
              These rates apply to all employees' payslip calculations. SOCSO and EIS rates are capped at insurable salary of RM4,000/month.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'EPF Employee Rate', value: epfRate, setter: setEpfRate, hint: 'Standard: 11%', suffix: '%' },
                { label: 'SOCSO Employee Rate', value: socsoRate, setter: setSocsoRate, hint: 'Standard: 0.5%', suffix: '%' },
                { label: 'EIS Rate (each)', value: eisRate, setter: setEisRate, hint: 'Standard: 0.2%', suffix: '%' },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ display: 'block', fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{f.label}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number" min="0" step="0.1"
                      value={f.value}
                      onChange={e => f.setter(e.target.value)}
                      style={{ ...styles.input, paddingRight: '36px' }}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: font.sm, color: colors.textMuted, pointerEvents: 'none' }}>%</span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.textMuted }}>{f.hint}</p>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div style={{ padding: '16px 20px', background: colors.borderLight, borderRadius: '12px', marginBottom: '20px' }}>
              <p style={{ margin: '0 0 10px', fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Preview (RM 3,000 salary)</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { label: 'EPF', amount: Math.round(3000 * (parseFloat(epfRate) || 0) / 100 * 100) / 100 },
                  { label: 'SOCSO', amount: Math.round(Math.min(3000, 4000) * (parseFloat(socsoRate) || 0) / 100 * 100) / 100 },
                  { label: 'EIS', amount: Math.round(Math.min(3000, 4000) * (parseFloat(eisRate) || 0) / 100 * 100) / 100 },
                ].map(item => (
                  <div key={item.label} style={{ background: 'white', borderRadius: '10px', padding: '12px 14px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '11px', color: colors.textMuted, fontWeight: '600' }}>{item.label}</p>
                    <p style={{ margin: 0, fontSize: font.lg, fontWeight: '700', color: colors.danger }}>RM {item.amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleSaveRates} disabled={savingRates}
              style={{ ...styles.primaryButton, opacity: savingRates ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={15} />{savingRates ? 'Saving...' : 'Save Rates'}
            </button>
          </div>
        )}

        {/* Attendance Tab */}
        {tab === 'attendance' && (
          <div style={{ ...styles.card }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #1B4332, #52B788)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={15} color="white" />
              </div>
              <h2 style={{ fontSize: font.lg, fontWeight: '700', color: colors.textPrimary, margin: 0 }}>Office Location 打卡范围</h2>
            </div>
            <p style={{ fontSize: font.sm, color: colors.textMuted, margin: '0 0 24px' }}>
              Employees with clock-in method "WiFi (Office Staff)" must be within this radius to clock in. Employees on "GPS (Field Staff)" or "Both" are not restricted — their location is only recorded for reference. Leave blank to disable this check entirely.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Latitude</label>
                <input type="number" step="0.000001" value={officeLat} onChange={e => setOfficeLat(e.target.value)} placeholder="e.g. 3.139003" style={{ ...styles.input }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Longitude</label>
                <input type="number" step="0.000001" value={officeLng} onChange={e => setOfficeLng(e.target.value)} placeholder="e.g. 101.686855" style={{ ...styles.input }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Allowed Radius (meters)</label>
                <input type="number" min="20" step="10" value={officeRadius} onChange={e => setOfficeRadius(e.target.value)} placeholder="200" style={{ ...styles.input }} />
              </div>
            </div>

            <button onClick={handleLocateMe} disabled={locating} style={{ ...styles.outlineButton, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', opacity: locating ? 0.6 : 1 }}>
              <LocateFixed size={14} />{locating ? 'Getting location...' : 'Use My Current Location'}
            </button>

            {officeLat && officeLng && (
              <p style={{ margin: '-12px 0 20px', fontSize: '12px' }}>
                <a href={`https://www.google.com/maps?q=${officeLat},${officeLng}`} target="_blank" rel="noreferrer" style={{ color: colors.info }}>
                  View this location on Google Maps ↗
                </a>
              </p>
            )}

            <button onClick={handleSaveLocation} disabled={savingLocation}
              style={{ ...styles.primaryButton, opacity: savingLocation ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={15} />{savingLocation ? 'Saving...' : 'Save Office Location'}
            </button>
          </div>
        )}

        {/* Claims Limits Tab */}
        {tab === 'claims' && (
          <div>
            <p style={{ fontSize: font.base, color: colors.textMuted, marginBottom: '16px' }}>
              Set monthly claim limits per employee for each category. Enter 0 to disallow.
            </p>

            {employees.length === 0 ? (
              <div style={{ ...styles.card, textAlign: 'center', padding: '40px', color: colors.textMuted }}>
                No employees found.
              </div>
            ) : employees.map(emp => (
              <div key={emp.id} style={{ ...styles.card, marginBottom: '12px' }}>
                {/* Employee row */}
                <div
                  onClick={() => setExpandedEmp(expandedEmp === emp.id ? null : emp.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: radius.md, flexShrink: 0,
                      background: 'linear-gradient(135deg, #1B4332, #52B788)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: font.sm, fontWeight: '700'
                    }}>
                      {(emp.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: font.base, fontWeight: '600', color: colors.textPrimary }}>{emp.full_name || 'Unknown'}</p>
                      <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted }}>{emp.employee_id} · {emp.department || 'No department'}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: font.xs, color: colors.textMuted }}>
                      Total: RM {CLAIM_TYPES.reduce((s, ct) => s + (parseFloat(limits[emp.id]?.[ct.id] || '0') || 0), 0).toFixed(0)}/mo
                    </span>
                    {expandedEmp === emp.id ? <ChevronUp size={16} color={colors.textMuted} /> : <ChevronDown size={16} color={colors.textMuted} />}
                  </div>
                </div>

                {/* Expanded limits */}
                {expandedEmp === emp.id && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${colors.borderLight}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '16px' }}>
                      {CLAIM_TYPES.map(ct => (
                        <div key={ct.id}>
                          <label style={{ display: 'block', fontSize: font.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{ct.name}</label>
                          <p style={{ margin: '0 0 4px', fontSize: '10px', color: colors.textMuted }}>{ct.period}</p>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: font.sm, color: colors.textMuted, pointerEvents: 'none' }}>RM</span>
                            <input
                              type="number" min="0" step="10"
                              value={limits[emp.id]?.[ct.id] || ''}
                              onChange={e => setLimit(emp.id, ct.id, e.target.value)}
                              placeholder="0"
                              style={{ ...styles.input, paddingLeft: '32px' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => handleSaveLimits(emp.id)} disabled={savingLimits}
                      style={{ ...styles.primaryButton, opacity: savingLimits ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px', fontSize: font.sm }}>
                      <Save size={14} />{savingLimits ? 'Saving...' : 'Save Limits'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
