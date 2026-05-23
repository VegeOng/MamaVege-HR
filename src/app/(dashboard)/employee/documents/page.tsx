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
          <div style={{ textAlign: 'center', padding: '48px', color: '#9CA3AF' }}>
            <p style={{ fontSize: '40px', margin: '0 0 12px' }}>📂</p>
            <p style={{ fontSize: '14px', margin: 0 }}>No documents yet. HR will upload your documents here.</p>
          </div>
        ) : (
          <div style={{ padding: '8px' }}>
            {documents.map(doc => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '8px', marginBottom: '4px', background: '#FAFAFA' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px' }}>{getIcon(doc.file_name)}</span>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: '0 0 2px' }}>{doc.title || doc.file_name}</p>
                    <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>{doc.category || 'Document'} · {fmtDate(doc.created_at)}</p>
                  </div>
                </div>
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noreferrer"
                    style={{ padding: '6px 16px', background: '#1B4332', color: 'white', borderRadius: '8px', fontSize: '13px', textDecoration: 'none', fontWeight: '500' }}>
                    View
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6' }}>
          <p style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: 0 }}>Employee Information</p>
        </div>
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            { label: 'Full Name', value: profile?.full_name },
            { label: 'Employee ID', value: profile?.employee_id },
            { label: 'Department', value: profile?.department },
            { label: 'Position', value: profile?.position },
            { label: 'Join Date', value: profile?.join_date },
            { label: 'Shift', value: profile?.shift },
            { label: 'Phone', value: profile?.phone },
            { label: 'Email', value: profile?.email },
          ].map(item => (
            <div key={item.label}>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 2px' }}>{item.label}</p>
              <p style={{ fontSize: '14px', fontWeight: '500', color: '#374151', margin: 0 }}>{item.value || '-'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
