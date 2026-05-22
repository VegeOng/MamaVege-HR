'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function HRClaimsPage() {
  const [claims, setClaims] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const supabase = createClient()

  useEffect(() => { loadData() }, [filter])

  async function loadData() {
    setLoading(true)
    let q = supabase.from('claims').select('*, profiles(full_name, employee_id)').order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setClaims(data || [])
    setLoading(false)
  }

  async function handleAction(id: string, status: string) {
    await supabase.from('claims').update({ status }).eq('id', id)
    loadData()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Claims 报销管理</h1>
      <p className="text-gray-500 text-sm mb-5">Review and approve employee claims</p>
      <div className="flex gap-2 mb-5">
        {['pending','approved','rejected','all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize ${filter === f ? 'bg-green-700 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {f}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Employee','Date','Category','Amount','Description','Status','Action'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : claims.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">No claims</td></tr>
            ) : claims.map((r, i) => (
              <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">
                  {r.profiles?.full_name}
                  <br/>
                  <span className="text-xs text-gray-400">{r.profiles?.employee_id}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{r.date}</td>
                <td className="px-4 py-3 text-sm text-gray-600 capitalize">{r.category}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-800">RM {(r.amount||0).toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{r.description}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(r.id, 'approved')} className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg">Approve</button>
                      <button onClick={() => handleAction(r.id, 'rejected')} className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg">Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
