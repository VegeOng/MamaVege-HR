'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthRedirect() {
  const [msg, setMsg] = useState('正在登入...')
  const supabase = createClient()

  useEffect(() => {
    let tries = 0
    const check = async () => {
      tries++
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        if (tries < 15) { setTimeout(check, 600); return }
        window.location.href = '/login'
        return
      }

      // 直接从 profiles 表读 role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()

      const role = profile?.role
      setMsg('Role: ' + role)

      if (role === 'director') window.location.href = '/director/dashboard'
      else if (role === 'hr') window.location.href = '/hr/dashboard'
      else if (role === 'supervisor') window.location.href = '/supervisor/dashboard'
      else window.location.href = '/employee/dashboard'
    }
    
    // 等 800ms 再开始，给 Supabase 时间写 cookie
    setTimeout(check, 800)
  }, [])

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#1B4332'}}>
      <div style={{textAlign:'center',color:'white'}}>
        <div style={{fontSize:'48px',marginBottom:'16px'}}>🌿</div>
        <p style={{fontSize:'18px',fontWeight:'600'}}>MamaVege HR</p>
        <p style={{color:'#74C69D',marginTop:'8px'}}>{msg}</p>
      </div>
    </div>
  )
}
