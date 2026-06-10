'use client'

import { useState } from 'react'
import { ClipboardList, CalendarCheck } from 'lucide-react'
import OTApprovals from '@/components/supervisor/OTApprovals'
import TeamAttendance from '@/components/supervisor/TeamAttendance'
import { colors, radius, styles, font } from '@/lib/design'

type Tab = 'ot' | 'attendance'

export default function SupervisorDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('ot')

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'ot', label: '加班审批 OT Approvals', icon: <ClipboardList size={15} /> },
    { id: 'attendance', label: '出勤 Team Attendance', icon: <CalendarCheck size={15} /> },
  ]

  return (
    <div style={{ ...styles.pageWrapper }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ ...styles.pageTitle }}>Supervisor Dashboard 主管面板</h1>
          <p style={{ ...styles.pageSubtitle }}>Manage your team's OT requests and attendance</p>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 18px', borderRadius: radius.full, fontSize: font.sm, fontWeight: '600',
              border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? colors.primary : 'white',
              color: activeTab === tab.id ? 'white' : colors.textMuted,
              boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
            }}>
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'ot' && <OTApprovals />}
        {activeTab === 'attendance' && <TeamAttendance />}
      </div>
    </div>
  )
}
