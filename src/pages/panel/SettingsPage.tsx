import { Settings, User, Bell, Shield, Palette, Globe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'

export function SettingsPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and application settings</p>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {/* Account Settings */}
        <Card className="hover:shadow-lg transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted/50 mx-auto mb-4 flex items-center justify-center">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Profile and account management features coming soon
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="hover:shadow-lg transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted/50 mx-auto mb-4 flex items-center justify-center">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Notification preferences coming soon
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="hover:shadow-lg transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted/50 mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Security and privacy settings coming soon
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="hover:shadow-lg transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="mr-2 h-5 w-5" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted/50 mx-auto mb-4 flex items-center justify-center">
                <Palette className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Application preferences and customization coming soon
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Banner */}
      <Card className="mt-6 border-dashed border-2 border-muted-foreground/20">
        <CardContent className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
            <Settings className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Settings Coming Soon</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            We're working hard to bring you comprehensive settings and configuration options. 
            Check back soon for updates!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}