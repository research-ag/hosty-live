import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense } from 'react'
import { TooltipProvider } from './components/ui/Tooltip'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { LoadingPage } from './components/shared/LoadingPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PanelLayout } from './components/panel/PanelLayout'
import { SharedLayout } from './components/shared/SharedLayout'
import { HomePage } from './pages/marketing/HomePage'
import { SignInPage } from './pages/panel/SignInPage'
import { CanistersPage } from './pages/panel/CanistersPage'
import { CanisterPage } from './pages/panel/CanisterPage'
import { DeploymentsPage } from './pages/panel/DeploymentsPage'
import { DeploymentPage } from './pages/panel/DeploymentPage'
import { TCyclesPage } from './pages/panel/TCyclesPage'
import { SettingsPage } from './pages/panel/SettingsPage'
import { SharedCanisterPage } from './pages/shared/SharedCanisterPage'
import { Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/shared/ProtectedRoute'
import { RouteChangeHandler } from './components/shared/RouteChangeHandler'
import { ToastProvider } from './hooks/useToast'
import { useBackgroundScanner } from './hooks/useBackgroundScanner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function BackgroundScannerMount() {
  useBackgroundScanner()
  return null
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <TooltipProvider>
            <Router>
              <BackgroundScannerMount />
              <RouteChangeHandler />
              <Suspense fallback={<LoadingPage />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/panel/sign-in" element={<SignInPage />} />
                  
                  {/* Shared Public Routes */}
                  <Route path="/shared" element={<SharedLayout />}>
                    <Route path=":id" element={<SharedCanisterPage />} />
                  </Route>
                  
                  {/* Protected Panel Routes */}
                  <Route path="/panel" element={
                    <ProtectedRoute>
                      <PanelLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<Navigate to="/panel/canisters" replace />} />
                    <Route path="canisters" element={<CanistersPage />} />
                    <Route path="canister/:id" element={<CanisterPage />} />
                    <Route path="deployments" element={<DeploymentsPage />} />
                    <Route path="deployment/:id" element={<DeploymentPage />} />
                    <Route path="cycles" element={<TCyclesPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>
                  
                  {/* 404 Route - Must be last */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </Router>
          </TooltipProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App