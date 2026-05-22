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
    setSaving(true)
    setMsg('')
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

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Settings 设置</h1>
      <p className="text-gray-500 text-sm mb-6">Manage your account</p>
      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${msg.includes('Error') || msg.includes('match') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {msg}
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-5">
        <h2 className="font-semibold text-gray-700 mb-4">Profile Information</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Employee ID</label>
            <input value={employeeId} disabled
              className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-400" />
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Change Password 修改密码</h2>
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">New Password</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder="Min 6 characters" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Confirm Password</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder="Repeat new password" />
          </div>
        </div>
        <button onClick={handlePassword}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium">
          Update Password
        </button>
      </div>
    </div>
  )
}
