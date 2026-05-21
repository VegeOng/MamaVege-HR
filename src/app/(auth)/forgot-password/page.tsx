'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Leaf, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 to-green-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-2xl mb-4">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">MamaVege HR</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <Link href="/login" className="flex items-center text-gray-500 hover:text-gray-700 mb-6 text-sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
          </Link>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Reset Password</h2>
          <p className="text-gray-500 text-sm mb-6">Enter your email to receive a reset link.</p>
          {sent ? (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              ✅ Reset link sent! Check your email inbox.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="your@email.com"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
