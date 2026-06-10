'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, CalendarCheck, X } from 'lucide-react'
import { colors, radius, shadow, styles, font } from '@/lib/design'

export default function HRHolidaysPage() {
  const [holidays, setHolidays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase.from('public_holidays').select('*').order('date')
    setHolidays(data || [])
    setLoading(false)
  }

  async function handleAdd() {
    if (!name || !date) return
    setSaving(true)
    await supabase.from('public_holidays').insert({ name, date, description: desc })
    setName(''); setDate(''); setDesc(''); setShowAdd(false); setSaving(false)
    loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this holiday?')) return
    await supabase.from('public_holidays').delete().eq('id', id)
    loadData()
  }

  const today = new Date().toISOString().split('T')[0]
  const upcoming = holidays.filter(h => h.date >= today)
  const past = holidays.filter(h => h.date < today)

  return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ ...styles.pageTitle }}>Public Holidays 公共假期</h1>
            <p style={{ ...styles.pageSubtitle }}>{holidays.length} holidays · {upcoming.length} upcoming</p>
          </div>
          <button onClick={() => setShowAdd(!showAdd)} style={{ ...styles.primaryButton, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {showAdd ? <X size={15} /> : <Plus size={15} />}
            {showAdd ? 'Cancel' : 'Add Holiday'}
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div style={{ ...styles.card, marginBottom: '20px' }}>
            <p style={{ ...styles.sectionLabel }}>New Holiday</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: font.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: '6px' }}>Holiday Name</label>
                <input value={name} onChange={e => setName(e.target.value)} style={{ ...styles.input }} placeholder="e.g. Hari Raya" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: font.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: '6px' }}>Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...styles.input }} />
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: font.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: '6px' }}>Description (optional)</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} style={{ ...styles.input }} placeholder="Optional notes" />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleAdd} disabled={saving || !name || !date} style={{ ...styles.primaryButton, opacity: (saving || !name || !date) ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setShowAdd(false)} style={{ ...styles.outlineButton }}>Cancel</button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div style={{ ...styles.card, textAlign: 'center', padding: '48px', color: colors.textMuted }}>Loading...</div>
        ) : holidays.length === 0 ? (
          <div style={{ ...styles.card, textAlign: 'center', padding: '48px' }}>
            <CalendarCheck size={32} color={colors.textMuted} style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ margin: 0, color: colors.textMuted, fontSize: font.base }}>No holidays added yet</p>
          </div>
        ) : (
          <>
            {[{ title: 'Upcoming', items: upcoming, dim: false }, { title: 'Past', items: past, dim: true }]
              .filter(g => g.items.length > 0)
              .map(group => (
                <div key={group.title} style={{ marginBottom: '20px' }}>
                  <p style={{ ...styles.sectionLabel }}>{group.title}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {group.items.map(h => {
                      const d = new Date(h.date)
                      return (
                        <div key={h.id} style={{ ...styles.card, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '16px', opacity: group.dim ? 0.6 : 1 }}>
                          <div style={{
                            width: '52px', height: '52px', borderRadius: radius.md, flexShrink: 0,
                            background: group.dim ? colors.borderLight : colors.gradients.green,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <span style={{ fontSize: '18px', fontWeight: '800', color: group.dim ? colors.textMuted : 'white', lineHeight: 1 }}>{d.getDate()}</span>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: group.dim ? colors.textMuted : 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.toLocaleDateString('en-MY', { month: 'short' })}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: font.base, fontWeight: '700', color: colors.textPrimary, margin: '0 0 2px' }}>{h.name}</p>
                            <p style={{ fontSize: font.xs, color: colors.textMuted, margin: 0 }}>
                              {d.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                              {h.description ? ` · ${h.description}` : ''}
                            </p>
                          </div>
                          <button onClick={() => handleDelete(h.id)} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '32px', height: '32px', borderRadius: radius.md, flexShrink: 0,
                            background: colors.dangerBg, color: colors.dangerText, border: 'none', cursor: 'pointer',
                          }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  )
}
