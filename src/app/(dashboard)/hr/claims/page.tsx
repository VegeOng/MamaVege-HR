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
    const q = supabase.from('claims').select('*, profiles(full_name, employee_id, department)').order('created_at', { ascending: false })
    if (filter !== 'all') q.eq('status', filter)
    const { data } = await q
    setClaims(data || [])
    setLoading(false)
  }

  async function handleAction(id: string, status: string) {
    await supabase.from('claims').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id)
    loadData()
  }

  function fmtAmt(amt: number) {
    return 'RM ' + (amt || 0).toFixed(2)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Claims 报销管理</h1>
        <p className="text-gray-500 text-sm mt-1">Review and approve employee claims</p>
      </div>
      <div className="flex gap-2 mb-5">
        {['pending','approved','rejected','all'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-green-700 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{f}</button>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Employee','Date','Category','Amount','Description','Receipt','Status','Action'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading...</td></tr>
            : claims.length === 0 ? <tr><td colSpan={8} className="text-center py-10 text-gray-400">No claims</td></tr>
            : claims.map((r, i) => (
              <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{r.profiles?.full_name}<br/><span className="text-xs text-gray-400">{r.profiles?.employee_id}</span></td>
                <td className="px-4 py-3 text-sm text-gray-600">{r.date}</td>
                <td className="px-4 py-3 text-sm text-gray-600 capitalize">{r.category}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-800">{fmtAmt(r.amount)}</td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{r.description}</td>
                <td className="px-4 py-3 text-sm">
                  {r.receipt_url ? <a href={r.receipt_url} target="_blank" className="text-green-700 underline text-xs">View</a> : <span className="text-gray-400 text-xs">-</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
                </td>
                <td className="px-4
