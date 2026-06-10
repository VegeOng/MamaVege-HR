'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Lock, User, X, Send, ListFilter, Mail, MailOpen, CheckCircle2 } from 'lucide-react'
import { colors, radius, shadow, styles, font } from '@/lib/design'

const CATEGORIES: Record<string, string> = {
  company_operations: 'Company Operations',
  teamwork: 'Teamwork',
  work_environment: 'Work Environment',
  salary_benefits: 'Salary & Benefits',
  others: 'Others',
}

const FILTERS = [
  { id: 'all', label: 'All', icon: <ListFilter size={13} /> },
  { id: 'unread', label: 'Unread', icon: <Mail size={13} /> },
  { id: 'read', label: 'Read', icon: <MailOpen size={13} /> },
  { id: 'replied', label: 'Replied', icon: <CheckCircle2 size={13} /> },
]

export default function DirectorSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadData() }, [filter])

  async function loadData() {
    setLoading(true)
    let q = supabase.from('suggestions').select('*, employee:profiles(full_name, department)').order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setSuggestions(data || [])
    setLoading(false)
  }

  async function openSuggestion(s: any) {
    setSelected(s)
    setReplyText(s.director_reply || '')
    if (s.status === 'unread') {
      await supabase.from('suggestions').update({ status: 'read' }).eq('id', s.id)
      loadData()
    }
  }

  async function sendReply() {
    if (!selected || !replyText.trim()) return
    setSending(true)
    await supabase.from('suggestions').update({
      director_reply: replyText.trim(),
      replied_at: new Date().toISOString(),
      status: 'replied',
    }).eq('id', selected.id)
    setSending(false)
    setSelected(null)
    loadData()
  }

  const statusStyle = (s: string) => ({
    unread: { bg: colors.warningBg, color: colors.warningText, label: 'Unread' },
    read: { bg: colors.infoBg, color: colors.infoText, label: 'Read' },
    replied: { bg: colors.successBg, color: colors.successText, label: 'Replied' },
  }[s] || { bg: colors.borderLight, color: colors.textMuted, label: s })

  const unreadCount = suggestions.filter(s => s.status === 'unread').length

  return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ ...styles.pageTitle }}>Suggestion Box 建议箱</h1>
          <p style={{ ...styles.pageSubtitle }}>Private feedback from employees — only visible to you</p>
        </div>

        {filter === 'all' && unreadCount > 0 && (
          <div style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: radius.md, background: colors.warningBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={20} color={colors.warningText} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: colors.textPrimary, letterSpacing: '-0.5px' }}>{unreadCount}</p>
              <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Unread Suggestions</p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: radius.full, fontSize: font.sm, fontWeight: '600',
              border: 'none', cursor: 'pointer', textTransform: 'capitalize',
              background: filter === f.id ? colors.primary : 'white',
              color: filter === f.id ? 'white' : colors.textMuted,
              boxShadow: shadow.card,
            }}>{f.icon}{f.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <div style={{ ...styles.card, textAlign: 'center', padding: '48px', color: colors.textMuted }}>Loading...</div>
          ) : suggestions.length === 0 ? (
            <div style={{ ...styles.card, textAlign: 'center', padding: '48px' }}>
              <MessageSquare size={32} color={colors.textMuted} style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ margin: 0, color: colors.textMuted, fontSize: font.base }}>No {filter !== 'all' ? filter : ''} suggestions</p>
            </div>
          ) : suggestions.map(s => {
            const st = statusStyle(s.status)
            return (
              <div key={s.id} onClick={() => openSuggestion(s)} style={{
                ...styles.card, cursor: 'pointer',
                border: s.status === 'unread' ? `1.5px solid ${colors.primaryLight}` : `1px solid ${colors.borderLight}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      {s.is_anonymous ? <Lock size={12} color={colors.textMuted} /> : <User size={12} color={colors.textMuted} />}
                      <span style={{ fontSize: font.xs, color: colors.textMuted, background: colors.borderLight, padding: '2px 10px', borderRadius: radius.full }}>{CATEGORIES[s.category] || s.category}</span>
                      <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 10px', borderRadius: radius.full, background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: font.base, fontWeight: '700', color: colors.textPrimary }}>{s.title}</h3>
                    <p style={{ margin: '2px 0 0', fontSize: font.xs, color: colors.textMuted }}>
                      {s.is_anonymous ? 'Anonymous' : `${s.employee?.full_name || '-'} · ${s.employee?.department || '-'}`}
                    </p>
                  </div>
                  <span style={{ fontSize: font.xs, color: colors.textMuted, flexShrink: 0 }}>{new Date(s.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <p style={{
                  margin: '10px 0 0', fontSize: font.sm, color: colors.textSecondary,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                }}>{s.content}</p>
              </div>
            )
          })}
        </div>

        {/* Detail / Reply modal */}
        {selected && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          }} onClick={() => setSelected(null)}>
            <div style={{
              background: 'white', borderRadius: radius.lg, width: '100%', maxWidth: '560px',
              maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: shadow.cardHover,
            }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <span style={{ fontSize: font.xs, color: colors.textMuted, background: colors.borderLight, padding: '2px 10px', borderRadius: radius.full }}>{CATEGORIES[selected.category] || selected.category}</span>
                  <h2 style={{ margin: '8px 0 2px', fontSize: font.lg, fontWeight: '800', color: colors.textPrimary }}>{selected.title}</h2>
                  <p style={{ margin: 0, fontSize: font.xs, color: colors.textMuted }}>
                    {selected.is_anonymous ? '🔒 Anonymous' : `${selected.employee?.full_name || '-'} · ${selected.employee?.department || '-'}`}
                    {' · '}{new Date(selected.created_at).toLocaleString('en-MY')}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={20} /></button>
              </div>

              <div style={{ background: colors.borderLight, borderRadius: radius.md, padding: '14px', marginBottom: '16px' }}>
                <p style={{ margin: 0, fontSize: font.sm, color: colors.textPrimary, whiteSpace: 'pre-wrap' }}>{selected.content}</p>
              </div>

              {selected.director_reply && (
                <div style={{ background: colors.successBg, borderRadius: radius.md, padding: '14px', marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: font.xs, fontWeight: '700', color: colors.successText, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Reply</p>
                  <p style={{ margin: 0, fontSize: font.sm, color: colors.successText, whiteSpace: 'pre-wrap' }}>{selected.director_reply}</p>
                  {selected.replied_at && <p style={{ margin: '6px 0 0', fontSize: font.xs, color: colors.successText, opacity: 0.7 }}>{new Date(selected.replied_at).toLocaleString('en-MY')}</p>}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '6px' }}>
                  {selected.director_reply ? 'Update Reply' : 'Reply 回复'}
                </label>
                <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={4}
                  style={{ ...styles.input, resize: 'none' as const }} placeholder="Write a reply to this employee..." />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                <button onClick={sendReply} disabled={sending || !replyText.trim()} style={{
                  ...styles.primaryButton, display: 'flex', alignItems: 'center', gap: '6px',
                  opacity: (sending || !replyText.trim()) ? 0.6 : 1,
                }}>
                  <Send size={14} />{sending ? 'Sending...' : 'Send Reply'}
                </button>
                <button onClick={() => setSelected(null)} style={{ ...styles.outlineButton }}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
