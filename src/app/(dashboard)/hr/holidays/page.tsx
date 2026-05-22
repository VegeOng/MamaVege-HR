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
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Public Holidays 公共假期</h1>
          <p className="text-gray-500 text-sm mt-1">{holidays.length} holidays</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-green-700 text-white rounded-xl text-sm font-medium">
          + Add Holiday
        </button>
      </div>
      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-5 border border-green-100">
          <h3 className="font-semibold text-gray-700 mb-4">New Holiday</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="e.g. Hari Raya" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">Description (optional)</label>
            <input value={desc} onChange={e => setDesc(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder="Optional notes" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm">Save</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Date','Day','Name','Description',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : holidays.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">No holidays yet</td></tr>
            ) : holidays.map((h, i) => (
              <tr key={h.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{h.date}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{new Date(h.date).toLocaleDateString('en-MY', { weekday: 'long' })}</td>
                <td className="px-4 py-3 text-sm text-gray-800">{h.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{h.description || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(h.id)} className="text-red-400 hover:text-red-600 text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
