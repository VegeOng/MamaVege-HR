'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthRedirect() {
  const [msg, setMsg] = useState('Loading...')
  const supabase = createClient()

  useEffect(() => {
    let tries = 0
    const check = async () => {
      tries++
      setMsg(`Loading... (${tries})`)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        if (tries < 10) { setTimeout(check, 500); return }
        window.location.href = '/login'
        return
      }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      const role = data?.role
      setMsg('Role: ' + role)
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
        <p style={{fontSize:'18px',fontWeight:'600'}}>MamaVege HR</p>
        <p style={{color:'#74C69D',marginTop:'8px'}}>{msg}</p>
      </div>
    </div>
  )
}
