import Nav from '@/components/Nav'
import DepositPanel from '@/components/DepositPanel'

export default function DepositPage() {
  return (
    <div className="min-h-screen relative">
      <Nav />
      <main className="relative z-10 max-w-2xl mx-auto px-6 pt-12 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-medium tracking-tight mb-2">Deposit</h1>
          <p className="text-sm text-[var(--fg-muted)]">
            Deposit mETH or USDY into the Mensa treasury. Your funds are managed
            by the AI agent and earn yield. Deposits also let you participate
            in tournament voting (min stake required on mainnet).
          </p>
        </div>

        <DepositPanel />

        <div className="mt-12 text-xs text-[var(--fg-dim)] leading-relaxed">
          <strong className="text-[var(--fg-muted)]">Testnet note:</strong> we use mock mETH and USDY tokens.
          Click &ldquo;Mint&rdquo; to receive 1000 free tokens for testing. On mainnet, you would
          deposit real liquid-staked ETH and Ondo USDY.
        </div>
      </main>
    </div>
  )
}
