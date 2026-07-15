import Link from 'next/link'
import { ReactNode } from 'react'

// Shared shell for /terms, /privacy, /refunds — static, readable, on-brand.
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-hone-bg px-5 py-10">
      <div className="max-w-md mx-auto">
        <Link
          href="/"
          className="font-mono font-black text-base tracking-widest text-hone-text"
        >
          H<span className="text-hone-green">O</span>NE
        </Link>

        <h1 className="text-3xl font-black mt-8 mb-1 text-hone-text">{title}</h1>
        <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-8">
          Last updated: {updated}
        </p>

        <div className="legal-body text-sm text-hone-text/90 leading-relaxed space-y-4">
          {children}
        </div>

        <div className="border-t border-hone-border mt-10 pt-6 flex flex-wrap gap-4 text-xs font-mono text-hone-muted">
          <Link href="/terms" className="hover:text-hone-green">Terms</Link>
          <Link href="/privacy" className="hover:text-hone-green">Privacy</Link>
          <Link href="/refunds" className="hover:text-hone-green">Refunds</Link>
          <Link href="/" className="hover:text-hone-green">← Back to HONE</Link>
        </div>
      </div>
    </div>
  )
}

export function H({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-base font-bold text-hone-text pt-4">{children}</h2>
  )
}
