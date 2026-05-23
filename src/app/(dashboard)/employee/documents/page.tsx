'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function EmployeeDocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [profileRes, docsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('employee_documents').select('*').eq('employee_id', user.id).order('created_at', { ascending: false }),
    ])
    setProfile(profileRes.data)
    setDocuments(docsRes.data || [])
    setLoading(false)
  }

  const docIcon: any = {
    pdf: '📄', image: '🖼️', doc: '📝', other: '📎',
  }

  function getIcon(name: string) {
    if (name?.endsWith('.pdf')) return '📄'
    if (name?.match(/\.(jpg|jpeg|png|gif)$/)) return '🖼️'
    if (name?.match(/\.(doc|docx)$/)) return '📝'
    return '📎'
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) return <div style={{ padding: '32px', color: '#9CA3AF' }}>Loading...</div>

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1B4332', margin: '0 0 4px' }}>Documents 文件</h1>
        <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>Your employment documents and records</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#6B7280', fontSize: '13px', margin: '0 0 8px' }}>Total Documents</p>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#1B4332', margin: 0 }}>{documents.length}</p>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#6B7280', fontSize: '13px', margin: '0 0 8px' }}>Employee ID</p>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#2563eb', margin: 0 }}>{profile?.employee_id || '-'}</p>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6' }}>
          <p style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: 0 }}>My Documents</p>
        </div>
        {documents.length === 0 ? (
          <div style={{ text
