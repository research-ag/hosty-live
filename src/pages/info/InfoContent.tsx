import type { ReactNode } from 'react'

// Building blocks for the public text pages (/docs, /privacy); Tailwind has no typography plugin here.

export function InfoArticle({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <article className="container mx-auto px-4 py-10 sm:py-14 max-w-3xl">
      <h1 className="text-3xl sm:text-4xl font-bold mb-3">{title}</h1>
      {subtitle && <p className="text-muted-foreground mb-8">{subtitle}</p>}
      <div className="space-y-10">{children}</div>
    </article>
  )
}

export function InfoSection({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="space-y-3 scroll-mt-20">
      <h2 className="text-xl sm:text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export function P({ children }: { children: ReactNode }) {
  return <p className="leading-relaxed">{children}</p>
}

export function Bullets({ children }: { children: ReactNode }) {
  return <ul className="list-disc pl-6 space-y-2 leading-relaxed">{children}</ul>
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="text-sm bg-muted/60 rounded px-1 py-0.5 break-all">{children}</code>
}

export function Block({ children }: { children: ReactNode }) {
  return (
    <pre className="text-sm bg-muted/50 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">{children}</pre>
  )
}

export function A({ href, children }: { href: string; children: ReactNode }) {
  const external = /^https?:|^mailto:/.test(href)
  return (
    <a
      href={href}
      className="text-primary hover:underline"
      {...(external && !href.startsWith('mailto:') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  )
}
