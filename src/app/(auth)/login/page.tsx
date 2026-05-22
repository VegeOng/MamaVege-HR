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
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    if (data.user) {
      // 直接从 profiles 表读 role，不经过 API
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      const role = profile?.role

      if (role === 'director') window.location.replace('/auth/redirect')
      else if (role === 'hr') window.location.replace('/auth/redirect')
      else if (role === 'supervisor') window.location.replace('/auth/redirect')
      else window.location.replace('/auth/redirect')
    }

    setLoading(false)
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#1B4332'}}>
      <div style={{background:'white',padding:'40px',borderRadius:'16px',width:'100%',maxWidth:'400px',margin:'0 16px',boxShadow:'0 25px 60px rgba(0,0,0,0.3)'}}>
        <div style={{textAlign:'center',marginBottom:'28px'}}>
          <div style={{width:'60px',height:'60px',borderRadius:'18px',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',fontSize:'30px'}}>🌿</div>
          <h1 style={{fontSize:'26px',fontWeight:'700',color:'#1B4332',margin:'0 0 4px'}}>MamaVege HR</h1>
          <p style={{color:'#6B7280',margin:0,fontSize:'13px'}}>HR Management System</p>
        </div>
        {error && <div style={{background:'#FEF2F2',color:'#DC2626',padding:'12px',borderRadius:'8px',marginBottom:'16px',fontSize:'13px'}}>{error}</div>}
        <form onSubmit={handleLogin}>
          <div style={{marginBottom:'14px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'600',marginBottom:'6px',color:'#374151'}}>Email Address</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              style={{width:'100%',padding:'11px 14px',border:'1.5px solid #E5E7EB',borderRadius:'10px',fontSize:'14px',boxSizing:'border-box'}}
              placeholder="your@email.com" required />
          </div>
          <div style={{marginBottom:'8px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'600',marginBottom:'6px',color:'#374151'}}>Password 密码</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
              style={{width:'100%',padding:'11px 14px',border:'1.5px solid #E5E7EB',borderRadius:'10px',fontSize:'14px',boxSizing:'border-box'}}
              placeholder="••••••••" required />
          </div>
          <div style={{textAlign:'right',marginBottom:'20px'}}>
            <a href="/forgot-password" style={{fontSize:'12px',color:'#2D6A4F',textDecoration:'none'}}>Forgot password? 忘记密码？</a>
          </div>
          <button type="submit" disabled={loading}
            style={{width:'100%',padding:'13px',background:loading?'#9CA3AF':'#2D6A4F',color:'white',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'600',cursor:'pointer'}}>
            {loading ? 'Signing in...' : 'Sign In 登入'}
          </button>
        </form>
        <p style={{textAlign:'center',color:'#9CA3AF',fontSize:'11px',marginTop:'24px'}}>Mama Global International Sdn Bhd (1247551-X)</p>
      </div>
    </div>
  )
}
