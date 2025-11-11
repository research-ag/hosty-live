import {
  ChevronDown,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  User,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { ThemeToggle } from "../shared/ThemeToggle";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../hooks/useAuth";
import logoImg from "../../assets/logo.png";
import { Server, Zap, Coins } from "lucide-react";
import { CopyButton } from "../ui/CopyButton";

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
);

const navigation = [
  { name: "Canisters", href: "/panel/canisters", icon: Server },
  { name: "Deployments", href: "/panel/deployments", icon: Zap },
  { name: "Cycles", href: "/panel/cycles", icon: Coins },
  { name: "Settings", href: "/panel/settings", icon: Settings },
];

export function Header() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { principal, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setIsDropdownOpen(false);
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const isActivePath = (href: string) => {
    // Handle exact matches first
    if (location.pathname === href) {
      return true;
    }

    // Handle nested routes - map child routes to their parent
    const pathMappings = {
      "/panel/canisters": ["/panel/canister/"], // canister detail pages
      "/panel/deployments": ["/panel/deployment/"], // deployment detail pages
    };

    const childPaths = pathMappings[href as keyof typeof pathMappings];
    if (childPaths) {
      return childPaths.some((childPath) =>
        location.pathname.startsWith(childPath)
      );
    }

    // Default to startsWith for other cases
    return location.pathname.startsWith(href);
  };

  return (
    <>
      <header
        className={`
          sticky top-0 z-50 w-full h-16 border-b
          ${
            isScrolled
              ? "bg-background/95 shadow-sm backdrop-blur-md"
              : "bg-background/80 backdrop-blur-sm"
          }
        `}
      >
        <div className="flex items-center justify-between h-full px-4 sm:px-6">
          {/* Left side - Logo */}
          <div className="flex items-center">
            <Link to="/panel/canisters">
              <img className="h-10" src={logoImg} alt="hosty.live logo" />
            </Link>
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>

            {/* Desktop User Dropdown */}
            <div
              className="relative hidden lg:block"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 h-9 px-3"
              >
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">Account</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>

              {/* Desktop Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-popover border rounded-lg shadow-lg z-50 animate-in slide-in-from-top-2 duration-200">
                  <div className="py-1">
                    <button
                      onClick={toggleTheme}
                      className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-accent transition-colors"
                    >
                      {theme === "light" ? (
                        <>
                          <Moon className="mr-2 h-4 w-4" />
                          Dark Mode
                        </>
                      ) : (
                        <>
                          <Sun className="mr-2 h-4 w-4" />
                          Light Mode
                        </>
                      )}
                    </button>

                    <div className="px-4 py-2 text-sm border-t">
                      <div className="text-muted-foreground mb-1">
                        Your principal:
                      </div>
                      {principal ? (
                        <div className="flex items-center gap-2 w-full max-w-full">
                          <span
                            className="font-mono text-xs flex-1 min-w-0 truncate"
                            title={principal}
                          >
                            {principal}
                          </span>
                          <CopyButton
                            text={principal}
                            size="icon"
                            variant="ghost"
                          />
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Not available
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        logout();
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-destructive/10 text-destructive transition-colors"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown Panel */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Dropdown Panel */}
          <div className="fixed top-0 left-0 right-0 bg-background border-b shadow-2xl mobile-menu-panel">
            <div className="flex flex-col">
              {/* Panel Header */}
              <div className="flex items-center justify-between p-4 border-b bg-card/50">
                <h2 className="text-lg font-semibold">Menu</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* User Profile Section */}
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    <ICPLogo className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium font-mono text-sm truncate">
                      {principal
                        ? `${principal.substring(
                            0,
                            12
                          )}...${principal.substring(principal.length - 8)}`
                        : "User"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Internet Identity
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="p-4 space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Navigation
                </h3>
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg 
                      transition-all duration-200 hover:bg-accent hover:translate-x-1
                      ${
                        isActivePath(item.href)
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground"
                      }
                    `}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </div>

              {/* Theme Toggle and Actions */}
              <div className="p-4 border-t bg-card/30">
                <div className="space-y-3">
                  <ThemeToggle />
                  <div className="space-y-1">
                    <button
                      onClick={logout}
                      className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-destructive/10 rounded-md text-destructive transition-colors"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
