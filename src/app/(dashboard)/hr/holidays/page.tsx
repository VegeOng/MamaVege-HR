'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function HRHolidaysPage() {
  const [holidays, setHolidays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [desc, setDesc] = useState('')
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
    await supabase.from('public_holidays').insert({ name, date, description: desc })
    setName(''); setDate(''); setDesc(''); setShowAdd(false)
    loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this holiday?')) return
    await supabase.from('public_holidays').delete().eq('id', id)
    loadData()
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1B4332', margin: '0 0 4px' }}>Public Holidays 公共假期</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>{holidays.length} holidays</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ padding: '10px 20px', background: '#1B4332', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
          + Add Holiday
        </button>
      </div>
      {showAdd && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #d1fae5' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 16px' }}>New Holiday</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>Holiday Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                placeholder="e.g. Hari Raya" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>Description (optional)</label>
            <input value={desc} onChange={e => setDesc(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              placeholder="Optional notes" />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleAdd} style={{ padding: '9px 20px', background: '#1B4332', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>Save</button>
            <button onClick={() => setShowAdd(false)} style={{ padding: '9px 20px', background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              {['Date', 'Day', 'Name', 'Description', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading...</td></tr>
            ) : holidays.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>No holidays yet</td></tr>
            ) : holidays.map((h, i) => (
              <tr key={h.id} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#111827' }}>{h.date}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6B7280' }}>{new Date(h.date).toLocaleDateString('en-MY', { weekday: 'long' })}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{h.name}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6B7280' }}>{h.description || '-'}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button onClick={() => handleDelete(h.id)} style={{ color: '#dc2626', background: 'none', border: 'none', fontSize: '12px', cursor: 'pointer' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
