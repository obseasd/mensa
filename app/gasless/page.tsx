import Nav from '@/components/Nav'
import GaslessPanel from '@/components/GaslessPanel'

export const metadata = {
  title: 'Gasless onboarding · Mensa',
  description: 'First-deposit gasless flow on Mantle Mainnet powered by Etherspot Arka, the official Mantle AA partner.',
}

export default function GaslessPage() {
  return (
    <div className="min-h-screen relative">
      <Nav />
      <main className="relative z-10 max-w-2xl mx-auto px-6 pt-12 pb-20">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-wider mono" style={{ color: '#BDD2D1' }}>
            <span>●</span>
            <span>Experimental · ERC-4337</span>
          </div>
          <h1 className="text-3xl font-medium tracking-tight mb-2">Gasless onboarding</h1>
          <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
            Mensa&apos;s production deposit flow requires holding MNT to pay gas. This page is the first
            milestone toward removing that friction: a deterministic smart wallet is derived from your
            EOA, and user operations from it are sponsored by the Arka paymaster, the official Mantle
            Account Abstraction partner. The {' '}
            <a href="/docs#post-hackathon" className="underline hover:text-[var(--accent)]">
              Q3 2026 roadmap
            </a>{' '}
            milestone migrates the full deposit + claim flow onto this substrate.
          </p>
        </div>

        <GaslessPanel />

        <div className="mt-12 space-y-3 text-xs text-[var(--fg-dim)] leading-relaxed">
          <p>
            <strong className="text-[var(--fg-muted)]">How it works.</strong>{' '}
            Etherspot Prime SDK deploys a counter-factual smart-contract wallet for your EOA on Mantle
            Mainnet (chain 5000). User operations from that smart wallet are submitted to the Etherspot
            bundler, and the gas is paid by the Arka paymaster from a pool funded by the Mensa operator.
            You sign with MetaMask, the paymaster pays.
          </p>
          <p>
            <strong className="text-[var(--fg-muted)]">Limitations today.</strong>{' '}
            The smart wallet is a separate address from your EOA. To deposit mETH or USDY through it,
            you must transfer the tokens to the smart-wallet address first (one transaction from your
            EOA, which does require gas). The Q3 2026 production milestone adds a token-paymaster mode
            so the first transfer is also gasless: the user pays gas in USDY instead of MNT.
          </p>
          <p>
            <strong className="text-[var(--fg-muted)]">Source.</strong>{' '}
            All SDK calls live in{' '}
            <a
              href="https://github.com/obseasd/mensa/blob/master/lib/etherspot.ts"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--accent)] underline"
            >
              lib/etherspot.ts
            </a>
            . The Etherspot Mantle case study is at{' '}
            <a
              href="https://etherspot.io/case-studies/mantle/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--accent)] underline"
            >
              etherspot.io/case-studies/mantle
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  )
}
