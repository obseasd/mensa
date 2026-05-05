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
          <span className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center transition group-hover:bg-zinc-700">
            <img src="/logo.png" alt="Mensa" className="w-6 h-6" />
          </span>
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
                  ? 'text-white font-medium'
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
