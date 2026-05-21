'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Lock, User, Eye } from 'lucide-react'

const CATEGORIES: Record<string, string> = {
  company_operations: 'Company Operations',
  teamwork: 'Teamwork',
  work_environment: 'Work Environment',
  salary_benefits: 'Salary & Benefits',
  others: 'Others',
}

export default function DirectorSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => { loadData() }, [filter])

  async function loadData() {
    const query = supabase.from('suggestions').select('*, employee:profiles(full_name, department)').order('created_at', { ascending: false })
    if (filter !== 'all') query.eq('status', filter)
    const { data } = await query
    setSuggestions(data || [])
    await supabase.from('suggestions').update({ status: 'read' }).eq('status', 'unread')
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Suggestion Box  建议箱</h1>
        <p className="text-gray-500 text-sm mt-1">Private feedback from employees — only visible to you</p>
      </div>
      <div className="flex gap-2 mb-5">
        {['all','unread','read'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-green-700 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{f}</button>
        ))}
      </div>
      <div className="space-y-4">
        {suggestions.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No suggestions yet</p>
          </div>
        ) : suggestions.map(s => (
          <div key={s.id} className={`bg-white rounded-xl shadow-sm border p-5 cursor-pointer hover:shadow-md transition-shadow ${s.status === 'unread' ? 'border-green-300' : 'border-gray-100'}`} onClick={() => setSelected(s)}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {s.is_anonymous ? <Lock className="w-3 h-3 text-gray-400" /> : <User className="w-3 h-3 text-gray-400" />}
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{CATEGORIES[s.category]}</span>
                  {s.status === 'unread' && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">New</span>}
                </div>
                <h3 className="font-semibold text-gray-800">{s.title}</h3>
                <p className="text-xs text-gray-400 mt-1">{s.is_anonymous ? 'Anonymous' : s.employee?.full_name + ' · ' + s.employee?.department}</p>
              </div>
              <p className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString()}</p>
            </div>
            <p className="text-sm text-gray-600 mt-3 line-clamp-2">{s.content}</p>
          </div>
        ))}
      </div>
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{CATEGORIES[selected.category]}</span>
                <h2 className="font-semibold text-gray-800 mt-2">{selected.title}</h2>
                <p className="text-xs text-gray-400 mt-1">{selected.is_anonymous ? '🔒 Anonymous' : selected.employee?.full_name + ' · ' + selected.employee?.department}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.content}</p>
            </div>
            <p className="text-xs text-gray-400 mt-3">{new Date(selected.created_at).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  )
}
