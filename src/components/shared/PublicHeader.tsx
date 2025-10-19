import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import logoImg from "../../assets/logo.png";

export function PublicHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`
        sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md
        transition-all duration-300 ease-in-out
        ${
          isScrolled
            ? "h-14 bg-background/95 shadow-md"
            : "h-16 sm:h-18 bg-background"
        }
      `}
    >
      <div className="flex items-center justify-between h-full px-4 sm:px-6">
        {/* Left side - Logo */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-3 sm:gap-5">
            <Link to="/">
              <img
                className={`${isScrolled ? "h-10" : "h-12"}`}
                src={logoImg}
                alt="hosty.live logo"
              />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

