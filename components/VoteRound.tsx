'use client'

import { useState, useEffect } from 'react'
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ACTIVE_CHAIN } from '@/lib/chains'
import { mantleSepolia } from '@/lib/wagmi'

const VAULT_ABI = [
  {
    name: 'voteHuman',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'roundId', type: 'uint256' }, { name: 'allocMeth', type: 'uint8' }],
    outputs: [],
  },
] as const

interface VoteRoundProps {
  roundId: number
  aiAllocMeth: number
  startMethPrice: bigint | string
  startUsdyPrice: bigint | string
}

interface SimResult {
  ai: { totalReturnPct: number; methAPY: number; usdyAPY: number }
  human: { totalReturnPct: number }
  aiOutperformBps: number
  winner: 'AI' | 'Human' | 'Tie'
}

export default function VoteRound({ roundId, aiAllocMeth }: VoteRoundProps) {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const [allocation, setAllocation] = useState(aiAllocMeth)
  const [submitted, setSubmitted] = useState(false)
  const [sim, setSim] = useState<SimResult | null>(null)
  const [simLoading, setSimLoading] = useState(false)

  const { writeContract, isPending, data: txHash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const isMantle = chainId === mantleSepolia.id

  // Live simulation when allocation changes
  useEffect(() => {
    setSimLoading(true)
    const t = setTimeout(() => {
      fetch(`/api/simulate?ai=${aiAllocMeth}&human=${allocation}&days=1`)
        .then(r => r.json())
        .then(d => { if (!d.error) setSim(d) })
        .catch(() => {})
        .finally(() => setSimLoading(false))
    }, 200)
    return () => clearTimeout(t)
  }, [allocation, aiAllocMeth])

  const handleVote = () => {
    writeContract({
      address: ACTIVE_CHAIN.contracts.tournamentVault as `0x${string}`,
      abi: VAULT_ABI,
      functionName: 'voteHuman',
      args: [BigInt(roundId), allocation],
    })
    setSubmitted(true)
  }

  const delta = allocation - aiAllocMeth

  if (isSuccess) {
    return (
      <div className="card p-5" style={{ borderColor: 'var(--accent)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="pulse" />
          <span className="text-xs text-[var(--accent)]">Vote submitted</span>
        </div>
        <p className="text-sm">Your allocation: <span className="mono">{allocation}% mETH</span></p>
        <a
          href={`${ACTIVE_CHAIN.explorer}/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--fg-muted)] mono hover:text-[var(--accent)] transition mt-2 inline-block"
        >
          {txHash?.slice(0, 18)}...{txHash?.slice(-6)}
        </a>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="card p-5">
        <div className="text-xs text-[var(--fg-muted)] mb-2">Connect your wallet to vote on this round</div>
      </div>
    )
  }

  if (!isMantle) {
    return (
      <div className="card p-5">
        <div className="text-xs text-orange-400">Switch to Mantle Sepolia to vote</div>
      </div>
    )
  }

  const winColor = sim?.winner === 'Human' ? 'var(--accent)' : sim?.winner === 'AI' ? '#f87171' : '#a0a0a0'

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[var(--fg-muted)]">Your allocation</span>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--fg-muted)]">AI: {aiAllocMeth}%</span>
          <span className={`mono ${delta > 0 ? 'text-[var(--accent)]' : delta < 0 ? 'text-orange-400' : 'text-[var(--fg-muted)]'}`}>
            {delta > 0 ? `+${delta}` : delta} vs AI
          </span>
        </div>
      </div>

      {/* Slider */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-medium mono">{allocation}%</span>
          <span className="text-xs text-[var(--fg-muted)]">mETH / {100 - allocation}% USDY</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={allocation}
          onChange={(e) => setAllocation(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
        <div className="flex justify-between text-[10px] text-[var(--fg-dim)] mt-1">
          <span>0% (all USDY)</span>
          <span>50/50</span>
          <span>100% (all mETH)</span>
        </div>
      </div>

      {/* Live simulation */}
      <div className="mb-4 p-3 rounded-md" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">
            Simulation {simLoading && <span className="text-[var(--fg-dim)]">…</span>}
          </span>
          {sim && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded"
              style={{
                color: winColor,
                background: `${winColor}15`,
              }}
            >
              {sim.winner === 'Tie' ? 'TIE' : sim.winner === 'Human' ? 'YOU WIN' : 'AI WINS'}
            </span>
          )}
        </div>

        {sim ? (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] text-[var(--fg-muted)]">AI return (1d)</div>
              <div className="mono mt-0.5">+{sim.ai.totalReturnPct.toFixed(4)}%</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--fg-muted)]">Your return (1d)</div>
              <div className="mono mt-0.5" style={{ color: sim.aiOutperformBps < 0 ? 'var(--accent)' : 'var(--fg)' }}>
                +{sim.human.totalReturnPct.toFixed(4)}%
              </div>
            </div>
            <div className="col-span-2 pt-2 border-t border-[var(--border)] text-[10px] text-[var(--fg-muted)]">
              Outperformance: <span className="mono" style={{ color: winColor }}>{sim.aiOutperformBps > 0 ? '-' : '+'}{Math.abs(sim.aiOutperformBps)} bps</span>
              <span className="mx-2">·</span>
              mETH APY <span className="mono">{sim.ai.methAPY.toFixed(2)}%</span>
              <span className="mx-2">·</span>
              USDY APY <span className="mono">{sim.ai.usdyAPY.toFixed(2)}%</span>
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-[var(--fg-dim)]">Computing...</div>
        )}
      </div>

      <button
        onClick={handleVote}
        disabled={isPending || isConfirming || submitted}
        className="btn-accent w-full text-sm"
      >
        {isPending && 'Confirm in wallet...'}
        {isConfirming && 'Confirming on-chain...'}
        {!isPending && !isConfirming && !submitted && `Vote ${allocation}% mETH`}
      </button>

      <p className="text-[10px] text-[var(--fg-dim)] mt-3">
        Simulation uses live Mantle APYs from DefiLlama. Real outcome depends on actual prices at settlement.
      </p>
    </div>
  )
}
