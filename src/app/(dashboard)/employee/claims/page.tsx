'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function EmployeeClaimsPage() {
  const [claims, setClaims] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ date: '', category: 'transport', amount: '', description: '' })
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('claims').select('*').eq('employee_id', user.id).order('created_at', { ascending: false })
    setClaims(data || [])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!form.date || !form.amount || !form.description) { setMsg('Please fill all fields'); return }
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('claims').insert({
      employee_id: user!.id, date: form.date, category: form.category,
      amount: parseFloat(form.amount), description: form.description, status: 'pending',
    })
    setForm({ date: '', category: 'transport', amount: '', description: '' })
    setShowAdd(false); setMsg(''); loadData(); setSubmitting(false)
  }

  const statusColor: any = {
    approved: { background: '#dcfce7', color: '#16a34a' },
    rejected: { background: '#fee2e2', color: '#dc2626' },
    pending: { background: '#fef3c7', color: '#d97706' },
  }

  const stats = {
    total: claims.length,
    pending: claims.filter(c => c.status === 'pending').length,
    approved: claims.filter(c => c.status === 'approved').length,
    totalAmt: claims.filter(c => c.status === 'approved').reduce((s, c) => s + (c.amount || 0), 0),
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1B4332', margin: '0 0 4px' }}>Claims 报销</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>Submit and track your expense claims</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ padding: '10px 20px', background: '#1B4332', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
          + New Claim
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Claims', value: stats.total, color: '#1B4332' },
          { label: 'Pending', value: stats.pending, color: '#d97706' },
          { label: 'Approved', value: stats.approved, color: '#16a34a' },
          { label: 'Total Approved', value: 'RM ' + stats.totalAmt.toFixed(2), color: '#7c3aed' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ color: '#6B7280', fontSize: '13px', margin: '0 0 8px' }}>{s.label}</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {showAdd && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #d1fae5' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 16px' }}>New Claim</h3>
          {msg && <p style={{ color: '#dc2626', fontSize: '13px', margin: '0 0 12px' }}>{msg}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}>
                <option value="transport">Transport</option>
                <option value="meal">Meal</option>
                <option value="accommodation">Accommodation</option>
                <option value="medical">Medical</option>
                <option value="others">Others</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>Amount (RM)</label>
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} placeholder="0.00" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} placeholder="Brief description" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSubmit} disabled={submitting} style={{ padding: '10px 24px', background: submitting ? '#9CA3AF' : '#1B4332', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
            <button onClick={() => { setShowAdd(false); setMsg('') }} style={{ padding: '10px 24px', background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              {['Date', 'Category', 'Amount', 'Description', 'Status'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading...</td></tr>
            ) : claims.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>No claims yet. Click "+ New Claim" to submit.</td></tr>
            ) : claims.map((c, i) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{c.date}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151', textTransform: 'capitalize' }}>{c.category}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#111827' }}>RM {(c.amount || 0).toFixed(2)}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6B7280' }}>{c.description}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ ...statusColor[c.status], padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>{c.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
