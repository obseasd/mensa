'use client'

import { useEffect, useState } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { getPrimeSdk, getSmartWalletAddress } from '@/lib/etherspot'

/// Ambient badge that surfaces Mensa's Etherspot Account Abstraction wiring
/// without claiming the user-facing deposit flow is gasless today. The smart
/// wallet address is derived deterministically from the user's EOA via the
/// Etherspot Prime SDK as soon as they connect, which is enough to prove the
/// AA partner is integrated. Production gasless deposit is the Q3 2026
/// milestone documented in /docs#post-hackathon.
export default function AABadge() {
  const { isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [smartWallet, setSmartWallet] = useState<string | null>(null)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    if (!isConnected || !walletClient) {
      setSmartWallet(null)
      setErrored(false)
      return
    }
    let cancelled = false
    async function derive() {
      try {
        const sdk = getPrimeSdk(walletClient as unknown as Parameters<typeof getPrimeSdk>[0])
        const addr = await getSmartWalletAddress(sdk)
        if (!cancelled) setSmartWallet(addr)
      } catch {
        if (!cancelled) setErrored(true)
      }
    }
    derive()
    return () => {
      cancelled = true
    }
  }, [isConnected, walletClient])

  if (!isConnected) return null

  return (
    <div className="card p-3 text-[10px] mono leading-relaxed">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: smartWallet ? '#BDD2D1' : 'var(--fg-muted)' }} />
          <span className="text-[var(--fg-muted)]">AA</span>
          <span className="text-[var(--fg)]">
            {smartWallet ? `${smartWallet.slice(0, 8)}…${smartWallet.slice(-6)}` : errored ? 'init failed' : 'deriving…'}
          </span>
          <span className="text-[var(--fg-dim)] hidden sm:inline">via Etherspot Arka</span>
        </div>
        <a
          href="/docs#post-hackathon"
          className="text-[var(--fg-muted)] hover:text-[var(--fg)] underline-offset-2 hover:underline"
        >
          Gasless deposit · Q3 2026 →
        </a>
      </div>
    </div>
  )
}
