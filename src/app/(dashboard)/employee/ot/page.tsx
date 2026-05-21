'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Clock } from 'lucide-react'
import { formatDate, formatCurrency, generateWhatsAppLink, getStatusColor } from '@/lib/utils'

export default function OTPage() {
  const [profile, setProfile] = useState<any>(null)
  const [otRequests, setOtRequests] = useState<any[]>([])
  const [supervisors, setSupervisors] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ date: '', start_time: '', end_time: '', reason: '', supervisor_id: '' })
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)

    const { data: ot } = await supabase.from('ot_requests').select('*, supervisor:profiles!ot_requests_supervisor_id_fkey(full_name)').eq('employee_id', user.id).order('created_at', { ascending: false })
    setOtRequests(ot || [])

    const { data: sup } = await supabase.from('profiles').select('id, full_name').eq('role', 'supervisor').eq('is_active', true)
    setSupervisors(sup || [])
  }

  function calcOTHours() {
    if (!form.start_time || !form.end_time) return 0
    const [sh, sm] = form.start_time.split(':').map(Number)
    const [eh, em] = form.end_time.split(':').map(Number)
    return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
  }

  async function handleSubmit() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const hours = calcOTHours()
    const hourlyRate = (profile?.basic_salary || 0) / 26 / 8
    const otPay = hours * hourlyRate * 1.5

    const { error } = await supabase.from('ot_requests').insert({
      employee_id: user.id,
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      total_hours: hours,
      reason: form.reason,
      supervisor_id: form.supervisor_id || null,
      hourly_rate: hourlyRate,
      ot_pay: otPay,
      status: 'pending',
    })

    if (!error) {
      // WhatsApp supervisor
      const sup = supervisors.find(s => s.id === form.supervisor_id)
      if (sup) {
        const msg = `Hi, ${profile?.full_name} has submitted an OT request for ${formatDate(form.date)} (${form.start_time} - ${form.end_time}, ${hours.toFixed(1)}hrs). Please review in MamaVege HR system.`
        window.open(generateWhatsAppLink('60', msg), '_blank')
      }
      setShowForm(false)
      loadData()
    }
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Overtime  加班申请</h1>
          <p className="text-gray-500 text-sm mt-1">Submit advance OT requests</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Apply OT
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-gray-800">OT Request  加班申请</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date  日期</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input type="time" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input type="time" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none" />
                </div>
              </div>
              {calcOTHours() > 0 && (
                <div className="bg-orange-50 rounded-xl px-4 py-3 text-sm text-orange-700">
                  OT Hours: {calcOTHours().toFixed(1)}h · Estimated Pay: {formatCurrency(calcOTHours() * ((profile?.basic_salary || 0) / 26 / 8) * 1.5)}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor  主管</label>
                <select value={form.supervisor_id} onChange={e => setForm({...form, supervisor_id: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none">
                  <option value="">Select supervisor...</option>
                  {supervisors.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason  原因</label>
                <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none text-sm resize-none" placeholder="Reason for OT..." required />
              </div>
              <button onClick={handleSubmit} disabled={loading || !form.date || !form.start_time || !form.end_time || !form.reason}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
                {loading ? 'Submitting...' : 'Submit & Notify Supervisor via WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">OT History  加班记录</h3>
        {otRequests.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No OT requests yet</p>
        ) : (
          <div className="space-y-3">
            {otRequests.map(ot => (
              <div key={ot.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{formatDate(ot.date)}</p>
                  <p className="text-xs text-gray-400">{ot.start_time} - {ot.end_time} · {ot.total_hours?.toFixed(1)}h</p>
                  <p className="text-xs text-gray-400">{ot.reason}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(ot.status)}`}>{ot.status}</span>
                  {ot.ot_pay && <p className="text-xs text-green-600 mt-1">{formatCurrency(ot.ot_pay)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
