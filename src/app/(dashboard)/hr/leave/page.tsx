'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Eye, Calendar } from 'lucide-react'
import { formatDate, generateWhatsAppLink, getStatusColor } from '@/lib/utils'

export default function HRLeavePage() {
  const [requests, setRequests] = useState<any[]>([])
  const [filter, setFilter] = useState('pending')
  const [selected, setSelected] = useState<any>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadData() }, [filter])

  async function loadData() {
    const query = supabase.from('leave_requests')
      .select('*, employee:profiles(full_name, department, whatsapp_number), leave_type:leave_types(name, code)')
      .order('applied_at', { ascending: false })
    if (filter !== 'all') query.eq('status', filter)
    const { data } = await query
    setRequests(data || [])
  }

  async function handleReview(id: string, status: 'approved' | 'rejected') {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const req = requests.find(r => r.id === id)
    await supabase.from('leave_requests').update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString(), reviewer_notes: reviewNote }).eq('id', id)
    if (status === 'approved' && req) {
      const { data: ent } = await supabase.from('leave_entitlements').select('*').eq('employee_id', req.employee_id).eq('leave_type_id', req.leave_type_id).eq('year', new Date().getFullYear()).single()
      if (ent) await supabase.from('leave_entitlements').update({ used_hours: ent.used_hours + req.total_hours }).eq('id', ent.id)
    }
    if (req) {
      const msg = `Hi ${req.employee?.full_name}, your ${req.leave_type?.name} request from ${formatDate(req.start_date)} has been ${status.toUpperCase()}. ${reviewNote ? 'Note: ' + reviewNote : ''} - MamaVege HR`
      window.open(generateWhatsAppLink(req.employee?.whatsapp_number || '60', msg), '_blank')
    }
    setSelected(null); setReviewNote(''); setLoading(false); loadData()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Leave Management  假期管理</h1>
        <p className="text-gray-500 text-sm mt-1">Review and approve leave requests</p>
      </div>
      <div className="flex gap-2 mb-5">
        {['pending','approved','rejected','all'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-green-700 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{f}</button>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {requests.length === 0 ? (
          <div className="p-8 text-center text-gray-400"><Calendar className="w-10 h-10 mx-auto mb-3 text-gray-200" />No {filter} leave requests</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {requests.map(req => (
              <div key={req.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-800 text-sm">{req.employee?.full_name}</p>
                      <span className="text-xs text-gray-500">{req.employee?.department}</span>
                    </div>
                    <p className="text-sm text-gray-600">{req.leave_type?.name} · {req.total_hours / 8} day(s)</p>
                    <p className="text-xs text-gray-400">{formatDate(req.start_date)}{req.end_date !== req.start_date ? ' → ' + formatDate(req.end_date) : ''}</p>
                    {req.reason && <p className="text-xs text-gray-400 italic mt-0.5">"{req.reason}"</p>}
                    {req.mc_amount && <p className="text-xs text-orange-500 mt-0.5">MC Claim: RM{req.mc_amount}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(req.status)}`}>{req.status}</span>
                    {req.status === 'pending' && <button onClick={() => setSelected(req)} className="p-2 hover:bg-gray-100 rounded-lg"><Eye className="w-4 h-4 text-gray-400" /></button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Review Leave Request</h2>
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
              <p className="text-sm"><span className="text-gray-500">Employee:</span> <strong>{selected.employee?.full_name}</strong></p>
              <p className="text-sm"><span className="text-gray-500">Type:</span> {selected.leave_type?.name}</p>
              <p className="text-sm"><span className="text-gray-500">Duration:</span> {selected.total_hours / 8} day(s)</p>
              <p className="text-sm"><span className="text-gray-500">Date:</span> {formatDate(selected.start_date)}</p>
              {selected.reason && <p className="text-sm"><span className="text-gray-500">Reason:</span> {selected.reason}</p>}
              {selected.mc_document_url && <a href={selected.mc_document_url} target="_blank" className="text-sm text-blue-500 underline">View MC Document</a>}
            </div>
            <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={2} placeholder="Add a note (optional)..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none text-sm resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setSelected(null); setReviewNote('') }} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancel</button>
              <button onClick={() => handleReview(selected.id, 'rejected')} disabled={loading} className="flex-1 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Reject</button>
              <button onClick={() => handleReview(selected.id, 'approved')} disabled={loading} className="flex-1 py-2.5 bg-green-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
