'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import WalletButton from './WalletButton'

export default function Nav() {
  const pathname = usePathname()
  const isActive = (path: string) => pathname === path

  return (
    <nav className="relative z-50 border-b border-[var(--border)]" style={{ background: '#0F1010' }}>
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3 group">
          <img
            src="/logo.png"
            alt="Mensa"
            className="w-[66px] h-[66px] transition group-hover:opacity-80"
            style={{ filter: 'invert(1)' }}
          />
          <span className="font-medium text-lg tracking-tight">mensa</span>
        </Link>

        <div className="flex items-center gap-1 text-sm">
          {[
            { href: '/', label: 'Agent' },
            { href: '/tournament', label: 'Tournament' },
            { href: '/backtest', label: 'Backtest' },
            { href: '/deposit', label: 'Deposit' },
            { href: '/gasless', label: 'Gasless' },
            { href: '/leaderboard', label: 'Leaderboard' },
            { href: '/docs', label: 'Docs' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-md transition ${
                isActive(href)
                  ? 'font-medium'
                  : 'text-[var(--fg-muted)] hover:text-white'
              }`}
              style={isActive(href) ? { color: '#BDD2D1' } : undefined}
            >
              {label}
            </Link>
          ))}
          <div className="ml-3">
            <WalletButton />
          </div>
        </div>
      </div>
    </nav>
  )
}
