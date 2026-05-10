'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'

interface TooltipProps {
  children: ReactNode
  content: ReactNode
  side?: 'top' | 'bottom'
  className?: string
}

/// Lightweight tooltip with an underline hint. Hover (desktop) and tap (mobile)
/// both open it. Closes on second tap or outside click.
export default function Tooltip({ children, content, side = 'top', className = '' }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <span
      ref={ref}
      className={`relative inline-block cursor-help ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
    >
      <span className="border-b border-dotted border-[var(--fg-muted)]/40">{children}</span>
      {open && (
        <span
          className={`absolute left-1/2 -translate-x-1/2 z-50 w-[260px] p-3 rounded-md text-xs font-normal leading-relaxed text-left bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-xl text-[var(--fg)] normal-case tracking-normal ${
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
          style={{ animation: 'fadeIn 0.12s ease-out' }}
        >
          {content}
        </span>
      )}
    </span>
  )
}

/// Common DeFi/Mensa term definitions, used in tooltips throughout the app.
export const GLOSSARY = {
  mETH: (
    <>
      <span className="font-medium">mETH</span> — Mantle&apos;s liquid-staked ETH. You receive
      mETH when you stake ETH via Mantle&apos;s native staking contract; it appreciates against
      ETH at the staking yield rate (~3-5% APR).
    </>
  ),
  USDY: (
    <>
      <span className="font-medium">USDY</span> — Ondo&apos;s tokenized US Treasury bills.
      A whitelisted ERC-20 that compounds T-bill yield (~4-5% APR) directly into its price.
      Real RWA, KYC-gated at issuance.
    </>
  ),
  alpha: (
    <>
      <span className="font-medium">Alpha</span> — Returns above a baseline. We measure
      Mensa&apos;s alpha vs a passive 50/50 mETH+USDY hold: positive alpha means the AI&apos;s
      allocation outperformed the static baseline.
    </>
  ),
  bps: (
    <>
      <span className="font-medium">bps</span> — Basis points. 1 bp = 0.01%. So 100 bps = 1%,
      and 250 bps = 2.5%. Standard finance unit for small percentages.
    </>
  ),
  sqrtRep: (
    <>
      <span className="font-medium">Sqrt-weighted reputation</span> — Vote weight scales with
      the square root of your reputation score, not linearly. So 100 fresh wallets each with
      reputation=1 sum to weight 100, but one voter with reputation=10000 has weight 100 too —
      diminishing returns prevent whale and Sybil dominance.
    </>
  ),
  perfFee: (
    <>
      <span className="font-medium">Performance fee</span> — Mensa charges 15% of yield generated,
      never on your principal. Industry-standard model (Yearn, Aave). Fee funds the bounty pool
      that pays humans who beat the AI in tournaments.
    </>
  ),
  tournament: (
    <>
      <span className="font-medium">Tournament round</span> — Each AI rebalance opens a 24h round.
      Anyone can vote their own allocation against the AI&apos;s. Whoever&apos;s split produced
      the better return wins, recorded on-chain.
    </>
  ),
  TVL: (
    <>
      <span className="font-medium">TVL</span> — Total Value Locked. Sum of mETH + USDY held by
      the Mensa agent contract, valued in USD using current ETH price.
    </>
  ),
}
