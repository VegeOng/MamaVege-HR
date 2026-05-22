'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      setError('Invalid email or password. 邮箱或密码错误。')
      setLoading(false)
      return
    }

    if (data.user && data.session) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=role&id=eq.${data.user.id}&limit=1`,
          {
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              'Authorization': `Bearer ${data.session.access_token}`,
              'Content-Type': 'application/json',
            }
          }
        )
        const profiles = await response.json()
        const role = profiles?.[0]?.role

        if (role === 'director') {
          window.location.replace('/director/dashboard')
        } else if (role === 'hr') {
          window.location.replace('/hr/dashboard')
        } else if (role === 'supervisor') {
          window.location.replace('/employee/dashboard')
        } else {
          window.location.replace('/employee/dashboard')
        }
      } catch (err) {
        window.location.replace('/employee/dashboard')
      }
    }
    setLoading(false)
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#1B4332'}}>
      <div style={{background:'white',padding:'40px',borderRadius:'16px',width:'100%',maxWidth:'400px',margin:'0 16px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
        <div style={{textAlign:'center',marginBottom:'28px'}}>
          <div style={{width:'60px',height:'60px',background:'#52B788',borderRadius:'18px',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',fontSize:'30px'}}>🌿</div>
          <h1 style={{fontSize:'26px',fontWeight:'700',color:'#1B4332',margin:'0 0 4px'}}>MamaVege HR</h1>
          <p style={{color:'#6B7280',margin:0,fontSize:'13px'}}>HR Management System</p>
        </div>
        {error && (
          <div style={{background:'#FEF2F2',color:'#DC2626',padding:'12px',borderRadius:'8px',marginBottom:'16px',fontSize:'13px',border:'1px solid #FECACA'}}>
            {error}
          </div>
        )}
        <form onSubmit={handleLogin}>
          <div style={{marginBottom:'14px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'600',marginBottom:'6px',color:'#374151'}}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{width:'100%',padding:'11px 14px',border:'1.5px solid #E5E7EB',borderRadius:'10px',fontSize:'14px',boxSizing:'border-box',outline:'none'}}
              placeholder="your@email.com"
              required
            />
          </div>
          <div style={{marginBottom:'8px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'600',marginBottom:'6px',color:'#374151'}}>
              Password 密码
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{width:'100%',padding:'11px 14px',border:'1.5px solid #E5E7EB',borderRadius:'10px',fontSize:'14px',boxSizing:'border-box',outline:'none'}}
              placeholder="••••••••"
              required
            />
          </div>
          <div style={{textAlign:'right',marginBottom:'20px'}}>
            <a href="/forgot-password" style={{fontSize:'12px',color:'#2D6A4F',textDecoration:'none'}}>
              Forgot password? 忘记密码？
            </a>
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{width:'100%',padding:'13px',background:loading?'#9CA3AF':'#2D6A4F',color:'white',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'600',cursor:loading?'not-allowed':'pointer'}}
          >
            {loading ? 'Signing in... 登入中' : 'Sign In 登入'}
          </button>
        </form>
        <p style={{textAlign:'center',color:'#9CA3AF',fontSize:'11px',marginTop:'24px'}}>
          Mama Global International Sdn Bhd (1247551-X)
        </p>
      </div>
    </div>
  )
}
