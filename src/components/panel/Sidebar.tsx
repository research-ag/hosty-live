import { Link, useLocation } from 'react-router-dom'
import { Server, Zap, Coins, Settings } from 'lucide-react'
import { cn } from '../../lib/utils'

const navigation = [
  { name: 'Canisters', href: '/panel/canisters', icon: Server },
  { name: 'Deployments', href: '/panel/deployments', icon: Zap },
  { name: 'Cycles', href: '/panel/cycles', icon: Coins },
  { name: 'TCYCLES', href: '/panel/tcycles', icon: Coins },
  { name: 'Settings', href: '/panel/settings', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()

  const isActivePath = (href: string) => {
    // Handle exact matches first
    if (location.pathname === href) {
      return true
    }
    
    // Handle nested routes - map child routes to their parent
    const pathMappings = {
      '/panel/canisters': ['/panel/canister/'], // canister detail pages
      '/panel/deployments': ['/panel/deployment/'], // deployment detail pages
    }
    
    const childPaths = pathMappings[href as keyof typeof pathMappings]
    if (childPaths) {
      return childPaths.some(childPath => location.pathname.startsWith(childPath))
    }
    
    // Default to startsWith for other cases
    return location.pathname.startsWith(href)
  }
  return (
    <aside className="hidden lg:flex h-full w-64 flex-col bg-card">
      {/* Main navigation content */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = isActivePath(item.href)
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                "hover:translate-x-1 group relative",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent hover:shadow-sm"
              )}
            >
              {/* Active indicator line */}
              {isActive && (
                <div className="absolute left-0 top-0 h-full w-1 bg-primary-foreground rounded-r-full opacity-75" />
              )}
              <item.icon className={cn(
                "mr-3 h-5 w-5 transition-all duration-200",
                isActive ? "text-primary-foreground" : "group-hover:scale-110 group-hover:text-primary"
              )} />
              <span className="transition-all duration-200">
                {item.name}
              </span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}