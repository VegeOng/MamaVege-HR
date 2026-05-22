'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const supabase = createClient()
  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      const role = data?.role
      if (role === 'director') window.location.href = '/director/dashboard'
      else if (role === 'hr') window.location.href = '/hr/dashboard'
      else window.location.href = '/employee/dashboard'
    }
    check()
  }, [])
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#1B4332'}}>
      <div style={{textAlign:'center',color:'white'}}>
        <div style={{fontSize:'48px',marginBottom:'16px'}}>🌿</div>
        <p>Loading...</p>
      </div>
    </div>
  )
}
