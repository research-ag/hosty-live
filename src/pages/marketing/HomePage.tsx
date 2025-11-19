import { Link } from "react-router-dom";
import {
  ArrowRight,
  Shield,
  Zap,
  Globe,
  Gift,
  Server,
  Upload,
  ExternalLink,
  CheckCircle,
  Code,
  Smartphone,
  DollarSign,
  UserCheck,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { ThemeToggle } from "../../components/shared/ThemeToggle";
import { useThemeStore } from "../../stores/themeStore";
import logoLight from "../../assets/hosty-live-logo-light.png";
import logoDark from "../../assets/hosty-live-logo-dark.png";

export function HomePage() {
  const theme = useThemeStore((state) => state.theme);
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img 
                key={theme}
                className="h-16" 
                src={theme === 'dark' ? logoDark : logoLight} 
                alt="hosty.live logo" 
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle variant="icon" />
              <Link to="/panel">
                <Button
                  size="sm"
                  className="text-xs sm:text-sm lg:text-base px-3 sm:px-4 lg:px-6"
                >
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
              Deploy to the
              <br />
              Decentralized Web
            </span>
          </h1>
          <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Host your frontend applications on the Internet Computer blockchain.
            Simple deployment, maximum reliability, true decentralization.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link to="/panel">
              <Button size="lg" className="text-lg px-8 py-6">
                Start Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* How It Works - Vertical Stepper */}
        <section className="mx-auto mt-20 mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Get your frontend deployed to the decentralized web in four simple
              steps
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
                    <h3 className="text-xl font-semibold mb-2">
                      Get Free Cycles
                    </h3>
                    <p className="text-muted-foreground">
                      Claim free compute cycles to power your deployments. No
                      credit card required.
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
                    <h3 className="text-xl font-semibold mb-2">
                      Create Canister
                    </h3>
                    <p className="text-muted-foreground">
                      One-click canister creation on Internet Computer
                      blockchain.
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
                    <h3 className="text-xl font-semibold mb-2">
                      Deploy Your App
                    </h3>
                    <p className="text-muted-foreground mb-3">
                      Choose your preferred deployment method:
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Upload className="h-4 w-4 text-primary" />
                        <span>
                          <strong>Upload ZIP</strong> with your built
                          application
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Code className="h-4 w-4 text-primary" />
                        <span>
                          <strong>Provide GitHub repo URL</strong> for automatic
                          builds
                        </span>
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
                      Your app is now decentralized and globally accessible with
                      its own URL.
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
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why Choose hosty.live
            </h2>
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
                  No single point of failure. Your app runs on the Internet
                  Computer blockchain with built-in redundancy.
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
                  Simple deploy process with familiar workflow. Upload ZIP or
                  connect GitHub - that's it.
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
                  Free cycles to start, pay-as-you-scale. No monthly hosting
                  fees or surprise charges.
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
                  Take complete control of your application. Transfer full
                  ownership when you're ready.
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
            Join developers building the next generation of web applications on
            the decentralized internet.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/panel">
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
  );
}
