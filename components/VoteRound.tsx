'use client'

import { useState, useEffect } from 'react'
import { useAccount, useChainId, useWriteContract, useReadContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { ACTIVE_CHAIN } from '@/lib/chains'
import { mantle, mantleSepolia } from '@/lib/wagmi'
import { showToast } from './Toast'

const VAULT_ABI = [
  {
    name: 'voteHuman',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'roundId', type: 'uint256' }, { name: 'allocMeth', type: 'uint8' }],
    outputs: [],
  },
  {
    name: 'votes',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'roundId', type: 'uint256' }, { name: 'voter', type: 'address' }],
    outputs: [
      { name: 'allocMeth', type: 'uint8' },
      { name: 'weight', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
    ],
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

function explainError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.match(/user rejected|user denied/i)) return 'You cancelled the vote.'
  if (msg.match(/chain.*mismatch|wrong network/i)) return 'Wrong chain — please switch in your wallet.'
  if (msg.match(/insufficient funds/i)) return 'Insufficient MNT for gas.'
  if (msg.match(/already voted/i)) return 'You already voted on this round.'
  if (msg.match(/insufficient stake/i)) return 'You need a deposit in the agent to be eligible to vote.'
  if (msg.length > 140) return msg.slice(0, 140) + '...'
  return msg
}

export default function VoteRound({ roundId, aiAllocMeth }: VoteRoundProps) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const [allocation, setAllocation] = useState(aiAllocMeth)
  const [submitting, setSubmitting] = useState(false)
  const [sim, setSim] = useState<SimResult | null>(null)
  const [simLoading, setSimLoading] = useState(false)

  const { writeContractAsync, isPending, data: txHash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const isMantle = chainId === mantle.id || chainId === mantleSepolia.id

  // Read this voter's existing vote on this round (timestamp != 0 means already voted).
  // This survives page refresh / wallet reconnect.
  const { data: existingVote, refetch: refetchVote } = useReadContract({
    address: ACTIVE_CHAIN.contracts.tournamentVault as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'votes',
    args: address ? [BigInt(roundId), address] : undefined,
    query: { enabled: !!address && isMantle, refetchInterval: 5000 },
  })
  const hasVoted = !!existingVote && Number(existingVote[2]) > 0
  const myAllocOnChain = existingVote ? Number(existingVote[0]) : 0
  const myWeightOnChain = existingVote ? Number(existingVote[1]) : 0

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

  // Success toast once tx is confirmed
  useEffect(() => {
    if (!isSuccess || !txHash) return
    showToast(
      `Voted ${allocation}% mETH on round #${roundId}.`,
      'success',
      { href: `${ACTIVE_CHAIN.explorer}/tx/${txHash}`, label: 'View on Mantlescan' },
    )
    setSubmitting(false)
    // Pick up the new on-chain vote so the success card persists across
    // re-renders even after the local txHash state is gone.
    refetchVote()
  }, [isSuccess, txHash, allocation, roundId, refetchVote])

  const ensureChain = async (): Promise<boolean> => {
    try {
      await switchChainAsync({ chainId: ACTIVE_CHAIN.id })
      return true
    } catch {
      showToast(`Switch to ${ACTIVE_CHAIN.name} cancelled`, 'error')
      return false
    }
  }

  const handleVote = async () => {
    if (!(await ensureChain())) return
    setSubmitting(true)
    try {
      await writeContractAsync({
        chainId: ACTIVE_CHAIN.id,
        address: ACTIVE_CHAIN.contracts.tournamentVault as `0x${string}`,
        abi: VAULT_ABI,
        functionName: 'voteHuman',
        args: [BigInt(roundId), allocation],
      })
      // success toast fires from the useEffect when receipt confirms
    } catch (e) {
      setSubmitting(false)
      showToast(`Vote failed: ${explainError(e)}`, 'error')
    }
  }

  const delta = allocation - aiAllocMeth

  // Show the success card whenever an existing vote is recorded on-chain,
  // not just when the local tx is fresh. This way the state survives wallet
  // disconnect / page refresh.
  if (hasVoted || isSuccess) {
    const displayAlloc = hasVoted ? myAllocOnChain : allocation
    return (
      <div className="card p-5" style={{ borderColor: 'var(--accent)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="pulse" />
          <span className="text-xs text-[var(--accent)]">Vote recorded on-chain</span>
        </div>
        <p className="text-sm">
          Your allocation: <span className="mono">{displayAlloc}% mETH</span>
          {' '}vs AI&apos;s <span className="mono">{aiAllocMeth}% mETH</span>
        </p>
        {hasVoted && myWeightOnChain > 0 && (
          <p className="text-[11px] text-[var(--fg-muted)] mt-1">
            Vote weight: <span className="mono text-[var(--fg)]">{myWeightOnChain}x</span> (sqrt of your reputation)
          </p>
        )}
        <p className="text-[11px] text-[var(--fg-muted)] mt-2 leading-relaxed">
          Round settles in ~24h. If your allocation produces a better return than the AI&apos;s
          at the settled prices, you earn from the bounty pool. Watch{' '}
          <a href="/leaderboard" className="hover:text-[var(--accent)] underline">/leaderboard</a>
          {' '}for your reputation.
        </p>
        {txHash && (
          <a
            href={`${ACTIVE_CHAIN.explorer}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--fg-muted)] mono hover:text-[var(--accent)] transition mt-3 inline-block"
          >
            {txHash.slice(0, 18)}...{txHash.slice(-6)}
          </a>
        )}
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="card p-5">
        <div className="text-xs text-[var(--fg-muted)]">Connect your wallet to vote on this round</div>
      </div>
    )
  }

  if (!isMantle) {
    return (
      <div className="card p-5">
        <div className="text-xs text-orange-400">Switch to Mantle Mainnet (chain 5000) to vote</div>
      </div>
    )
  }

  const winColor = sim?.winner === 'Human' ? 'var(--accent)' : sim?.winner === 'AI' ? '#f87171' : '#a0a0a0'

  // Button label — always renders something, never empty
  let buttonLabel: string
  let buttonDisabled = false
  if (isPending) { buttonLabel = 'Confirm in wallet...'; buttonDisabled = true }
  else if (isConfirming) { buttonLabel = 'Confirming on-chain...'; buttonDisabled = true }
  else if (submitting) { buttonLabel = 'Preparing...'; buttonDisabled = true }
  else { buttonLabel = `Vote ${allocation}% mETH` }

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
        disabled={buttonDisabled}
        className="btn-accent w-full text-sm"
      >
        {buttonLabel}
      </button>

      <p className="text-[10px] text-[var(--fg-dim)] mt-3">
        Simulation uses live Mantle APYs from DefiLlama. Real outcome depends on actual prices at settlement.
      </p>
    </div>
  )
}
