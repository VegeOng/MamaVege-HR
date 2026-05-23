'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function HRSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setFullName(data?.full_name || '')
    setPhone(data?.phone || '')
    setEmployeeId(data?.employee_id || '')
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true); setMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user!.id)
    setMsg('Profile updated!')
    setSaving(false)
  }

  async function handlePassword() {
    if (newPw !== confirmPw) { setMsg('Passwords do not match!'); return }
    if (newPw.length < 6) { setMsg('Min 6 characters'); return }
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) setMsg('Error: ' + error.message)
    else { setMsg('Password updated!'); setNewPw(''); setConfirmPw('') }
  }

  if (loading) return <div style={{ padding: '32px', color: '#9CA3AF' }}>Loading...</div>

  return (
    <div style={{ padding: '32px', maxWidth: '640px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1B4332', margin: '0 0 4px' }}>Settings 设置</h1>
      <p style={{ color: '#6B7280', fontSize: '14px', margin: '0 0 24px' }}>Manage your account</p>
      {msg && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', background: msg.includes('Error') || msg.includes('match') ? '#fee2e2' : '#dcfce7', color: msg.includes('Error') || msg.includes('match') ? '#dc2626' : '#16a34a' }}>
          {msg}
        </div>
      )}
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 20px' }}>Profile Information</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>Full Name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>Employee ID</label>
            <input value={employeeId} disabled
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #F3F4F6', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: '#F9FAFB', color: '#9CA3AF' }} />
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '10px 24px', background: saving ? '#9CA3AF' : '#1B4332', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 20px' }}>Change Password 修改密码</h2>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>New Password</label>
          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            placeholder="Min 6 characters" />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>Confirm Password</label>
          <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            placeholder="Repeat new password" />
        </div>
        <button onClick={handlePassword}
          style={{ padding: '10px 24px', background: '#374151', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
          Update Password
        </button>
      </div>
    </div>
  )
}
