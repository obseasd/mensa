'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import WalletButton from './WalletButton'

export default function Nav() {
  const pathname = usePathname()
  const isActive = (path: string) => pathname === path

  return (
    <nav className="relative z-10 border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center text-black font-bold text-sm transition group-hover:opacity-80">
            M
          </div>
          <span className="font-medium text-base tracking-tight">mensa</span>
        </Link>

        <div className="flex items-center gap-1 text-sm">
          {[
            { href: '/', label: 'Agent' },
            { href: '/tournament', label: 'Tournament' },
            { href: '/deposit', label: 'Deposit' },
            { href: '/leaderboard', label: 'Leaderboard' },
            { href: '/decisions', label: 'Decisions' },
            { href: '/docs', label: 'Docs' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-md transition ${
                isActive(href)
                  ? 'text-white'
                  : 'text-[var(--fg-muted)] hover:text-white'
              }`}
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
