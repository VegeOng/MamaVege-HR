'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Plus, X, Lock, User } from 'lucide-react'

const CATEGORIES = [
  { value: 'company_operations', label: 'Company Operations  公司运营' },
  { value: 'teamwork', label: 'Teamwork  团队合作' },
  { value: 'work_environment', label: 'Work Environment  工作环境' },
  { value: 'salary_benefits', label: 'Salary & Benefits  薪资福利' },
  { value: 'others', label: 'Others  其他' },
]

export default function SuggestionPage() {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ category: '', title: '', content: '', is_anonymous: false })
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('suggestions').select('*').eq('employee_id', user.id).order('created_at', { ascending: false })
    setSuggestions(data || [])
  }

  async function handleSubmit() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('suggestions').insert({
      employee_id: user.id,
      is_anonymous: form.is_anonymous,
      category: form.category,
      title: form.title,
      content: form.content,
      status: 'unread',
    })

    setForm({ category: '', title: '', content: '', is_anonymous: false })
    setShowForm(false)
    setLoading(false)
    loadData()
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Suggestion Box  建议箱</h1>
          <p className="text-gray-500 text-sm mt-1">Your feedback goes directly to the Director</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> New Suggestion
        </button>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Lock className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800">Private & Confidential</p>
          <p className="text-xs text-green-600 mt-0.5">Only the Director can view suggestions. HR cannot see any submissions.</p>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-gray-800">New Suggestion</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category  分类</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none">
                  <option value="">Select category...</option>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title  标题</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none" placeholder="Brief title..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content  内容</label>
                <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={5} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none text-sm resize-none" placeholder="Share your suggestion or feedback..." />
              </div>
              <button onClick={() => setForm({...form, is_anonymous: !form.is_anonymous})}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-colors ${form.is_anonymous ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 hover:border-gray-300'}`}>
                {form.is_anonymous ? <Lock className="w-4 h-4" /> : <User className="w-4 h-4" />}
                <span className="text-sm font-medium">{form.is_anonymous ? 'Anonymous  匿名提交' : 'Show My Name  显示身份'}</span>
              </button>
              <button onClick={handleSubmit} disabled={loading || !form.category || !form.title || !form.content}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-xl disabled:opacity-50">
                {loading ? 'Submitting...' : 'Submit Suggestion'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {suggestions.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No suggestions yet. Share your feedback!</p>
          </div>
        ) : suggestions.map(s => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {s.is_anonymous && <Lock className="w-3 h-3 text-gray-400" />}
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{CATEGORIES.find(c => c.value === s.category)?.label.split('  ')[0]}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'unread' ? 'bg-yellow-100 text-yellow-600' : s.status === 'replied' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                </div>
                <h3 className="font-semibold text-gray-800">{s.title}</h3>
              </div>
              <span className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-gray-600">{s.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
