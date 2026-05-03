'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { mantle, mantleSepolia } from '@/lib/wagmi'

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function WalletButton() {
  const { address, isConnected } = useAccount()
  const { connectors, connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [showMenu, setShowMenu] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Avoid hydration mismatch
  if (!mounted) {
    return <button className="btn-secondary text-xs py-1.5 px-3">Connect</button>
  }

  if (isConnected && address) {
    const isMantle = chainId === mantle.id || chainId === mantleSepolia.id
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--border-strong)] hover:border-[var(--fg-muted)] transition text-xs"
        >
          {!isMantle && (
            <span className="text-[10px] text-orange-400">Wrong chain</span>
          )}
          {isMantle && <span className="pulse" />}
          <span className="mono">{shortAddr(address)}</span>
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-2 w-56 card p-1 z-50">
            {!isMantle && (
              <>
                <button
                  onClick={() => { switchChain({ chainId: mantle.id }); setShowMenu(false) }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 rounded transition"
                >
                  Switch to Mantle Mainnet
                </button>
                <button
                  onClick={() => { switchChain({ chainId: mantleSepolia.id }); setShowMenu(false) }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 rounded transition"
                >
                  Switch to Mantle Sepolia
                </button>
                <div className="h-px bg-[var(--border)] my-1" />
              </>
            )}
            <a
              href={`${chainId === mantle.id ? 'https://mantlescan.xyz' : 'https://explorer.sepolia.mantle.xyz'}/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 text-xs hover:bg-white/5 rounded transition text-[var(--fg-muted)]"
            >
              View on explorer
            </a>
            <button
              onClick={() => { disconnect(); setShowMenu(false) }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 rounded transition text-red-400"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isPending}
        className="btn-secondary text-xs py-1.5 px-3"
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 w-48 card p-1 z-50">
          {connectors.map((c) => (
            <button
              key={c.uid}
              onClick={() => { connect({ connector: c }); setShowMenu(false) }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 rounded transition flex items-center justify-between"
            >
              <span>{c.name}</span>
              <span className="text-[var(--fg-dim)] text-[10px]">{c.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
