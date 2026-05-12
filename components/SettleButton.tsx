'use client'

import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ACTIVE_CHAIN } from '@/lib/chains'

// The settler role belongs to the deployer wallet that also owns + operates the
// agent. Auto-settle runs in the GH Actions cron every 30 min, so this manual
// panel is an admin override only — kept for emergencies and demo footage.
const SETTLER_ADDRESS = '0x3a0Dd90212838f32a953Acd4B32596b62859324A'

const VAULT_ABI = [
  {
    name: 'settleRound',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'roundId', type: 'uint256' },
      { name: 'settleMethPrice', type: 'uint256' },
      { name: 'settleUsdyPrice', type: 'uint256' },
      { name: 'humanAllocMeth', type: 'uint8' },
    ],
    outputs: [],
  },
] as const

interface SettleButtonProps {
  roundId: number
  startMethPrice: string
  startUsdyPrice: string
}

export default function SettleButton({ roundId, startMethPrice, startUsdyPrice }: SettleButtonProps) {
  const { address } = useAccount()
  const [open, setOpen] = useState(false)
  const [methChange, setMethChange] = useState(5)
  const [usdyChange, setUsdyChange] = useState(0.1)
  const [humanAlloc, setHumanAlloc] = useState(50)

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const isSettler = address && address.toLowerCase() === SETTLER_ADDRESS.toLowerCase()

  // Only the settler wallet sees this panel. Regular voters never see it —
  // settlement is fully automatic via the GH Actions cron.
  if (!isSettler) return null

  const handleSettle = () => {
    const settleMeth = (BigInt(startMethPrice) * BigInt(Math.floor((100 + methChange) * 100))) / BigInt(10000)
    const settleUsdy = (BigInt(startUsdyPrice) * BigInt(Math.floor((100 + usdyChange) * 100))) / BigInt(10000)
    writeContract({
      address: ACTIVE_CHAIN.contracts.tournamentVault as `0x${string}`,
      abi: VAULT_ABI,
      functionName: 'settleRound',
      args: [BigInt(roundId), settleMeth, settleUsdy, humanAlloc],
    })
  }

  if (isSuccess) {
    return (
      <div className="card p-3 text-center" style={{ borderColor: 'var(--accent)' }}>
        <div className="text-xs text-[var(--accent)]">Round #{roundId} settled (manual)</div>
        <a
          href={`${ACTIVE_CHAIN.explorer}/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] mono text-[var(--fg-muted)] hover:text-[var(--accent)] transition mt-1 inline-block"
        >
          {txHash?.slice(0, 18)}...
        </a>
      </div>
    )
  }

  // Collapsed: a discreet admin pill the settler can click open if they need
  // to override auto-settlement (rare). Default state is closed so the page
  // doesn't get cluttered with parameters non-admins don't need.
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[10px] uppercase tracking-wider text-[var(--fg-dim)] hover:text-[var(--fg-muted)] transition px-2 py-1 rounded border border-[var(--border)] inline-flex items-center gap-1.5"
        title="Settler-only admin override. Auto-settle cron handles this normally."
      >
        <span>⚙</span>
        <span>Settler override #{roundId}</span>
      </button>
    )
  }

  return (
    <div className="card p-3 space-y-3 border-orange-400/30" style={{ background: 'rgba(251,146,60,0.04)' }}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-orange-400">
          Settler override · Round #{roundId}
        </div>
        <button onClick={() => setOpen(false)} className="text-[var(--fg-muted)] hover:text-white text-sm leading-none">×</button>
      </div>

      <div className="text-[10px] text-[var(--fg-dim)] leading-relaxed">
        Auto-settle cron handles this every 30 min. Use this only if you need to manually close a
        round with custom params (debug, demo footage, etc.).
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-[var(--fg-muted)] text-[10px] mb-1">mETH change</div>
          <input
            type="number"
            value={methChange}
            onChange={(e) => setMethChange(Number(e.target.value))}
            step="0.5"
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-2 py-1 mono text-xs"
          />
          <div className="text-[9px] text-[var(--fg-dim)] mt-0.5">% over period</div>
        </div>
        <div>
          <div className="text-[var(--fg-muted)] text-[10px] mb-1">USDY change</div>
          <input
            type="number"
            value={usdyChange}
            onChange={(e) => setUsdyChange(Number(e.target.value))}
            step="0.1"
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-2 py-1 mono text-xs"
          />
          <div className="text-[9px] text-[var(--fg-dim)] mt-0.5">% over period</div>
        </div>
        <div>
          <div className="text-[var(--fg-muted)] text-[10px] mb-1">Human alloc</div>
          <input
            type="number"
            value={humanAlloc}
            onChange={(e) => setHumanAlloc(Number(e.target.value))}
            min="0"
            max="100"
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-2 py-1 mono text-xs"
          />
          <div className="text-[9px] text-[var(--fg-dim)] mt-0.5">% mETH (median)</div>
        </div>
      </div>

      <button
        onClick={handleSettle}
        disabled={isPending || confirming}
        className="btn-secondary w-full text-xs"
      >
        {isPending && 'Confirm...'}
        {confirming && 'Settling...'}
        {!isPending && !confirming && 'Force settle now'}
      </button>
    </div>
  )
}
