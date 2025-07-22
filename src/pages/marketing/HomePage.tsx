import { Link } from 'react-router-dom'
import { ArrowRight, Shield, Zap, Globe, Gift, Server, Upload, ExternalLink, CheckCircle, Code, Smartphone, DollarSign, UserCheck } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'

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
    style={{ enableBackground: 'new 0 0 358.8 179.8' }}
    xmlSpace="preserve"
    className={className}
  >
    <defs>
      <linearGradient id="SVGID_1_" gradientUnits="userSpaceOnUse" x1="224.7853" y1="257.7536" x2="348.0663" y2="133.4581" gradientTransform="matrix(1 0 0 -1 0 272)">
        <stop offset="0.21" style={{ stopColor: '#F15A24' }} />
        <stop offset="0.6841" style={{ stopColor: '#FBB03B' }} />
      </linearGradient>
      <linearGradient id="SVGID_2_" gradientUnits="userSpaceOnUse" x1="133.9461" y1="106.4262" x2="10.6653" y2="230.7215" gradientTransform="matrix(1 0 0 -1 0 272)">
        <stop offset="0.21" style={{ stopColor: '#ED1E79' }} />
        <stop offset="0.8929" style={{ stopColor: '#522785' }} />
      </linearGradient>
    </defs>
    <path 
      fill="url(#SVGID_1_)" 
      d="M271.6,0c-20,0-41.9,10.9-65,32.4c-10.9,10.1-20.5,21.1-27.5,29.8c0,0,11.2,12.9,23.5,26.8c6.7-8.4,16.2-19.8,27.3-30.1c20.5-19.2,33.9-23.1,41.6-23.1c28.8,0,52.2,24.2,52.2,54.1c0,29.6-23.4,53.8-52.2,54.1c-1.4,0-3-0.2-5-0.6c8.4,3.9,17.5,6.7,26,6.7c52.8,0,63.2-36.5,63.8-39.1c1.5-6.7,2.4-13.7,2.4-20.9C358.6,40.4,319.6,0,271.6,0z"
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

export function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ICPLogo className="w-8 h-4 sm:w-10 sm:h-5" />
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">hosty.live</h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 lg:gap-4">
              <Link to="/panel/sign-in">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm lg:text-base px-2 sm:px-3 lg:px-4">
                  Sign In
                </Button>
              </Link>
              <Link to="/panel/sign-up" className="hidden sm:block">
                <Button size="sm" className="text-xs sm:text-sm lg:text-base px-3 sm:px-4 lg:px-6">
                  <span className="hidden sm:inline">Get Started</span>
                  <span className="sm:hidden">Start</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16 sm:py-20 max-w-6xl">
        <div className="text-center mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight py-2">
            <span className="bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent block">
              Deploy to the<br />Decentralized Web
            </span>
          </h1>
          <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Host your frontend applications on the Internet Computer blockchain. 
            Simple deployment, maximum reliability, true decentralization.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link to="/panel/sign-up">
              <Button size="lg" className="text-lg px-8 py-6">
                Start Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/panel/sign-in">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* How It Works - Vertical Stepper */}
        <section className="mx-auto mt-20 mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Get your frontend deployed to the decentralized web in four simple steps
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Astronaut Image - Hidden on mobile/tablet */}
            <div className="hidden lg:flex justify-center">
              <div className="relative">
                <img 
                  src="https://oajhk-xaaaa-aaaap-qca7a-cai.icp0.io/astronaut.webp" 
                  alt="Internet Computer Astronaut" 
                  className="w-96 h-96 object-contain"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent rounded-full"></div>
              </div>
            </div>
            
            {/* Stepper */}
            <div className="relative max-w-2xl mx-auto lg:mx-0">
              {/* Vertical connecting line */}
              <div className="absolute left-8 top-16 bottom-16 w-0.5 bg-gradient-to-b from-primary/40 via-primary/60 to-primary/40 hidden sm:block z-0"></div>
              
              <div className="space-y-12">
              {/* Step 1 */}
              <div className="flex items-start gap-6 relative z-10">
                <div className="relative flex-shrink-0 z-10">
                  <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center hover:bg-muted transition-colors border-2 border-primary/20">
                    <Gift className="h-8 w-8 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-xl font-semibold mb-2">Get Free Cycles</h3>
                  <p className="text-muted-foreground">
                    Claim free compute cycles to power your deployments. No credit card required.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-6 relative z-10">
                <div className="relative flex-shrink-0 z-10">
                  <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center hover:bg-muted transition-colors border-2 border-primary/20">
                    <Server className="h-8 w-8 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-xl font-semibold mb-2">Create Canister</h3>
                  <p className="text-muted-foreground">
                    One-click canister creation on Internet Computer blockchain.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-6 relative z-10">
                <div className="relative flex-shrink-0 z-10">
                  <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center hover:bg-muted transition-colors border-2 border-primary/20">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-xl font-semibold mb-2">Deploy Your App</h3>
                  <p className="text-muted-foreground mb-3">
                    Choose your preferred deployment method:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Upload className="h-4 w-4 text-primary" />
                      <span><strong>Upload ZIP</strong> with your built application</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Code className="h-4 w-4 text-primary" />
                      <span><strong>Provide GitHub repo URL</strong> for automatic builds</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-6 relative z-10">
                <div className="relative flex-shrink-0 z-10">
                  <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center hover:bg-muted transition-colors border-2 border-primary/20">
                    <ExternalLink className="h-8 w-8 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    4
                  </div>
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-xl font-semibold mb-2">Go Live</h3>
                  <p className="text-muted-foreground">
                    Your app is now decentralized and globally accessible with its own URL.
                  </p>
                </div>
              </div>
            </div>
          </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="mx-auto mt-20 mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why Choose hosty.live</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Experience the advantages of decentralized hosting
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/20 h-full">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Truly Decentralized</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm">
                  No single point of failure. Your app runs on the Internet Computer blockchain with built-in redundancy.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/20 h-full">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Developer Friendly</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm">
                  Simple deploy process with familiar workflow. Upload ZIP or connect GitHub - that's it.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/20 h-full">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Cost Effective</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm">
                  Free cycles to start, pay-as-you-scale. No monthly hosting fees or surprise charges.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/20 h-full">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <UserCheck className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Full Ownership</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm">
                  Take complete control of your application. Transfer full ownership when you're ready.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Use Cases */}
        <section className="mx-auto mt-20 mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Perfect For</h2>
            <p className="text-lg text-muted-foreground">
              Applications that require maximum uptime and censorship resistance
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/20 h-full">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">DeFi Frontends</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm">
                  Sensitive financial applications
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/20 h-full">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Telegram Mini Apps</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm">
                  Decentralized mini applications
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/20 h-full">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Web3 Apps</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm">
                  Blockchain-native applications
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/20 h-full">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Any Frontend</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm">
                  Static sites and SPAs
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center mt-20 py-16 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl border border-primary/10">
          <h2 className="text-3xl font-bold mb-4">Ready to Deploy?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto">
            Join developers building the next generation of web applications on the decentralized internet.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/panel/sign-up">
              <Button size="lg" className="text-lg px-8 py-6 shadow-lg">
                Start Building Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
          <div className="text-sm text-muted-foreground mt-3 text-center">
            No credit card required • Free cycles included
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between text-muted-foreground">
            <p>&copy; 2025 hosty.live. Made by MR Research AG.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}