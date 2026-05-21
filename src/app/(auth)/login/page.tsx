'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
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
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role === 'hr') router.push('/hr/dashboard')
      else if (profile?.role === 'director') router.push('/director/dashboard')
      else if (profile?.role === 'supervisor') router.push('/employee/dashboard')
      else router.push('/employee/dashboard')
    }
    setLoading(false)
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#1B4332'}}>
      <div style={{background:'white',padding:'40px',borderRadius:'16px',width:'100%',maxWidth:'400px'}}>
        <div style={{textAlign:'center',marginBottom:'24px'}}>
          <h1 style={{fontSize:'28px',fontWeight:'bold',color:'#1B4332'}}>MamaVege HR</h1>
          <p style={{color:'#666',marginTop:'4px'}}>HR Management System</p>
        </div>
        {error && <div style={{background:'#fee2e2',color:'#dc2626',padding:'12px',borderRadius:'8px',marginBottom:'16px',fontSize:'14px'}}>{error}</div>}
        <form onSubmit={handleLogin}>
          <div style={{marginBottom:'16px'}}>
            <label style={{display:'block',fontSize:'14px',fontWeight:'500',marginBottom:'6px'}}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              style={{width:'100%',padding:'12px',border:'1px solid #ddd',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'}}
              placeholder="your@email.com" required />
          </div>
          <div style={{marginBottom:'24px'}}>
            <label style={{display:'block',fontSize:'14px',fontWeight:'500',marginBottom:'6px'}}>Password 密码</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
              style={{width:'100%',padding:'12px',border:'1px solid #ddd',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'}}
              placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={loading}
            style={{width:'100%',padding:'14px',background:'#2D6A4F',color:'white',border:'none',borderRadius:'8px',fontSize:'16px',fontWeight:'600',cursor:'pointer'}}>
            {loading ? 'Signing in...' : 'Sign In 登入'}
          </button>
        </form>
        <p style={{textAlign:'center',color:'#999',fontSize:'12px',marginTop:'24px'}}>Mama Global International Sdn Bhd (1247551-X)</p>
      </div>
    </div>
  )
}
