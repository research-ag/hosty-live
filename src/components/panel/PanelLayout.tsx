import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Footer } from './Footer'

export function PanelLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex flex-1 relative">
        <Sidebar />
        
        {/* Full-height vertical divider */}
        <div className="hidden lg:block relative">
          {/* Main divider line */}
          <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-border/40 via-border/60 to-border/40" />
          
          {/* Subtle shadow effect */}
          <div className="absolute top-0 left-1 w-px h-full bg-gradient-to-b from-transparent via-border/20 to-transparent" />
          
          {/* Enhanced visual separation */}
          <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        </div>
        
        <main className="flex-1 bg-background relative overflow-auto">
          {/* Mobile gradient overlay for depth when sidebar is hidden */}
          <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-background/50 to-transparent pointer-events-none lg:hidden" />
          
          {/* Subtle content spacing from divider */}
          <div className="hidden lg:block absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-background/30 to-transparent pointer-events-none" />
          
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  )
}