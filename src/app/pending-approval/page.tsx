'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Hourglass } from 'lucide-react'

export default function PendingApprovalPage() {
  const [email, setEmail] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      setEmail(user.email || '')
    })
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1B4332' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '420px', margin: '0 16px', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', textAlign: 'center' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%', background: '#FEF9C3',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <Hourglass size={26} color="#CA8A04" />
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', margin: '0 0 8px' }}>
          Account Pending Approval 帐号待审核
        </h1>
        <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: 1.7, margin: '0 0 4px' }}>
          您的账户（{email}）已成功登入，但尚未由 HR 分配角色与权限。请联系 HR 完成账户设置后再登入。
        </p>
        <p style={{ color: '#6B7280', fontSize: '13px', lineHeight: 1.7, margin: '0 0 24px' }}>
          Your account ({email}) has signed in successfully, but HR has not yet assigned your role. Please contact HR to complete your account setup.
        </p>
        <button onClick={handleSignOut} style={{
          width: '100%', padding: '12px', background: '#2D6A4F', color: 'white', border: 'none',
          borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
        }}>
          Sign Out 登出
        </button>
      </div>
    </div>
  )
}
