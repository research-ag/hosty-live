import { Link } from 'react-router-dom'
import { SUPPORT_EMAIL } from '../../constants/contact'

export function FooterLinks() {
  return (
    <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <Link to="/docs" className="hover:text-foreground">Docs</Link>
      <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
      <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-foreground">{SUPPORT_EMAIL}</a>
    </nav>
  )
}

export function Footer() {
  return (
    <footer className="flex flex-col sm:flex-row items-center justify-between gap-2 px-6 py-4 bg-background border-t text-sm text-muted-foreground w-full">
      <div>© 2025 hosty.live. Made by MR Research AG</div>
      <FooterLinks />
    </footer>
  )
}
