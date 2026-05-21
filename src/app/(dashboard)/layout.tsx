import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/ui/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role={profile.role} userName={profile.full_name} />
      <main className="flex-1 overflow-y-auto">
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          <div className="watermark">{profile.full_name}</div>
        </div>
        {children}
      </main>
    </div>
  )
}
