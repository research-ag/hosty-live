import { Link } from 'react-router-dom'
import { Home, Search, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
              <Search className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-6xl font-bold text-muted-foreground/50 mb-4">
            404
          </div>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            <Link to="/" className="flex-1">
              <Button className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
            </Link>
          </div>
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-3">
              Quick links:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link to="/panel/canisters">
                <Button variant="ghost" size="sm">
                  Canisters
                </Button>
              </Link>
              <Link to="/panel/deployments">
                <Button variant="ghost" size="sm">
                  Deployments
                </Button>
              </Link>
              <Link to="/panel/cycles">
                <Button variant="ghost" size="sm">
                  Cycles
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}