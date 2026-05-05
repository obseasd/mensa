'use client'

import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ACTIVE_CHAIN } from '@/lib/chains'

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
  const [methChange, setMethChange] = useState(5) // % change
  const [usdyChange, setUsdyChange] = useState(0.1)
  const [humanAlloc, setHumanAlloc] = useState(50)

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

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
      <div className="card p-4 text-center" style={{ borderColor: 'var(--accent)' }}>
        <div className="text-xs text-[var(--accent)]">Round settled</div>
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

  return (
    <div className="card p-4 space-y-3">
      <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">
        Settle Round #{roundId} (demo settlement)
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
        {!isPending && !confirming && 'Settle (you = settler)'}
      </button>

      <div className="text-[9px] text-[var(--fg-dim)] leading-relaxed">
        Settler is the deployer wallet. On mainnet, settlement uses Chainlink price feeds + median of votes.
      </div>
    </div>
  )
}
