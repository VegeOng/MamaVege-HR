'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthRedirect() {
  const supabase = createClient()

  useEffect(() => {
    async function go() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile) {
        // First time login (e.g. via Google) — create a pending profile for HR to review
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'New User'
        const tempId = `PENDING-${user.id.slice(0, 8).toUpperCase()}`
        await supabase.from('profiles').insert({
          id: user.id,
          employee_id: tempId,
          full_name: fullName,
          email: user.email,
          role: 'pending',
          avatar_url: user.user_metadata?.avatar_url || null,
          is_active: false,
        })
        window.location.href = '/pending-approval'
        return
      }

      const role = profile?.role
      if (role === 'director') window.location.href = '/director/dashboard'
      else if (role === 'hr') window.location.href = '/hr/dashboard'
      else if (role === 'supervisor') window.location.href = '/supervisor/dashboard'
      else if (role === 'pending') window.location.href = '/pending-approval'
      else window.location.href = '/employee/dashboard'
    }
    go()
  }, [])

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#1B4332'}}>
      <div style={{textAlign:'center',color:'white'}}>
        <div style={{fontSize:'48px',marginBottom:'16px'}}>🌿</div>
        <p style={{fontSize:'18px',fontWeight:'600'}}>MamaVege HR</p>
        <p style={{color:'#74C69D',marginTop:'8px'}}>Loading...</p>
      </div>
    </div>
  )
}
