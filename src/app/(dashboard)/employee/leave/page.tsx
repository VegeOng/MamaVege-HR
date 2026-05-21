'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Plus, Upload, X, ChevronDown } from 'lucide-react'
import { formatDate, formatCurrency, generateWhatsAppLink, getStatusColor } from '@/lib/utils'

export default function LeavePage() {
  const [profile, setProfile] = useState<any>(null)
  const [leaveTypes, setLeaveTypes] = useState<any[]>([])
  const [balances, setBalances] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hrSettings, setHrSettings] = useState<any>({})
  const [form, setForm] = useState({
    leave_type_id: '',
    duration_type: 'full_day',
    half_day_period: 'morning',
    start_date: '',
    end_date: '',
    start_time: '09:00',
    end_time: '11:00',
    reason: '',
    mc_amount: '',
    mc_file: null as File | null,
  })
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, typesRes, balRes, reqRes, settingsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('leave_types').select('*'),
      supabase.from('leave_entitlements').select('*, leave_type:leave_types(*)').eq('employee_id', user.id).eq('year', new Date().getFullYear()),
      supabase.from('leave_requests').select('*, leave_type:leave_types(name)').eq('employee_id', user.id).order('applied_at', { ascending: false }).limit(20),
      supabase.from('company_settings').select('*'),
    ])

    setProfile(profileRes.data)
    setLeaveTypes(typesRes.data || [])
    setBalances(balRes.data || [])
    setRequests(reqRes.data || [])

    const settings: any = {}
    settingsRes.data?.forEach((s: any) => { settings[s.key] = s.value })
    setHrSettings(settings)
  }

  function calcHours() {
    if (form.duration_type === '2hours') return 2
    if (form.duration_type === 'half_day') return 4
    if (form.duration_type === 'full_day') return 8
    if (form.duration_type === 'multi_day' && form.start_date && form.end_date) {
      const days = Math.ceil((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / 86400000) + 1
      return days * 8
    }
    return 8
  }

  async function handleSubmit() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const hours = calcHours()
    let mcUrl = null

    // Upload MC if needed
    if (form.mc_file) {
      const fileName = `${user.id}/${Date.now()}_${form.mc_file.name}`
      const { data: uploadData } = await supabase.storage.from('leave-documents').upload(fileName, form.mc_file)
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('leave-documents').getPublicUrl(fileName)
        mcUrl = urlData.publicUrl
      }
    }

    const startDate = form.duration_type === 'multi_day' ? form.start_date : form.start_date
    const endDate = form.duration_type === 'multi_day' ? form.end_date : form.start_date

    const { error } = await supabase.from('leave_requests').insert({
      employee_id: user.id,
      leave_type_id: form.leave_type_id,
      start_date: startDate,
      end_date: endDate,
      start_time: form.duration_type === '2hours' ? form.start_time : null,
      end_time: form.duration_type === '2hours' ? form.end_time : null,
      duration_type: form.duration_type,
      half_day_period: form.duration_type === 'half_day' ? form.half_day_period : null,
      total_hours: hours,
      reason: form.reason,
      mc_amount: form.mc_amount ? parseFloat(form.mc_amount) : null,
      mc_document_url: mcUrl,
      status: 'pending',
    })

    if (!error) {
      // Generate WhatsApp message for HR
      const leaveType = leaveTypes.find(t => t.id === form.leave_type_id)
      const msg = `Hi, ${profile?.full_name} has applied for ${leaveType?.name} from ${formatDate(startDate)}${endDate !== startDate ? ` to ${formatDate(endDate)}` : ''} (${hours / 8} day(s)). Please review in MamaVege HR system.`
      const waLink = generateWhatsAppLink(hrSettings.hr_whatsapp || '60', msg)
      window.open(waLink, '_blank')

      setShowForm(false)
      loadData()
    }
    setLoading(false)
  }

  const selectedType = leaveTypes.find(t => t.id === form.leave_type_id)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Leave  假期申请</h1>
          <p className="text-gray-500 text-sm mt-1">{new Date().getFullYear()} Leave Balances</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2.5 rounded-xl transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" /> Apply Leave
        </button>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {balances.map(bal => {
          const remaining = bal.entitled_hours + bal.carried_forward_hours - bal.used_hours
          return (
            <div key={bal.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">{bal.leave_type?.name}</p>
              <p className="text-2xl font-bold text-gray-800">{(remaining / 8).toFixed(1)}</p>
              <p className="text-xs text-gray-400">of {(bal.entitled_hours / 8).toFixed(0)} days left</p>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full">
                <div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${Math.max(0, Math.min(100, (remaining / bal.entitled_hours) * 100))}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Leave Request Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-gray-800">Apply Leave  申请假期</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Leave Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type  假期类型</label>
                <select value={form.leave_type_id} onChange={e => setForm({...form, leave_type_id: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none">
                  <option value="">Select leave type...</option>
                  {leaveTypes.filter(t => t.code !== 'PH').map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration  时长</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: '2hours', label: '2 Hours  2小时' },
                    { value: 'half_day', label: 'Half Day  半天' },
                    { value: 'full_day', label: 'Full Day  整天' },
                    { value: 'multi_day', label: 'Multiple Days  多天' },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => setForm({...form, duration_type: opt.value})}
                      className={`px-3 py-2.5 rounded-xl text-sm border transition-colors ${form.duration_type === opt.value ? 'bg-green-700 text-white border-green-700' : 'border-gray-200 hover:border-green-300'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Half day period */}
              {form.duration_type === 'half_day' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ value: 'morning', label: 'Morning  上午' }, { value: 'afternoon', label: 'Afternoon  下午' }].map(opt => (
                      <button key={opt.value} onClick={() => setForm({...form, half_day_period: opt.value})}
                        className={`px-3 py-2.5 rounded-xl text-sm border transition-colors ${form.half_day_period === opt.value ? 'bg-green-700 text-white border-green-700' : 'border-gray-200'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 2 hours time */}
              {form.duration_type === '2hours' && (
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
              )}

              {/* Dates */}
              <div className={form.duration_type === 'multi_day' ? 'grid grid-cols-2 gap-3' : ''}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{form.duration_type === 'multi_day' ? 'Start Date' : 'Date'}</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none" />
                </div>
                {form.duration_type === 'multi_day' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none" />
                  </div>
                )}
              </div>

              {/* Total hours preview */}
              {form.start_date && (
                <div className="bg-green-50 rounded-xl px-4 py-3 text-sm text-green-700">
                  Total: {calcHours() / 8} day(s) = {calcHours()} hours
                </div>
              )}

              {/* Medical claim */}
              {selectedType?.code === 'ML' && (
                <div className="border border-orange-200 bg-orange-50 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-medium text-orange-700">Medical Claim  医疗报销</p>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Amount (max RM100 per visit)</label>
                    <input type="number" max="100" step="0.01" value={form.mc_amount} onChange={e => setForm({...form, mc_amount: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none text-sm" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Upload MC Receipt (required)</label>
                    <input type="file" accept="image/*,application/pdf" onChange={e => setForm({...form, mc_file: e.target.files?.[0] || null})}
                      className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-100 file:text-green-700" />
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason  原因</label>
                <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none text-sm resize-none" placeholder="Optional reason..." />
              </div>

              <button onClick={handleSubmit} disabled={loading || !form.leave_type_id || !form.start_date}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
                {loading ? 'Submitting...' : 'Submit & Notify HR via WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Leave History  假期记录</h3>
        {requests.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No leave requests yet</p>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{req.leave_type?.name}</p>
                  <p className="text-xs text-gray-400">
                    {formatDate(req.start_date)}{req.end_date !== req.start_date ? ` → ${formatDate(req.end_date)}` : ''} · {req.total_hours / 8}d
                  </p>
                  {req.reason && <p className="text-xs text-gray-400 italic">{req.reason}</p>}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(req.status)}`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
