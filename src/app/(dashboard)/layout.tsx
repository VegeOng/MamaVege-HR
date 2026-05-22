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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=*&id=eq.${session.user.id}&limit=1`,
        {
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${session.access_token}`,
          }
        }
      )
      const profiles = await response.json()
      if (!profiles?.[0]) { router.push('/login'); return }
      setProfile(profiles[0])
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
        <div style={{fontSize:'40px',marginBottom:'12px'}}>🌿</div>
        <p style={{color:'#6B7280',fontSize:'14px'}}>Loading MamaVege HR...</p>
      </div>
    </div>
  )

  const role = profile?.role
  const navItems = role === 'hr' ? [
    { href: '/hr/dashboard', label: '📊 Dashboard' },
    { href: '/hr/employees', label: '👥 Employees 员工' },
    { href: '/hr/attendance', label: '⏰ Attendance 打卡' },
    { href: '/hr/leave', label: '🌴 Leave 假期' },
    { href: '/hr/ot', label: '⏱ Overtime 加班' },
    { href: '/hr/claims', label: '💼 Claims 报销' },
    { href: '/hr/payroll', label: '💰 Payroll 薪资' },
    { href: '/hr/holidays', label: '📅 Public Holidays' },
    { href: '/hr/settings', label: '⚙️ Settings' },
  ] : role === 'director' ? [
    { href: '/director/dashboard', label: '📊 Dashboard' },
    { href: '/director/suggestions', label: '💬 Suggestions 建议箱' },
  ] : role === 'supervisor' ? [
    { href: '/employee/dashboard', label: '📊 Dashboard' },
    { href: '/employee/attendance', label: '⏰ Attendance 打卡' },
    { href: '/employee/leave', label: '🌴 Leave 假期' },
    { href: '/employee/ot', label: '⏱ My OT' },
    { href: '/supervisor/ot', label: '✅ Approve OT' },
    { href: '/employee/claims', label: '💼 Claims 报销' },
    { href: '/employee/payslip', label: '💰 Payslip' },
    { href: '/employee/suggestion', label: '💬 Suggestion Box' },
  ] : [
    { href: '/employee/dashboard', label: '📊 Dashboard' },
    { href: '/employee/attendance', label: '⏰ Attendance 打卡' },
    { href: '/employee/leave', label: '🌴 Leave 假期' },
    { href: '/employee/ot', label: '⏱ Overtime 加班' },
    { href: '/employee/claims', label: '💼 Claims 报销' },
    { href: '/employee/payslip', label: '💰 Payslip 薪资单' },
    { href: '/employee/documents', label: '📄 Documents 文件' },
    { href: '/employee/suggestion', label: '💬 Suggestion Box' },
  ]

  return (
    <div style={{display:'flex',minHeight:'100vh',fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif'}}>
      <div style={{width:'240px',background:'#1B4332',display:'flex',flexDirection:'column',position:'fixed',top:0,left:0,height:'100vh',overflowY:'auto',zIndex:100}}>
        <div style={{padding:'20px 16px',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'36px',height:'36px',background:'#52B788',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0}}>🌿</div>
            <div>
              <p style={{color:'white',fontWeight:'700',fontSize:'14px',margin:0}}>MamaVege HR</p>
              <p style={{color:'#52B788',fontSize:'11px',margin:0,textTransform:'capitalize'}}>{role}</p>
            </div>
          </div>
        </div>
        <div style={{padding:'10px 16px',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
          <p style={{color:'#74C69D',fontSize:'11px',margin:'0 0 2px'}}>Logged in as</p>
          <p style={{color:'white',fontSize:'13px',fontWeight:'500',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.full_name}</p>
        </div>
        <nav style={{flex:1,padding:'8px',overflowY:'auto'}}>
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href} style={{
                display:'block',padding:'9px 12px',borderRadius:'8px',marginBottom:'2px',
                background: active ? 'rgba(82,183,136,0.25)' : 'transparent',
                color: active ? '#D8F3DC' : '#95D5B2',
                textDecoration:'none',fontSize:'13px',
                fontWeight: active ? '600' : '400',
                borderLeft: active ? '3px solid #52B788' : '3px solid transparent',
              }}>
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div style={{padding:'8px',borderTop:'1px solid rgba(255,255,255,0.1)'}}>
          <button onClick={handleLogout} style={{
            width:'100%',padding:'9px 12px',borderRadius:'8px',border:'none',
            background:'transparent',color:'#95D5B2',fontSize:'13px',cursor:'pointer',textAlign:'left',
          }}>
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
