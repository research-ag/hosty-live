import { Outlet } from 'react-router-dom'
import { PublicHeader } from './PublicHeader'
import { Footer } from '../panel/Footer'

export function SharedLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />
      <main className="flex-1 bg-background relative overflow-auto">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

