'use client'

import { useState } from 'react'
import { ClipboardList, CalendarCheck } from 'lucide-react'
import OTApprovals from '@/components/supervisor/OTApprovals'
import TeamAttendance from '@/components/supervisor/TeamAttendance'

type Tab = 'ot' | 'attendance'

export default function SupervisorDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('ot')

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'ot', label: '加班审批 OT Approvals', icon: <ClipboardList size={15} /> },
    { id: 'attendance', label: '出勤 Attendance', icon: <CalendarCheck size={15} /> },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1B4332', margin: 0 }}>
          Supervisor Dashboard 主管面板
        </h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '6px' }}>
          Manage your team's OT requests and attendance
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', fontSize: '13px',
              fontWeight: activeTab === tab.id ? '600' : '400',
              color: activeTab === tab.id ? '#1B4332' : '#6B7280',
              borderBottom: `2px solid ${activeTab === tab.id ? '#1B4332' : 'transparent'}`,
              marginBottom: '-2px', background: 'none', border: 'none',
              borderBottomStyle: 'solid', borderBottomWidth: '2px',
              borderBottomColor: activeTab === tab.id ? '#1B4332' : 'transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'ot' && <OTApprovals />}
      {activeTab === 'attendance' && <TeamAttendance />}
    </div>
  )
}
