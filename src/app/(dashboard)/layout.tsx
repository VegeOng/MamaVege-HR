export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{display:'flex',minHeight:'100vh',fontFamily:'-apple-system,sans-serif'}}>
      <div style={{flex:1,background:'#f9fafb'}}>
        {children}
      </div>
    </div>
  )
}
