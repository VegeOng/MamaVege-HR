'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (!p) { router.push('/login'); return }
      setProfile(p)
      setLoading(false)
    }
    load()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f9fafb'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'32px',marginBottom:'12px'}}>🌿</div>
        <p style={{color:'#666',fontSize:'14px'}}>Loading MamaVege HR...</p>
      </div>
    </div>
  )

  const role = profile?.role
  const navItems = role === 'hr' ? [
    { href: '/hr/dashboard', label: '📊 Dashboard' },
    { href: '/hr/employees', label: '👥 Employees' },
    { href: '/hr/attendance', label: '⏰ Attendance' },
    { href: '/hr/leave', label: '🌴 Leave' },
    { href: '/hr/ot', label: '⏱ Overtime' },
    { href: '/hr/claims', label: '💼 Claims' },
    { href: '/hr/payroll', label: '💰 Payroll' },
    { href: '/hr/holidays', label: '📅 Holidays' },
    { href: '/hr/settings', label: '⚙️ Settings' },
  ] : role === 'director' ? [
    { href: '/director/dashboard', label: '📊 Dashboard' },
    { href: '/director/suggestions', label: '💬 Suggestions' },
  ] : role === 'supervisor' ? [
    { href: '/supervisor/dashboard', label: '📊 Dashboard' },
    { href: '/supervisor/attendance', label: '⏰ Attendance' },
    { href: '/supervisor/leave', label: '🌴 Leave' },
  ] : [
    { href: '/employee/dashboard', label: '📊 Dashboard' },
    { href: '/employee/attendance', label: '⏰ Attendance' },
    { href: '/employee/leave', label: '🌴 Leave' },
    { href: '/employee/ot', label: '⏱ Overtime' },
    { href: '/employee/claims', label: '💼 Claims' },
    { href: '/employee/payslip', label: '💰 Payslip' },
    { href: '/employee/documents', label: '📁 Documents' },
    { href: '/employee/suggestion', label: '💬 Suggestion Box' },
  ]

  return (
    <div style={{display:'flex',minHeight:'100vh',fontFamily:'-apple-system,sans-serif'}}>
      <div style={{width:'240px',background:'#1B4332',display:'flex',flexDirection:'column',position:'fixed',top:0,left:0,height:'100vh',overflowY:'auto',zIndex:100}}>
        <div style={{padding:'20px 16px',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
          <p style={{color:'white',fontWeight:'700',fontSize:'14px',margin:0}}>🌿 MamaVege HR</p>
          <p style={{color:'#52B788',fontSize:'11px',margin:0,textTransform:'capitalize'}}>{role}</p>
        </div>
        <div style={{padding:'10px 16px',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
          <p style={{color:'#74C69D',fontSize:'11px',margin:'0 0 2px'}}>Logged in as</p>
          <p style={{color:'white',fontSize:'13px',margin:0}}>{profile?.full_name || profile?.email}</p>
        </div>
        <nav style={{flex:1,padding:'8px'}}>
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href} style={{
                display:'block',padding:'9px 12px',borderRadius:'8px',marginBottom:'2px',
                background:active?'rgba(82,183,136,0.25)':'transparent',
                color:active?'#D8F3DC':'#95D5B2',textDecoration:'none',fontSize:'13px',
                fontWeight:active?'600':'400',
                borderLeft:active?'3px solid #52B788':'3px solid transparent',
              }}>{item.label}</Link>
            )
          })}
        </nav>
        <div style={{padding:'8px',borderTop:'1px solid rgba(255,255,255,0.1)'}}>
          <button onClick={handleLogout} style={{width:'100%',padding:'9px 12px',borderRadius:'8px',border:'none',background:'transparent',color:'#95D5B2',fontSize:'13px',cursor:'pointer',textAlign:'left'}}>
            🚪 Sign Out 登出
          </button>
        </div>
      </div>
      <div style={{flex:1,marginLeft:'240px',background:'#f9fafb',minHeight:'100vh'}}>
        {children}
      </div>
    </div>
  )
}
