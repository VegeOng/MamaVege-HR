'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DirectorDashboard() {
  const [stats, setStats] = useState({ employees: 0, present: 0, absent: 0, pendingLeaves: 0 })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const [{ count: emp }, { count: present }, { count: absent }, { count: leaves }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true).neq('role', 'director'),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).in('status', ['present', 'late']),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'absent'),
        supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ])
      setStats({ employees: emp || 0, present: present || 0, absent: absent || 0, pendingLeaves: leaves || 0 })
      setLoading(false)
    }
    load()
  }, [])

  const cards = [
    { label: 'Total Employees', value: stats.employees, icon: '👥', color: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
    { label: 'Present Today', value: stats.present, icon: '✅', color: '#F0FDF4', border: '#BBF7D0', text: '#15803D' },
    { label: 'Absent Today', value: stats.absent, icon: '❌', color: '#FEF2F2', border: '#FECACA', text: '#DC2626' },
    { label: 'Pending Leaves', value: stats.pendingLeaves, icon: '🌴', color: '#FFFBEB', border: '#FDE68A', text: '#D97706' },
  ]

  return (
    <div style={{padding:'32px',maxWidth:'1000px'}}>
      <div style={{marginBottom:'28px'}}>
        <h1 style={{fontSize:'24px',fontWeight:'700',color:'#111827',margin:'0 0 4px'}}>Director Dashboard</h1>
        <p style={{color:'#6B7280',fontSize:'14px',margin:0}}>
          {new Date().toLocaleDateString('en-MY', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </p>
      </div>

      {loading ? (
        <p style={{color:'#9CA3AF'}}>Loading...</p>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'16px',marginBottom:'28px'}}>
          {cards.map(card => (
            <div key={card.label} style={{background:card.color,border:`1px solid ${card.border}`,borderRadius:'14px',padding:'20px'}}>
              <div style={{fontSize:'28px',marginBottom:'8px'}}>{card.icon}</div>
              <p style={{fontSize:'32px',fontWeight:'700',color:card.text,margin:'0 0 4px'}}>{card.value}</p>
              <p style={{fontSize:'13px',color:'#6B7280',margin:0}}>{card.label}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{background:'#1B4332',borderRadius:'16px',padding:'24px',color:'white'}}>
        <p style={{color:'#74C69D',fontSize:'13px',margin:'0 0 4px'}}>Welcome to MamaVege HR System</p>
        <p style={{fontSize:'20px',fontWeight:'600',margin:'0 0 8px'}}>All data is real-time 📊</p>
        <p style={{color:'#74C69D',fontSize:'13px',margin:0}}>Check the Suggestion Box for employee feedback</p>
      </div>
    </div>
  )
}
