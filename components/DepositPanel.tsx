'use client'

import { useState, useEffect } from 'react'
import { useAccount, useChainId, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { ACTIVE_CHAIN } from '@/lib/chains'
import { mantleSepolia } from '@/lib/wagmi'

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'o', type: 'address' }, { name: 's', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 's', type: 'address' }, { name: 'a', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'mint', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 't', type: 'address' }, { name: 'a', type: 'uint256' }], outputs: [] },
] as const

const AGENT_ABI = [
  { name: 'deposit', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'asset', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'userBalance', type: 'function', stateMutability: 'view', inputs: [{ name: 'u', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const

type Asset = 'mETH' | 'USDY'

export default function DepositPanel() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const isMantle = chainId === mantleSepolia.id

  const [asset, setAsset] = useState<Asset>('mETH')
  const [amount, setAmount] = useState('10')
  const [step, setStep] = useState<'idle' | 'minting' | 'approving' | 'depositing' | 'done'>('idle')

  const assetAddr = asset === 'mETH' ? ACTIVE_CHAIN.contracts.mETH : ACTIVE_CHAIN.contracts.USDY
  const agentAddr = ACTIVE_CHAIN.contracts.mensaAgent

  // Reads
  const { data: walletBalance, refetch: refetchBalance } = useReadContract({
    address: assetAddr as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isMantle },
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: assetAddr as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, agentAddr as `0x${string}`] : undefined,
    query: { enabled: !!address && isMantle },
  })

  const { data: depositedBalance, refetch: refetchDeposited } = useReadContract({
    address: agentAddr as `0x${string}`,
    abi: AGENT_ABI,
    functionName: 'userBalance',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isMantle },
  })

  // Writes
  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (isSuccess) {
      refetchBalance()
      refetchAllowance()
      refetchDeposited()
    }
  }, [isSuccess, refetchBalance, refetchAllowance, refetchDeposited])

  const amountWei = (() => {
    try { return parseUnits(amount || '0', 18) } catch { return BigInt(0) }
  })()

  const needsMint = walletBalance !== undefined && walletBalance < amountWei
  const needsApproval = allowance !== undefined && allowance < amountWei

  const handleMint = () => {
    if (!address) return
    setStep('minting')
    writeContract({
      address: assetAddr as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'mint',
      args: [address, parseUnits('1000', 18)],
    })
  }

  const handleApprove = () => {
    setStep('approving')
    writeContract({
      address: assetAddr as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [agentAddr as `0x${string}`, amountWei],
    })
  }

  const handleDeposit = () => {
    setStep('depositing')
    writeContract({
      address: agentAddr as `0x${string}`,
      abi: AGENT_ABI,
      functionName: 'deposit',
      args: [assetAddr as `0x${string}`, amountWei],
    })
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
        <div className="text-sm text-orange-400">Switch to Mantle Sepolia (chain 5003)</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="text-2xl font-medium tracking-tight mono">
            {walletBalance !== undefined ? formatUnits(walletBalance, 18).slice(0, 8) : '—'}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">Wallet {asset}</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-medium tracking-tight mono">
            {depositedBalance !== undefined ? formatUnits(depositedBalance, 18).slice(0, 8) : '—'}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">Deposited</div>
          <div className="text-[10px] text-[var(--fg-dim)] mt-1">total {asset === 'mETH' ? 'mETH' : 'USDY'} in agent</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-medium tracking-tight mono text-[var(--accent)]">
            ✓
          </div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">Eligible to vote</div>
          <div className="text-[10px] text-[var(--fg-dim)] mt-1">min stake = 0 (testnet)</div>
        </div>
      </div>

      {/* Asset toggle */}
      <div className="card p-5 space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-2">Asset</div>
          <div className="flex gap-2">
            {(['mETH', 'USDY'] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAsset(a)}
                className={`flex-1 py-2 px-3 rounded-md text-sm transition ${
                  asset === a
                    ? 'bg-white text-black'
                    : 'border border-[var(--border-strong)] text-[var(--fg-muted)] hover:text-white'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-2">Amount</div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="1"
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] mono"
            placeholder="10"
          />
          <div className="flex gap-2 mt-2">
            {[10, 100, 1000].map((q) => (
              <button
                key={q}
                onClick={() => setAmount(String(q))}
                className="text-xs text-[var(--fg-muted)] hover:text-white border border-[var(--border)] rounded px-2 py-1"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {needsMint && (
            <button
              onClick={handleMint}
              disabled={isPending || confirming}
              className="btn-secondary w-full text-sm"
            >
              {step === 'minting' && isPending && 'Confirm in wallet...'}
              {step === 'minting' && confirming && 'Confirming...'}
              {!(step === 'minting' && (isPending || confirming)) && `Mint 1000 ${asset} (testnet faucet)`}
            </button>
          )}

          {!needsMint && needsApproval && (
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

          {!needsMint && !needsApproval && (
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
        </div>

        {isSuccess && step === 'depositing' && (
          <div className="text-xs text-[var(--accent)] text-center">
            Deposited! You can now vote in the tournament.
          </div>
        )}
      </div>
    </div>
  )
}
