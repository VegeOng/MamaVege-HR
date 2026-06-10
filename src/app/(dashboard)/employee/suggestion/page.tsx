'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Plus, X, Lock, User, ShieldCheck, Heart } from 'lucide-react'
import { colors, radius, styles, font } from '@/lib/design'

const CATEGORIES = [
  { value: 'company_operations', label: 'Company Operations 公司运营' },
  { value: 'teamwork', label: 'Teamwork 团队合作' },
  { value: 'work_environment', label: 'Work Environment 工作环境' },
  { value: 'salary_benefits', label: 'Salary & Benefits 薪资福利' },
  { value: 'others', label: 'Others 其他' },
]

function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  )
}

export default function SuggestionPage() {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [form, setForm] = useState({ category: '', title: '', content: '', is_anonymous: false })
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setPageLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('suggestions').select('*').eq('employee_id', user.id).order('created_at', { ascending: false })
    setSuggestions(data || [])
    setPageLoading(false)
  }

  async function handleSubmit() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('suggestions').insert({
      employee_id: user.id,
      is_anonymous: form.is_anonymous,
      category: form.category,
      title: form.title,
      content: form.content,
      status: 'unread',
    })

    setForm({ category: '', title: '', content: '', is_anonymous: false })
    setShowForm(false)
    setLoading(false)
    loadData()
  }

  const statusStyle = (s: string) => ({
    unread: { bg: colors.successBg, color: colors.successText, label: 'Submitted 已提交' },
    read: { bg: colors.infoBg, color: colors.infoText, label: 'Read 已查看' },
    replied: { bg: colors.successBg, color: colors.successText, label: 'Replied 已回复' },
  }[s] || { bg: colors.borderLight, color: colors.textMuted, label: s })

  return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ ...styles.pageInner }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ ...styles.pageTitle }}>Suggestion Box 建议箱</h1>
            <p style={{ ...styles.pageSubtitle }}>Your feedback goes directly to the Director</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{
            ...styles.primaryButton,
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <Plus size={16} />
            New Suggestion
          </button>
        </div>

        {/* Privacy notice */}
        <div style={{ ...styles.card, marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '12px', background: colors.successBg, border: 'none' }}>
          <ShieldCheck size={20} color={colors.successText} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ margin: 0, fontSize: font.sm, fontWeight: '700', color: colors.successText }}>Private &amp; Confidential</p>
            <p style={{ margin: '2px 0 0', fontSize: font.xs, color: colors.successText }}>Only the Director can view suggestions. HR cannot see any submissions.</p>
          </div>
        </div>

        {/* Thank-you message */}
        <div style={{ ...styles.card, marginBottom: '20px', background: colors.borderLight, border: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: radius.full, background: colors.successBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Heart size={16} color={colors.successText} />
            </div>
            <h3 style={{ margin: 0, fontSize: font.base, fontWeight: '800', color: colors.textPrimary }}>Thank You 谢谢您</h3>
          </div>
          <p style={{ margin: '0 0 10px', fontSize: font.sm, color: colors.textSecondary, lineHeight: 1.8 }}>
            感谢您提出宝贵的建议。 公司允许不同的声音，也鼓励大家勇敢表达自己的想法。因为真正让团队成长的，不是永远没有问题，而是有人愿意发现问题、提出问题，并一起寻找解决方案。 每一次善意的提醒，都是推动公司进步的动力；每一份真诚的建议，都是对团队最有价值的贡献。 谢谢您的坦诚与勇气。
          </p>
          <p style={{ margin: 0, fontSize: font.sm, color: colors.textSecondary, lineHeight: 1.8 }}>
            Thank you for your valuable suggestion. We welcome different perspectives and encourage everyone to speak up and share their ideas. What truly helps a team grow is not the absence of problems, but the willingness to identify them, raise them, and work together to find solutions. Every constructive reminder is a driving force for improvement, and every sincere suggestion is a valuable contribution to the team's success. Thank you for your honesty, courage, and commitment to making us better.
          </p>
        </div>

        {/* New Suggestion Form */}
        {showForm && (
          <div style={{ ...styles.card, marginBottom: '20px', border: `1px solid ${colors.primaryLight}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: font.lg, fontWeight: '700', color: colors.textPrimary }}>New Suggestion 新建议</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Field label="Category 分类">
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ ...styles.input }}>
                  <option value="">Select category...</option>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Title 标题">
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={{ ...styles.input }} placeholder="Brief title..." />
              </Field>
              <Field label="Content 内容">
                <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={5}
                  style={{ ...styles.input, resize: 'none' as const }} placeholder="Share your suggestion or feedback..." />
              </Field>

              <button onClick={() => setForm({ ...form, is_anonymous: !form.is_anonymous })} style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px 16px',
                borderRadius: radius.md, border: `1.5px solid ${form.is_anonymous ? colors.sidebarBg : colors.border}`,
                background: form.is_anonymous ? colors.sidebarBg : 'white',
                color: form.is_anonymous ? 'white' : colors.textSecondary,
                cursor: 'pointer', fontSize: font.sm, fontWeight: '600',
              }}>
                {form.is_anonymous ? <Lock size={16} /> : <User size={16} />}
                {form.is_anonymous ? 'Anonymous 匿名提交' : 'Show My Name 显示身份'}
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleSubmit} disabled={loading || !form.category || !form.title || !form.content} style={{
                  ...styles.primaryButton, opacity: (loading || !form.category || !form.title || !form.content) ? 0.6 : 1,
                }}>
                  {loading ? 'Submitting...' : 'Submit Suggestion'}
                </button>
                <button onClick={() => setShowForm(false)} style={{ ...styles.outlineButton }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pageLoading ? (
            <div style={{ ...styles.card, textAlign: 'center', padding: '48px', color: colors.textMuted }}>Loading...</div>
          ) : suggestions.length === 0 ? (
            <div style={{ ...styles.card, textAlign: 'center', padding: '48px' }}>
              <MessageSquare size={32} color={colors.textMuted} style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ margin: 0, color: colors.textMuted, fontSize: font.base }}>No suggestions yet. Share your feedback!</p>
            </div>
          ) : suggestions.map(s => {
            const st = statusStyle(s.status)
            return (
              <div key={s.id} style={{ ...styles.card }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      {s.is_anonymous && <Lock size={12} color={colors.textMuted} />}
                      <span style={{ fontSize: font.xs, color: colors.textMuted, background: colors.borderLight, padding: '2px 10px', borderRadius: radius.full }}>
                        {CATEGORIES.find(c => c.value === s.category)?.label.split(' ')[0]}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 10px', borderRadius: radius.full, background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: font.base, fontWeight: '700', color: colors.textPrimary }}>{s.title}</h3>
                  </div>
                  <span style={{ fontSize: font.xs, color: colors.textMuted, flexShrink: 0 }}>{new Date(s.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <p style={{ margin: 0, fontSize: font.sm, color: colors.textSecondary, whiteSpace: 'pre-wrap' }}>{s.content}</p>
                {s.director_reply && (
                  <div style={{ marginTop: '12px', background: colors.successBg, borderRadius: radius.md, padding: '12px 14px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: font.xs, fontWeight: '700', color: colors.successText, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Director's Reply</p>
                    <p style={{ margin: 0, fontSize: font.sm, color: colors.successText, whiteSpace: 'pre-wrap' }}>{s.director_reply}</p>
                    {s.replied_at && <p style={{ margin: '6px 0 0', fontSize: font.xs, color: colors.successText, opacity: 0.7 }}>{new Date(s.replied_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
