'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function HRSettingsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ full_name: '', phone: '', department: '' })
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
    setForm({ full_name: data?.full_name || '', phone: data?.phone || '', department: data?.department || '' })
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    setMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update({ full_name: form.full_name, phone: form.phone, department: form.department }).eq('id', user!.id)
    setMsg('Profile updated successfully!')
    setSaving(false)
  }

  async function handlePassword() {
    if (pwForm.newPw !== pwForm.confirm) { setMsg('Passwords do not match!'); return }
    if (pwForm.newPw.length < 6) { setMsg('Password must be at least 6 characters'); return }
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
    if (error) setMsg('Error: ' + error.message)
    else { setMsg('Password updated!'); setPwForm({ current: '', newPw: '', confirm: '' }) }
  }

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings 设置</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account settings</p>
      </div>

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
            <input value={form.full_name} onChange
