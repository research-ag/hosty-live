import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Footer } from './Footer'
import { DeploySessionCard } from './DeploySessionCard'
import { useRealTimeDeployments } from '../../hooks/useRealTimeDeployments'

// Keeps one socket open for the whole panel so deploy session requests show up
// on every page, not only on the deployments pages.
function RealtimeWatcher() {
  useRealTimeDeployments()
  return null
}

export function PanelLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <div className="hidden lg:block w-px bg-border" />
        <main className="flex-1 overflow-auto">
          <RealtimeWatcher />
          <DeploySessionCard />
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  )
}