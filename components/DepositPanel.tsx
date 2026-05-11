'use client'

import { useState, useEffect } from 'react'
import { useAccount, useChainId, useWriteContract, useReadContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { ACTIVE_CHAIN } from '@/lib/chains'
import { mantle, mantleSepolia } from '@/lib/wagmi'
import Tooltip, { GLOSSARY } from './Tooltip'

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'o', type: 'address' }, { name: 's', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 's', type: 'address' }, { name: 'a', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'mint', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 't', type: 'address' }, { name: 'a', type: 'uint256' }], outputs: [] },
] as const

const AGENT_ABI = [
  { name: 'deposit', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'asset', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'withdraw', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'asset', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'userBalance', type: 'function', stateMutability: 'view', inputs: [{ name: 'u', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const

type Asset = 'mETH' | 'USDY'
type Mode = 'deposit' | 'withdraw'

interface ApyProjection {
  estimatedApyPct: number
  methApr: number
  usdyApr: number
  methAllocPct: number
}

function fmt(n: number, digits = 2): string {
  if (!isFinite(n)) return '—'
  return n.toLocaleString('en', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function fmtUsd(n: number): string {
  if (!isFinite(n) || n === 0) return '$0.00'
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}k`
  return `$${n.toFixed(2)}`
}

export default function DepositPanel() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const isMainnet = chainId === mantle.id
  const isMantle = chainId === mantle.id || chainId === mantleSepolia.id
  const isOnSignChain = chainId === ACTIVE_CHAIN.id

  const [asset, setAsset] = useState<Asset>('mETH')
  const [mode, setMode] = useState<Mode>('deposit')
  const [amount, setAmount] = useState('1')
  const [step, setStep] = useState<'idle' | 'minting' | 'approving' | 'depositing' | 'withdrawing' | 'done'>('idle')

  // Live yield + price context
  const [proj, setProj] = useState<ApyProjection | null>(null)
  const [ethPrice, setEthPrice] = useState<number | null>(null)
  const [tvlUsd, setTvlUsd] = useState<number | null>(null)
  const [alphaPct, setAlphaPct] = useState<number | null>(null) // annualized alpha since calibrated
  const [alphaSampleRounds, setAlphaSampleRounds] = useState<number>(0)

  useEffect(() => {
    fetch('/api/agent').then(r => r.json()).then(d => {
      if (d?.marketSnapshot) {
        const m = d.marketSnapshot
        setEthPrice(m.ethPrice ?? null)
        const ap = (Number(m.currentMethAllocPct ?? 50) * Number(m.mETHYieldAPR ?? 0)
                  + (100 - Number(m.currentMethAllocPct ?? 50)) * Number(m.usdyYieldAPR ?? 0)) / 100
        setProj({
          estimatedApyPct: ap,
          methApr: Number(m.mETHYieldAPR ?? 0),
          usdyApr: Number(m.usdyYieldAPR ?? 0),
          methAllocPct: Number(m.currentMethAllocPct ?? 50),
        })
      }
    }).catch(() => {})
    fetch('/api/onchain').then(r => r.json()).then(d => {
      if (typeof d?.stats?.tvlUsd === 'number') setTvlUsd(d.stats.tvlUsd)
      const a = d?.stats?.alphaCalibrated ?? d?.stats?.alpha
      if (a && typeof a.annualizedAlphaPct === 'number') {
        setAlphaPct(a.annualizedAlphaPct)
        setAlphaSampleRounds(a.settledRounds || 0)
      }
    }).catch(() => {})
  }, [])

  const assetAddr = asset === 'mETH' ? ACTIVE_CHAIN.contracts.mETH : ACTIVE_CHAIN.contracts.USDY
  const agentAddr = ACTIVE_CHAIN.contracts.mensaAgent

  const { data: walletBalance, refetch: refetchBalance } = useReadContract({
    address: assetAddr as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isMantle, refetchInterval: 5000 },
  })

  // Allowance is polled aggressively because the Approve -> Deposit transition
  // depends on it. Without this, if the receipt watcher hangs the UI is stuck.
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: assetAddr as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, agentAddr as `0x${string}`] : undefined,
    query: { enabled: !!address && isMantle && mode === 'deposit', refetchInterval: 2500 },
  })

  const { data: depositedBalance, refetch: refetchDeposited } = useReadContract({
    address: agentAddr as `0x${string}`,
    abi: AGENT_ABI,
    functionName: 'userBalance',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isMantle, refetchInterval: 5000 },
  })

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (isSuccess) {
      refetchBalance()
      refetchAllowance()
      refetchDeposited()
      // Reset step so we don't get stuck on 'Approving...' / 'Confirming...'
      // labels once the receipt is in. The button block visibility is driven
      // by needsApproval/needsMint, but the label inside is driven by step.
      setStep('idle')
    }
  }, [isSuccess, refetchBalance, refetchAllowance, refetchDeposited])

  const amountWei = (() => {
    try { return parseUnits(amount || '0', 18) } catch { return BigInt(0) }
  })()

  const needsMint = !isMainnet && walletBalance !== undefined && walletBalance < amountWei
  const needsApproval = mode === 'deposit' && allowance !== undefined && allowance < amountWei

  // Always pin the signing chain to the active Mensa chain. wagmi will prompt
  // the wallet to switch if needed and refuse to sign if the wallet ignores
  // the prompt — prevents 'approved on Ethereum mainnet by accident' bugs.
  const SIGN_CHAIN_ID = ACTIVE_CHAIN.id

  const handleMint = () => {
    if (!address) return
    setStep('minting')
    writeContract({
      chainId: SIGN_CHAIN_ID,
      address: assetAddr as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'mint',
      args: [address, parseUnits('1000', 18)],
    })
  }

  const handleApprove = () => {
    setStep('approving')
    writeContract({
      chainId: SIGN_CHAIN_ID,
      address: assetAddr as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [agentAddr as `0x${string}`, amountWei],
    })
  }

  const handleDeposit = () => {
    setStep('depositing')
    writeContract({
      chainId: SIGN_CHAIN_ID,
      address: agentAddr as `0x${string}`,
      abi: AGENT_ABI,
      functionName: 'deposit',
      args: [assetAddr as `0x${string}`, amountWei],
    })
  }

  const handleWithdraw = () => {
    setStep('withdrawing')
    writeContract({
      chainId: SIGN_CHAIN_ID,
      address: agentAddr as `0x${string}`,
      abi: AGENT_ABI,
      functionName: 'withdraw',
      args: [assetAddr as `0x${string}`, amountWei],
    })
  }

  const handleMax = () => {
    if (mode === 'deposit' && walletBalance !== undefined) {
      setAmount(formatUnits(walletBalance, 18))
    } else if (mode === 'withdraw' && depositedBalance !== undefined) {
      setAmount(formatUnits(depositedBalance, 18))
    }
  }

  if (!isConnected) {
    return (
      <div className="card p-8 text-center">
        <div className="text-sm text-[var(--fg-muted)]">Connect your wallet to deposit</div>
      </div>
    )
  }

  if (!isMantle) {
    return (
      <div className="card p-8 text-center">
        <div className="text-sm text-orange-400">Switch to Mantle (Mainnet 5000 or Sepolia 5003)</div>
      </div>
    )
  }

  // USD valuations
  const tokenUsd = (asset === 'mETH' && ethPrice) ? ethPrice * 1.04 : 1.05
  const walletWhole = walletBalance !== undefined ? Number(formatUnits(walletBalance, 18)) : 0
  const depositedWhole = depositedBalance !== undefined ? Number(formatUnits(depositedBalance, 18)) : 0
  const amountWhole = (() => { try { return Number(amount) || 0 } catch { return 0 } })()

  return (
    <div className="space-y-6">
      {/* Chain banner — make the signing chain mismatch impossible to miss */}
      <div
        className={`card p-3 flex items-center justify-between gap-3 ${
          isOnSignChain ? '' : 'border-orange-400/40'
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: isOnSignChain ? 'var(--accent)' : '#f97316' }}
          />
          <div className="text-xs">
            <span className="text-[var(--fg-muted)]">Signing on </span>
            <span className={isOnSignChain ? 'text-[var(--fg)]' : 'text-orange-400'}>
              {chainId === mantle.id
                ? 'Mantle Mainnet'
                : chainId === mantleSepolia.id
                ? 'Mantle Sepolia'
                : `Chain ${chainId} (wrong)`}
            </span>
            {!isOnSignChain && (
              <span className="text-[var(--fg-dim)]"> · Mensa is on {ACTIVE_CHAIN.name}</span>
            )}
          </div>
        </div>
        {!isOnSignChain && (
          <button
            onClick={() => switchChain({ chainId: ACTIVE_CHAIN.id })}
            className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-orange-400/40 text-orange-400 hover:bg-orange-400/10 transition"
          >
            Switch to {ACTIVE_CHAIN.name}
          </button>
        )}
      </div>

      {/* Stats — wallet, deposit, eligibility */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="text-2xl font-medium tracking-tight mono">{fmt(walletWhole, 4)}</div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">Wallet {asset}</div>
          <div className="text-[10px] text-[var(--fg-dim)] mt-1">{fmtUsd(walletWhole * tokenUsd)}</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-medium tracking-tight mono">{fmt(depositedWhole, 4)}</div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">Your deposit</div>
          <div className="text-[10px] text-[var(--fg-dim)] mt-1">{fmtUsd(depositedWhole * tokenUsd)}</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-medium tracking-tight mono">{tvlUsd !== null ? fmtUsd(tvlUsd) : '—'}</div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">Treasury TVL</div>
          <div className="text-[10px] text-[var(--fg-dim)] mt-1">total in agent</div>
        </div>
      </div>

      {/* APY breakdown: yield is the deterministic floor, alpha is the variable add-on */}
      {proj && (() => {
        const passive5050Yield = (50 * proj.methApr + 50 * proj.usdyApr) / 100
        const aiYieldAtAlloc = proj.estimatedApyPct
        const yieldUplift = aiYieldAtAlloc - passive5050Yield
        const yieldUpliftSign = yieldUplift >= 0 ? '+' : ''
        // Per-round avg alpha in bps (more honest than annualizing 5 rounds × 365)
        const perRoundAlphaBps = alphaSampleRounds > 0 && alphaPct !== null
          ? Math.round((alphaPct / 365) * 100) // annualizedPct -> per-round bps
          : 0
        const cumAlphaBps = alphaSampleRounds > 0 ? perRoundAlphaBps * alphaSampleRounds : 0
        const alphaSign = perRoundAlphaBps >= 0 ? '+' : ''
        const enoughForAnnualization = alphaSampleRounds >= 30
        return (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] uppercase tracking-wider text-[var(--accent)]">APY breakdown</div>
              <div className="text-[10px] text-[var(--fg-dim)]">live · DefiLlama yields</div>
            </div>

            {/* Yield comparison (deterministic) */}
            <div className="space-y-3">
              <div className="pb-3 border-b border-[var(--border)]">
                <div className="flex items-baseline justify-between mb-1">
                  <div className="text-xs text-[var(--fg-muted)]">Passive 50/50 hold (yield only)</div>
                  <div className="text-xl font-medium mono">{passive5050Yield.toFixed(2)}%</div>
                </div>
                <div className="text-[10px] text-[var(--fg-dim)] mono">
                  mETH {proj.methApr.toFixed(2)}% × 50% + USDY {proj.usdyApr.toFixed(2)}% × 50%
                </div>
              </div>

              <div className="pb-3 border-b border-[var(--border)]">
                <div className="flex items-baseline justify-between mb-1">
                  <div className="text-xs text-[var(--accent)]">Mensa AI yield (at {proj.methAllocPct}%/{100 - proj.methAllocPct}% split)</div>
                  <div className="text-xl font-medium mono text-[var(--accent)]">{aiYieldAtAlloc.toFixed(2)}%</div>
                </div>
                <div className="text-[10px] text-[var(--fg-dim)] mono">
                  mETH {proj.methApr.toFixed(2)}% × {proj.methAllocPct}% + USDY {proj.usdyApr.toFixed(2)}% × {100 - proj.methAllocPct}%
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <div className="text-xs text-[var(--fg-muted)]">Yield uplift</div>
                <div className={`text-sm font-medium mono ${yieldUplift >= 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
                  {yieldUpliftSign}{yieldUplift.toFixed(2)}pp
                </div>
              </div>
            </div>

            {/* Allocation alpha — kept separate from yield, no premature annualization */}
            <div className="mt-5 pt-4 border-t border-[var(--border)] space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Allocation alpha</div>
                <div className="text-[10px] text-[var(--fg-dim)]">on top of yield</div>
              </div>
              {alphaSampleRounds > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-[var(--fg-muted)]">Per-round average</span>
                    <span className={`mono ${perRoundAlphaBps >= 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
                      {alphaSign}{perRoundAlphaBps} bps
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-[var(--fg-muted)]">Cumulative ({alphaSampleRounds} round{alphaSampleRounds > 1 ? 's' : ''})</span>
                    <span className={`mono ${cumAlphaBps >= 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
                      {alphaSign}{cumAlphaBps} bps
                    </span>
                  </div>
                  {!enoughForAnnualization && (
                    <div className="text-[10px] text-[var(--fg-dim)] pt-1.5">
                      Annualized alpha will appear once ≥30 rounds settle. Below that, extrapolating {alphaSampleRounds} day{alphaSampleRounds > 1 ? 's' : ''} of data to a year is statistical noise.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[10px] text-[var(--fg-dim)]">No settled rounds yet — alpha will populate as the agent acts.</div>
              )}
            </div>

            {depositedWhole > 0 && (
              <div className="text-xs text-[var(--fg-muted)] mt-4 pt-3 border-t border-[var(--border)] leading-relaxed">
                Your <span className="mono">{fmt(depositedWhole, 4)} {asset}</span>{' '}
                ({fmtUsd(depositedWhole * tokenUsd)}) earns{' '}
                <span className="text-[var(--accent)] mono">~{fmtUsd(depositedWhole * tokenUsd * aiYieldAtAlloc / 100)}</span>/year
                from yield alone, before alpha and the 15% perf fee.
              </div>
            )}
          </div>
        )
      })()}

      {/* Deposit / Withdraw card */}
      <div className="card p-5 space-y-4">
        {/* Mode toggle */}
        <div className="flex gap-1 p-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border)]">
          {(['deposit', 'withdraw'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setStep('idle') }}
              className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition capitalize ${
                mode === m
                  ? 'bg-[var(--accent)] text-black'
                  : 'text-[var(--fg-muted)] hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Asset toggle */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-2">Asset</div>
          <div className="flex gap-2">
            {(['mETH', 'USDY'] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAsset(a)}
                className={`flex-1 py-2 px-3 rounded-md text-sm transition ${
                  asset === a
                    ? 'bg-[var(--accent-soft)] border border-[var(--accent)] text-[var(--accent)]'
                    : 'border border-[var(--border-strong)] text-[var(--fg-muted)] hover:text-white'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Amount</div>
            <button
              onClick={handleMax}
              className="text-[10px] text-[var(--fg-muted)] hover:text-[var(--accent)] transition flex items-center gap-1.5"
            >
              <span className="mono text-[var(--fg-dim)]">
                {mode === 'deposit'
                  ? `${fmt(walletWhole, 4)} ${asset} available`
                  : `${fmt(depositedWhole, 4)} ${asset} deposited`}
              </span>
              <span>·</span>
              <span>MAX</span>
            </button>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="0.01"
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] mono"
            placeholder={mode === 'deposit' ? '1.0' : '0.5'}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="text-[10px] text-[var(--fg-dim)]">
              ≈ {fmtUsd(amountWhole * tokenUsd)}
            </div>
            <div className="flex gap-1">
              {(asset === 'mETH' ? [0.01, 0.1, 1] : [10, 100, 1000]).map((q) => (
                <button
                  key={q}
                  onClick={() => setAmount(String(q))}
                  className="text-[10px] text-[var(--fg-muted)] hover:text-white border border-[var(--border)] rounded px-2 py-0.5"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {mode === 'deposit' && needsMint && (
            <button
              onClick={handleMint}
              disabled={isPending || confirming || isMainnet}
              className="btn-secondary w-full text-sm"
            >
              {step === 'minting' && isPending && 'Confirm in wallet...'}
              {step === 'minting' && confirming && 'Confirming...'}
              {!(step === 'minting' && (isPending || confirming)) && `Mint 1000 ${asset} (testnet faucet)`}
            </button>
          )}

          {mode === 'deposit' && !needsMint && needsApproval && (
            <button
              onClick={handleApprove}
              disabled={isPending || confirming}
              className="btn-secondary w-full text-sm"
            >
              {step === 'approving' && isPending && 'Confirm approval...'}
              {step === 'approving' && confirming && 'Approving...'}
              {!(step === 'approving' && (isPending || confirming)) && `Approve ${amount} ${asset}`}
            </button>
          )}

          {mode === 'deposit' && !needsMint && !needsApproval && (
            <button
              onClick={handleDeposit}
              disabled={isPending || confirming || amountWei === BigInt(0)}
              className="btn-accent w-full text-sm"
            >
              {step === 'depositing' && isPending && 'Confirm deposit...'}
              {step === 'depositing' && confirming && 'Depositing...'}
              {!(step === 'depositing' && (isPending || confirming)) && `Deposit ${amount} ${asset}`}
            </button>
          )}

          {mode === 'withdraw' && (
            <button
              onClick={handleWithdraw}
              disabled={
                isPending ||
                confirming ||
                amountWei === BigInt(0) ||
                (depositedBalance !== undefined && amountWei > depositedBalance)
              }
              className="btn-accent w-full text-sm"
            >
              {step === 'withdrawing' && isPending && 'Confirm withdraw...'}
              {step === 'withdrawing' && confirming && 'Withdrawing...'}
              {!(step === 'withdrawing' && (isPending || confirming)) && `Withdraw ${amount} ${asset}`}
            </button>
          )}
        </div>

        {/* Fee disclosure */}
        <div className="text-[10px] text-[var(--fg-dim)] leading-relaxed pt-2 border-t border-[var(--border)]">
          Mensa charges a{' '}
          <Tooltip content={GLOSSARY.perfFee} side="top">
            <span className="text-[var(--fg-muted)]">15% performance fee</span>
          </Tooltip>{' '}
          on yield generated (never on principal). Fees fund the bounty pool that pays humans who
          out-allocate the AI in tournaments.
        </div>

        {isSuccess && (step === 'depositing' || step === 'withdrawing') && (
          <div className="text-xs text-[var(--accent)] text-center">
            {step === 'depositing' ? 'Deposited! You can now vote in the tournament.' : 'Withdrawn successfully.'}
          </div>
        )}
      </div>
    </div>
  )
}
