'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function HRHolidaysPage() {
  const [holidays, setHolidays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', date: '', description: '' })
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase.from('public_holidays').select('*').order('date')
    setHolidays(data || [])
    setLoading(false)
  }

  async function handleAdd() {
    if (!form.name || !form.date) return
    await supabase.from('public_holidays').insert({ name: form.name, date: form.date, description: form.description })
    setForm({ name: '', date: '', description: '' })
    setShowAdd(false)
    loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this holiday?')) return
    await supabase.from('public_holidays').delete().eq('id', id)
    loadData()
  }

  const year = new Date().getFullYear()
  const thisYear = holidays.filter(h => h.date?.startsWith(year.toString()))

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Public Holidays 公共假期</h1>
          <p className="text-gray-500 text-sm mt-1">{thisYear.length} holidays in {year}</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-green-700 text-white rounded-xl text-sm font-medium">
          + Add Holiday
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-5 border border-green-100">
          <h3 className="font-semibold text-gray-700 mb-4">New Holiday</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Holiday Name</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="e.g. Hari Raya" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">Description (optional)</label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Optional notes" />
          </div>
          <div className="flex gap-2">
