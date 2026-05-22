'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function HRDashboard() {
  const [stats, setStats] = useState({ employees:0, present:0, late:0, leaves:0, claims:0, ot:0 })
  const [payroll, setPayroll] = useState(0)
  const [leaves, setLeaves] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const [a,b,c,d,e,f,g,h] = await Promise.all([
        supabase.from('profiles').select('*',{count:'exact',head:true}).eq('is_active',true).neq('role','director'),
        supabase.from('attendance').select('*',{count:'exact',head:true}).eq('date',today).eq('status','present'),
        supabase.from('attendance').select('*',{count:'exact',head:true}).eq('date',today).eq('status','late'),
        supabase.from('leave_requests').select('*',{count:'exact',head:true}).eq('status','pending'),
        supabase.from('claims').select('*',{count:'exact',head:true}).eq('status','pending'),
        supabase.from('ot_requests').select('*',{count:'exact',head:true}).eq('status','pending'),
        supabase.from('profiles').select('basic_salary').eq('is_active',true).neq('role','director'),
        supabase.from('leave_requests').select('*, profiles(full_name)').eq('status','pending').limit(5),
      ])
      setStats({employees:a.count||0,present:b.count||0,late:c.count||0,leaves:d.count||0,claims:e.count||0,ot:f.count||0})
      setPayroll((g.data||[]).reduce((s:number,x:any)=>s+(x.basic_salary||0),0))
      setLeaves(h.data||[])
    }
    load()
  }, [])

  const cards = [
    {label:'Total Employees',value:stats.employees,icon:'👥',color:'#2563eb',link:'/hr/employees'},
    {label:'Present Today',value:stats.present,icon:'✅',color:'#16a34a',link:'/hr/attendance'},
    {label:'Late Today',value:stats.late,icon:'⏰',color:'#d97706',link:'/hr/attendance'},
    {label:'Pending Leaves',value:stats.leaves,icon:'🌴',color:'#ca8a04',link:'/hr/leave'},
    {label:'Pending Claims',value:stats.claims,icon:'💼',color:'#7c3aed',link:'/hr/claims'},
    {label:'Pending OT',value:stats.ot,icon:'📈',color:'#dc2626',link:'/hr/ot'},
  ]

  return (
    <div style={{padding:'32px',maxWidth:'1200px'}}>
      <h1 style={{fontSize:'28px',fontWeight:'700',color:'#1B4332',margin:'0 0 4px'}}>HR Dashboard</h1>
      <p style={{color:'#6B7280',margin:'0 0 24px',fontSize:'14px'}}>{new Date().toLocaleDateString('en-MY',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px',marginBottom:'24px'}}>
        {cards.map(c=>(
          <Link key={c.label} href={c.link} style={{textDecoration:'none'}}>
            <div style={{background:'white',borderRadius:'12px',padding:'20px',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                <span style={{fontSize:'13px',color:'#6B7280'}}>{c.label}</span>
                <span style={{fontSize:'24px'}}>{c.icon}</span>
              </div>
              <p style={{fontSize:'36px',fontWeight:'700',color:c.color,margin:0}}>{c.value}</p>
            </div>
          </Link>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
        <div style={{background:'white',borderRadius:'12px',padding:'20px',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
          <p style={{color:'#6B7280',fontSize:'13px',margin:'0 0 8px'}}>This Month Payroll 本月薪资</p>
          <p style={{fontSize:'28px',fontWeight:'700',color:'#1B4332',margin:'0 0 4px'}}>RM {payroll.toFixed(2)}</p>
          <Link href="/hr/payroll" style={{fontSize:'13px',color:'#2D6A4F',textDecoration:'none',fontWeight:'600'}}>Manage Payroll →</Link>
        </div>
        <div style={{background:'white',borderRadius:'12px',padding:'20px',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'16px'}}>
            <p style={{fontWeight:'600',color:'#111827',margin:0}}>Pending Leaves</p>
            <Link href="/hr/leave" style={{fontSize:'12px',color:'#2D6A4F',textDecoration:'none'}}>View all →</Link>
          </div>
          {leaves.length===0?(
            <p style={{color:'#9CA3AF',fontSize:'14px',textAlign:'center',padding:'20px 0'}}>✅ No pending requests</p>
          ):leaves.map(l=>(
            <div key={l.id} style={{padding:'8px 0',borderBottom:'1px solid #F3F4F6'}}>
              <p style={{fontSize:'13px',fontWeight:'600',color:'#111827',margin:0}}>{l.profiles?.full_name}</p>
              <p style={{fontSize:'12px',color:'#6B7280',margin:0}}>{l.leave_type} · {l.start_date}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
