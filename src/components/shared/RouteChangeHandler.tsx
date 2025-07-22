import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Route metadata for better UX
const routeMetadata: Record<string, { title: string; description?: string }> = {
  '/': { title: 'hosty.live - Decentralized Web Hosting', description: 'Deploy your web applications on the Internet Computer' },
  '/panel/canisters': { title: 'Canisters - hosty.live', description: 'Manage your deployed applications' },
  '/panel/deployments': { title: 'Deployments - hosty.live', description: 'Track your deployment history' },
  '/panel/cycles': { title: 'Cycles - hosty.live', description: 'Manage your compute cycles' },
  '/panel/settings': { title: 'Settings - hosty.live', description: 'Configure your account preferences' },
  '/panel/sign-in': { title: 'Sign In - hosty.live' },
  '/panel/sign-up': { title: 'Sign Up - hosty.live' },
}

export function RouteChangeHandler() {
  const location = useLocation()

  useEffect(() => {
    // Update document title based on current route
    const getPageTitle = (pathname: string): string => {
      // Check for exact matches first
      if (routeMetadata[pathname]) {
        return routeMetadata[pathname].title
      }
      
      // Handle dynamic routes
      if (pathname.startsWith('/panel/canister/')) {
        return 'Canister Details - hosty.live'
      }
      
      if (pathname.startsWith('/panel/deployment/')) {
        return 'Deployment Details - hosty.live'
      }
      
      // Default title
      return 'hosty.live'
    }

    const newTitle = getPageTitle(location.pathname)
    document.title = newTitle

    // Update meta description if available
    const metaDescription = document.querySelector('meta[name="description"]')
    const routeData = routeMetadata[location.pathname]
    
    if (metaDescription && routeData?.description) {
      metaDescription.setAttribute('content', routeData.description)
    }

    // Scroll to top on route change (with smooth behavior for better UX)
    window.scrollTo({ top: 0, behavior: 'smooth' })

    // Analytics tracking (add your analytics service here)
    // gtag('config', 'GA_MEASUREMENT_ID', {
    //   page_path: location.pathname,
    // })

  }, [location])

  // Track route loading time for performance monitoring
  useEffect(() => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const loadTime = endTime - startTime
      
      // Log route performance in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`Route ${location.pathname} loaded in ${loadTime.toFixed(2)}ms`)
      }
      
      // Send to analytics in production
      // sendPerformanceMetric('route_load_time', loadTime, location.pathname)
    }
  }, [location])

  return null
}