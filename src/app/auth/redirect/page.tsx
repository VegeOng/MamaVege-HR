'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthRedirect() {
  const supabase = createClient()

  useEffect(() => {
    async function redirect() {
      await new Promise(r => setTimeout(r, 1000))
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const role = data?.role
      
      if (role === 'director') window.location.href = '/director/dashboard'
      else if (role === 'hr') window.location.href = '/hr/dashboard'
      else window.location.href = '/employee/dashboard'
    }
    redirect()
  }, [])

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#1B4332'}}>
      <div style={{textAlign:'center',color:'white'}}>
        <div style={{fontSize:'48px',marginBottom:'16px'}}>🌿</div>
        <p style={{fontSize:'18px',fontWeight:'600'}}>MamaVege HR</p>
        <p style={{color:'#74C69D',marginTop:'8px'}}>Loading your dashboard...</p>
      </div>
    </div>
  )
}
