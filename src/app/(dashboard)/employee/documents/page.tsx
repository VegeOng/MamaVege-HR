'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FolderOpen, FileText, Image as ImageIcon, FileBadge, ExternalLink, User } from 'lucide-react'
import { colors, radius, shadow, styles, font } from '@/lib/design'

const DOC_TYPE_LABELS: Record<string, string> = {
  offer_letter: 'Offer Letter',
  ic_copy: 'IC / Work Permit Copy',
  contract: 'Employment Contract',
  payslip: 'Payslip',
  certificate: 'Certificate',
  other: 'Other Document',
}

function getIcon(name: string) {
  if (!name) return <FileText size={18} />
  if (name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return <ImageIcon size={18} />
  if (name.match(/\.pdf$/i)) return <FileBadge size={18} />
  return <FileText size={18} />
}

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

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function fmtSize(bytes: number) {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', padding: '80px 0', color: colors.textMuted }}>Loading...</div>
    </div>
  )

  const infoFields = [
    { label: 'Full Name', value: profile?.full_name },
    { label: 'Employee ID', value: profile?.employee_id },
    { label: 'Department', value: profile?.department },
    { label: 'Position', value: profile?.position },
    { label: 'Join Date', value: profile?.join_date ? fmtDate(profile.join_date) : '-' },
    { label: 'Shift', value: profile?.shift },
    { label: 'Phone', value: profile?.phone },
    { label: 'Email', value: profile?.email },
  ]

  return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ ...styles.pageTitle }}>Documents 文件</h1>
          <p style={{ ...styles.pageSubtitle }}>Your employment documents and records</p>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '20px' }}>
          <div style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: radius.md, background: colors.infoBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FolderOpen size={20} color={colors.infoText} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: colors.textPrimary, letterSpacing: '-0.5px' }}>{documents.length}</p>
              <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Documents</p>
            </div>
          </div>
          <div style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: radius.md, background: colors.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={20} color={colors.successText} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: colors.textPrimary, letterSpacing: '-0.5px' }}>{profile?.employee_id || '-'}</p>
              <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Employee ID</p>
            </div>
          </div>
        </div>

        {/* Document list */}
        <div style={{ ...styles.card, padding: 0, overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.borderLight}` }}>
            <p style={{ margin: 0, fontSize: font.lg, fontWeight: '700', color: colors.textPrimary }}>My Documents</p>
          </div>
          {documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <FolderOpen size={32} color={colors.textMuted} style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ margin: 0, color: colors.textMuted, fontSize: font.base }}>No documents yet. HR will upload your documents here.</p>
            </div>
          ) : (
            <div style={{ padding: '8px' }}>
              {documents.map(doc => (
                <div key={doc.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: radius.md, marginBottom: '4px',
                  background: colors.pageBg,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: radius.md, flexShrink: 0,
                      background: colors.gradients.green,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                    }}>
                      {getIcon(doc.file_name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: font.base, fontWeight: '700', color: colors.textPrimary, margin: '0 0 2px' }}>
                        {doc.title || DOC_TYPE_LABELS[doc.document_type] || doc.file_name}
                      </p>
                      <p style={{ fontSize: font.xs, color: colors.textMuted, margin: 0 }}>
                        {DOC_TYPE_LABELS[doc.document_type] || 'Document'} · {fmtDate(doc.created_at)}{doc.file_size ? ` · ${fmtSize(doc.file_size)}` : ''}
                      </p>
                    </div>
                  </div>
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noreferrer" style={{
                      display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                      padding: '8px 16px', background: colors.primary, color: 'white',
                      borderRadius: radius.md, fontSize: font.sm, textDecoration: 'none', fontWeight: '700',
                    }}>
                      <ExternalLink size={13} />View
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Employee info */}
        <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.borderLight}` }}>
            <p style={{ margin: 0, fontSize: font.lg, fontWeight: '700', color: colors.textPrimary }}>Employee Information</p>
          </div>
          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
            {infoFields.map(item => (
              <div key={item.label}>
                <p style={{ fontSize: font.xs, color: colors.textMuted, margin: '0 0 3px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</p>
                <p style={{ fontSize: font.md, fontWeight: '600', color: colors.textPrimary, margin: 0 }}>{item.value || '-'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
