'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import {
  getPrimeSdk,
  getSmartWalletAddress,
  sendSponsoredCall,
  ETHERSPOT_API_KEY,
  MANTLE_BUNDLER_URL,
  ARKA_PAYMASTER_URL,
} from '@/lib/etherspot'
import { ACTIVE_CHAIN } from '@/lib/chains'
import { showToast } from './Toast'

type Status =
  | { kind: 'idle' }
  | { kind: 'loading'; message: string }
  | { kind: 'success'; message: string; txHash?: string }
  | { kind: 'error'; message: string }

export default function GaslessPanel() {
  const { address: eoa, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [smartWallet, setSmartWallet] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [sdkReady, setSdkReady] = useState(false)

  /// Derive the smart wallet address as soon as the user connects.
  useEffect(() => {
    if (!isConnected || !walletClient || !eoa) {
      setSmartWallet(null)
      setSdkReady(false)
      return
    }
    let cancelled = false
    async function init() {
      try {
        setStatus({ kind: 'loading', message: 'Deriving your smart wallet address...' })
        // walletClient implements the EIP-1193 provider interface that
        // Etherspot Prime SDK accepts as a WalletProviderLike.
        const sdk = getPrimeSdk(walletClient as unknown as Parameters<typeof getPrimeSdk>[0])
        const addr = await getSmartWalletAddress(sdk)
        if (cancelled) return
        setSmartWallet(addr)
        setSdkReady(true)
        setStatus({ kind: 'idle' })
      } catch (e) {
        if (cancelled) return
        const msg = (e as Error).message || 'Failed to derive smart wallet'
        setStatus({ kind: 'error', message: msg })
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [isConnected, walletClient, eoa])

  /// Sends a no-op sponsored tx (smart-wallet calls itself with empty data) to
  /// prove the Arka paymaster is funded and the integration works end-to-end.
  async function sendTestTx() {
    if (!smartWallet || !walletClient) return
    try {
      setStatus({ kind: 'loading', message: 'Building sponsored userOp...' })
      const sdk = getPrimeSdk(walletClient as unknown as Parameters<typeof getPrimeSdk>[0])
      const uoHash = await sendSponsoredCall(sdk, smartWallet, '0x')
      setStatus({
        kind: 'success',
        message: 'Sponsored userOp submitted to the Arka paymaster.',
        txHash: uoHash,
      })
      showToast('Sponsored userOp sent', 'success')
    } catch (e) {
      const raw = (e as Error).message || 'Sponsored tx failed'
      let hint = ''
      if (raw.toLowerCase().includes('paymaster')) {
        hint = ' (the Arka paymaster likely needs to be funded with MNT to sponsor txs).'
      } else if (raw.toLowerCase().includes('api') || raw.toLowerCase().includes('429')) {
        hint = ' (rate limit on the public Etherspot key; set NEXT_PUBLIC_ETHERSPOT_API_KEY).'
      }
      setStatus({ kind: 'error', message: raw + hint })
      showToast('Sponsored tx failed', 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Connection status */}
      <div className="card p-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mono mb-1">EOA wallet</div>
          {isConnected && eoa ? (
            <div className="text-sm mono">{eoa.slice(0, 8)}…{eoa.slice(-6)}</div>
          ) : (
            <div className="text-sm text-[var(--fg-muted)]">Not connected — connect MetaMask to begin</div>
          )}
        </div>
        <span
          className="text-[10px] mono px-2 py-1 border"
          style={{
            color: isConnected ? '#BDD2D1' : 'var(--fg-muted)',
            borderColor: isConnected ? '#BDD2D1' : 'var(--border)',
            borderRadius: 4,
          }}
        >
          {isConnected ? 'connected' : 'disconnected'}
        </span>
      </div>

      {/* Smart wallet derivation */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mono">Etherspot smart wallet (counter-factual)</div>
          <span
            className="text-[10px] mono px-2 py-1 border"
            style={{
              color: sdkReady ? '#BDD2D1' : 'var(--fg-muted)',
              borderColor: sdkReady ? '#BDD2D1' : 'var(--border)',
              borderRadius: 4,
            }}
          >
            {sdkReady ? 'derived' : 'pending'}
          </span>
        </div>
        {smartWallet ? (
          <a
            href={`${ACTIVE_CHAIN.explorer}/address/${smartWallet}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm mono hover:text-[var(--accent)] break-all"
          >
            {smartWallet}
          </a>
        ) : (
          <div className="text-sm text-[var(--fg-muted)]">Connect a wallet to derive your smart-wallet address.</div>
        )}
        <p className="text-[10px] text-[var(--fg-dim)] mt-3 leading-relaxed">
          This address is determined by CREATE2 from your EOA + the Etherspot factory.
          It has the same address before and after first deployment, so you can pre-fund it
          (with mETH or USDY) before the first sponsored tx is sent.
        </p>
      </div>

      {/* Sponsored tx test */}
      <div className="card p-4">
        <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mono mb-2">Send a sponsored test transaction</div>
        <p className="text-xs text-[var(--fg-muted)] leading-relaxed mb-3">
          Triggers a no-op userOp from your smart wallet, sponsored by the Arka paymaster.
          You sign the userOp with MetaMask but you do not pay gas. The MNT comes from the
          paymaster funding pool, not from your wallet.
        </p>
        <button
          className="btn-accent w-full"
          onClick={sendTestTx}
          disabled={!sdkReady || status.kind === 'loading'}
        >
          {status.kind === 'loading' ? 'Sending...' : 'Send sponsored tx'}
        </button>

        {/* Status panel */}
        {status.kind !== 'idle' && (
          <div
            className="mt-3 p-3 text-[11px] mono"
            style={{
              border: '1px solid var(--border)',
              borderRadius: 4,
              background: status.kind === 'error' ? '#3a1414' : status.kind === 'success' ? '#0e2c14' : 'var(--card-bg)',
            }}
          >
            <div>{status.message}</div>
            {status.kind === 'success' && status.txHash && (
              <div className="mt-2">
                <span className="text-[var(--fg-muted)]">UserOp hash:</span>{' '}
                <span className="break-all">{status.txHash}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SDK config readout (for transparency) */}
      <div className="card p-4">
        <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mono mb-2">SDK config</div>
        <div className="grid gap-1.5 text-[11px] mono">
          <div className="flex justify-between gap-2">
            <span className="text-[var(--fg-muted)]">Bundler</span>
            <a href={MANTLE_BUNDLER_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)] truncate">
              {MANTLE_BUNDLER_URL}
            </a>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[var(--fg-muted)]">Paymaster</span>
            <a href={ARKA_PAYMASTER_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)] truncate">
              {ARKA_PAYMASTER_URL}
            </a>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[var(--fg-muted)]">Chain</span>
            <span>Mantle Mainnet · 5000</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[var(--fg-muted)]">API key mode</span>
            <span>{ETHERSPOT_API_KEY === 'etherspot_public_key' ? 'public (rate-limited)' : 'production'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
