import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { useAuth } from '../../hooks/useAuth'
import { useThemeStore } from '../../stores/themeStore'
import logoLight from '../../assets/hosty-live-logo-light.png'
import logoDark from '../../assets/hosty-live-logo-dark.png'

// Internet Computer Logo SVG Component
const ICPLogo = ({ className }: { className?: string }) => (
  <svg
    version="1.1"
    id="Layer_1"
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    x="0px"
    y="0px"
    viewBox="0 0 358.8 179.8"
    style={{ enableBackground: "new 0 0 358.8 179.8" } as any}
    xmlSpace="preserve"
    className={className}
  >
    <defs>
      <linearGradient
        id="SVGID_1_"
        gradientUnits="userSpaceOnUse"
        x1="224.7853"
        y1="257.7536"
        x2="348.0663"
        y2="133.4581"
        gradientTransform="matrix(1 0 0 -1 0 272)"
      >
        <stop offset="0.21" style={{ stopColor: "#F15A24" }} />
        <stop offset="0.6841" style={{ stopColor: "#FBB03B" }} />
      </linearGradient>
      <linearGradient
        id="SVGID_2_"
        gradientUnits="userSpaceOnUse"
        x1="133.9461"
        y1="106.4262"
        x2="10.6653"
        y2="230.7215"
        gradientTransform="matrix(1 0 0 -1 0 272)"
      >
        <stop offset="0.21" style={{ stopColor: "#ED1E79" }} />
        <stop offset="0.8929" style={{ stopColor: "#522785" }} />
      </linearGradient>
    </defs>
    <path
      fill="url(#SVGID_1_)"
      d="M271.6,0c-20,0-41.9,10.9-65,32.4c-10.9,10.1-20.5,21.1-27.5,29.8c0,0,11.2,12.9,23.5,26.8 c6.7-8.4,16.2-19.8,27.3-30.1c20.5-19.2,33.9-23.1,41.6-23.1c28.8,0,52.2,24.2,52.2,54.1c0,29.6-23.4,53.8-52.2,54.1 c-1.4,0-3-0.2-5-0.6c8.4,3.9,17.5,6.7,26,6.7c52.8,0,63.2-36.5,63.8-39.1c1.5-6.7,2.4-13.7,2.4-20.9C358.6,40.4,319.6,0,271.6,0z"
    />
    <path
      fill="url(#SVGID_2_)"
      d="M87.1,179.8c20,0,41.9-10.9,65-32.4c10.9-10.1,20.5-21.1,27.5-29.8c0,0-11.2-12.9-23.5-26.8 c-6.7,8.4-16.2,19.8-27.3,30.1c-20.5,19-34,23.1-41.6,23.1c-28.8,0-52.2-24.2-52.2-54.1c0-29.6,23.4-53.8,52.2-54.1 c1.4,0,3,0.2,5,0.6c-8.4-3.9-17.5-6.7-26-6.7C13.4,29.6,3,66.1,2.4,68.8C0.9,75.5,0,82.5,0,89.7C0,139.4,39,179.8,87.1,179.8z"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      fill="#29ABE2"
      d="M127.3,59.7c-5.8-5.6-34-28.5-61-29.3C18.1,29.2,4,64.2,2.7,68.7C12,29.5,46.4,0.2,87.2,0 c33.3,0,67,32.7,91.9,62.2c0,0,0.1-0.1,0.1-0.1c0,0,11.2,12.9,23.5,26.8c0,0,14,16.5,28.8,31c5.8,5.6,33.9,28.2,60.9,29 c49.5,1.4,63.2-35.6,63.9-38.4c-9.1,39.5-43.6,68.9-84.6,69.1c-33.3,0-67-32.7-92-62.2c0,0.1-0.1,0.1-0.1,0.2 c0,0-11.2-12.9-23.5-26.8C156.2,90.8,142.2,74.2,127.3,59.7z M2.7,69.1c0-0.1,0-0.2,0.1-0.3C2.7,68.9,2.7,69,2.7,69.1z"
    />
  </svg>
)

export function SignInPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoading } = useAuth()
  const theme = useThemeStore((state) => state.theme)
  const [error, setError] = useState('')

  // Get the intended destination from location state
  const from = location.state?.from?.pathname || '/panel/canisters'

  const handleLogin = async () => {
    setError('')

    try {
      const result = await login()
      
      if (result.success) {
        navigate(from, { replace: true })
      } else {
        setError(result.error || 'Sign in failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              key={theme}
              src={theme === 'dark' ? logoDark : logoLight} 
              alt="hosty.live" 
              className="h-16" 
            />
          </div>
          <CardTitle className="text-2xl">Welcome to hosty.live</CardTitle>
          <p className="text-muted-foreground">Sign in with Internet Identity to continue</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {error}
            </div>
          )}
          
          <Button 
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full h-12 text-base"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <ICPLogo className="mr-2 h-6 w-6" />
                Sign in with Internet Identity
              </>
            )}
          </Button>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-start gap-2">
              <ICPLogo className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium mb-1">What is Internet Identity?</h4>
                <p className="text-xs text-muted-foreground">
                  Internet Identity is a decentralized authentication system built on the Internet Computer. 
                  It allows you to securely sign in without passwords or email addresses.
                </p>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              New to Internet Identity?{' '}
              <a 
                href="https://identity.ic0.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Create your identity here
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}