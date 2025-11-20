import { useThemeStore } from "../../stores/themeStore";
import logoLight from "../../assets/hosty-live-logo-light.png";
import logoDark from "../../assets/hosty-live-logo-dark.png";

interface ThemeLogoProps {
  className?: string;
  alt?: string;
}

export function ThemeLogo({ className = "", alt = "hosty.live logo" }: ThemeLogoProps) {
  const theme = useThemeStore((state) => state.theme);

  return (
    <div className="relative">
      <img
        src={logoLight}
        alt={alt}
        className={`transition-opacity duration-200 ${className} ${
          theme === "light" ? "opacity-100" : "opacity-0 absolute inset-0"
        }`}
      />
      <img
        src={logoDark}
        alt={alt}
        className={`transition-opacity duration-200 ${className} ${
          theme === "dark" ? "opacity-100" : "opacity-0 absolute inset-0"
        }`}
      />
    </div>
  );
}

