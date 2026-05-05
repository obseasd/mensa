import Nav from '@/components/Nav'
import DepositPanel from '@/components/DepositPanel'
import { ACTIVE_CHAIN, MANTLE_MAINNET } from '@/lib/chains'

export default function DepositPage() {
  const isMainnet = ACTIVE_CHAIN.id === MANTLE_MAINNET.id
  return (
    <div className="min-h-screen relative">
      <Nav />
      <main className="relative z-10 max-w-2xl mx-auto px-6 pt-12 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-medium tracking-tight mb-2">Deposit</h1>
          <p className="text-sm text-[var(--fg-muted)]">
            Deposit mETH or USDY into the Mensa treasury. Mensa rebalances the split
            in real time across staked ETH and Ondo T-bills to maximize risk-adjusted yield.
            Depositors are also eligible to vote in the tournament.
          </p>
        </div>

        <DepositPanel />

        <div className="mt-12 text-xs text-[var(--fg-dim)] leading-relaxed space-y-2">
          {isMainnet ? (
            <>
              <p>
                <strong className="text-[var(--fg-muted)]">Mainnet · real funds.</strong>{' '}
                Bring real mETH (Mantle Liquid Staking) or USDY (Ondo) on Mantle. To get them:
                stake ETH for mETH, or buy USDY via{' '}
                <a href="https://ondo.finance" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)] underline">ondo.finance</a>.
              </p>
              <p>
                The agent contract is non-custodial: you keep withdrawal rights at all times.
                Smart contract risk applies — review the source on{' '}
                <a href="https://github.com/obseasd/mensa" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)] underline">GitHub</a>.
              </p>
            </>
          ) : (
            <p>
              <strong className="text-[var(--fg-muted)]">Testnet:</strong> mock mETH and USDY tokens.
              Use the Mint button below to grab 1000 free tokens for testing.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
