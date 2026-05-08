import Nav from '@/components/Nav'
import ArchitectureDiagram from '@/components/ArchitectureDiagram'
import { ACTIVE_CHAIN } from '@/lib/chains'

const CONTRACTS = [
  {
    name: 'MensaAgent',
    addr: ACTIVE_CHAIN.contracts.mensaAgent,
    role: 'The treasury. Holds user-deposited mETH and USDY. AI operator triggers executeAllocation() to rebalance, log a decision, and open a tournament round atomically.',
    risk: 'Risk caps: max 95% in single asset, min 2% rebalance threshold, AI operator address can only execute pre-approved actions.',
  },
  {
    name: 'DecisionLog',
    addr: ACTIVE_CHAIN.contracts.decisionLog,
    role: 'Permanent on-chain record of every agent decision. Each decision stores action, confidence, reasoning hash, and parameters. Full reasoning text is emitted as event data for indexers.',
    risk: 'Append-only. Only the agent contract can write. Mantle\'s low gas makes per-decision logging economically viable.',
  },
  {
    name: 'TournamentVault',
    addr: ACTIVE_CHAIN.contracts.tournamentVault,
    role: 'The Turing Test mechanic. Each round opens with the AI\'s allocation snapshot. Anyone can vote with their human allocation. After settlement, performance is computed on-chain and outcome (AI_WINS / HUMAN_WINS / TIE) recorded.',
    risk: 'Settler role can settle rounds and supply human allocation aggregate. In production, this would use a price oracle and a median of human votes.',
  },
]

const STACK = [
  { layer: 'Frontend', tech: 'Next.js 16, Tailwind CSS v4, Turbopack' },
  { layer: 'Wallet', tech: 'wagmi v2, viem (Mantle Mainnet + Sepolia)' },
  { layer: 'Smart contracts', tech: 'Solidity 0.8.24, OpenZeppelin v5, Foundry' },
  { layer: 'AI', tech: 'Claude Haiku 4.5 via Anthropic SDK' },
  { layer: 'RWA', tech: 'Mantle mETH (liquid staking), Ondo USDY (T-bills)' },
  { layer: 'Trading signals', tech: 'Bybit API (off-chain market data)' },
  { layer: 'Skills', tech: 'Byreal Skills CLI (agent composability)' },
  { layer: 'Deploy', tech: 'Vercel (frontend), Mantle Sepolia + Mainnet (contracts)' },
]

export default function DocsPage() {
  return (
    <div className="min-h-screen relative">
      <Nav />

      <main className="relative z-10 max-w-3xl mx-auto px-6 pt-12 pb-20">
        <div className="mb-12">
          <h1 className="text-3xl font-medium tracking-tight mb-2">Architecture</h1>
          <p className="text-sm text-[var(--fg-muted)]">
            How Mensa works: the contracts, the agent loop, and why every piece is on Mantle.
          </p>
        </div>

        {/* The thesis */}
        <section className="mb-12">
          <h2 className="text-lg font-medium mb-4">The thesis</h2>
          <p className="text-sm text-[var(--fg-muted)] leading-relaxed mb-3">
            You can&apos;t trust an AI with your money if you can&apos;t verify its reasoning.
          </p>
          <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
            Mensa solves this with three primitives. Every decision is logged on-chain.
            Every decision is explained in plain English. Every decision is challenged
            by humans in a head-to-head tournament. The results are a permanent,
            verifiable record of whether the AI deserves your funds.
          </p>
        </section>

        {/* Architecture diagram */}
        <section className="mb-12">
          <h2 className="text-lg font-medium mb-4">Flow</h2>
          <ArchitectureDiagram />
        </section>

        {/* Contracts */}
        <section className="mb-12">
          <h2 className="text-lg font-medium mb-4">Contracts</h2>
          <div className="space-y-3">
            {CONTRACTS.map((c) => (
              <div key={c.name} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">{c.name}</h3>
                  <a
                    href={`${ACTIVE_CHAIN.explorer}/address/${c.addr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs mono text-[var(--accent)] hover:underline"
                  >
                    {c.addr.slice(0, 8)}...{c.addr.slice(-6)}
                  </a>
                </div>
                <p className="text-sm text-[var(--fg-muted)] leading-relaxed mb-3">{c.role}</p>
                <p className="text-xs text-[var(--fg-dim)] leading-relaxed">{c.risk}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tech stack */}
        <section className="mb-12">
          <h2 className="text-lg font-medium mb-4">Stack</h2>
          <div className="card overflow-hidden">
            {STACK.map((s, i) => (
              <div
                key={s.layer}
                className={`grid grid-cols-3 px-5 py-3 text-sm ${i < STACK.length - 1 ? 'border-b border-[var(--border)]' : ''}`}
              >
                <div className="text-[var(--fg-muted)]">{s.layer}</div>
                <div className="col-span-2 text-[var(--fg)]">{s.tech}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Why Mantle */}
        <section className="mb-12">
          <h2 className="text-lg font-medium mb-4">Why Mantle</h2>
          <div className="grid gap-3">
            {[
              { title: 'mETH liquid staking', detail: 'Mantle\'s native LST is a first-class asset in our treasury. The agent rebalances its yield against USDY in real time. Not portable to other chains.' },
              { title: 'USDY availability', detail: 'Real T-bill yield via Ondo\'s deployment on Mantle. The risk-adjusted alternative to mETH that makes the allocation problem interesting.' },
              { title: 'Low-gas decision logging', detail: 'Every agent decision — including the full reasoning text emitted as event data — is written on-chain. Mantle\'s low fees make this economically viable; on Ethereum L1 it would be prohibitive.' },
              { title: 'Byreal Skills CLI', detail: 'Mensa\'s agent loop is exposed as a Byreal Skill. Other agents (or humans via CLI) can compose with Mensa as a callable building block.' },
              { title: 'Bybit signal integration', detail: 'Off-chain market data via Bybit API enriches the agent\'s context. CeFi data informing DeFi execution.' },
              { title: 'On-chain Turing tournament', detail: 'A Mantle smart contract pits AI vs human allocators on identical inputs. Outcomes settle on-chain. The Turing Test is verifiable, not subjective.' },
            ].map((s) => (
              <div key={s.title} className="card p-4">
                <div className="text-sm font-medium mb-1">{s.title}</div>
                <div className="text-xs text-[var(--fg-muted)] leading-relaxed">{s.detail}</div>
              </div>
            ))}
          </div>
        </section>

        {/* MVP scope & roadmap */}
        <section className="mb-12">
          <h2 className="text-lg font-medium mb-4">MVP scope & roadmap</h2>
          <p className="text-sm text-[var(--fg-muted)] leading-relaxed mb-4">
            Mensa is a hackathon-stage prototype focused on the AI&apos;s
            decision-making loop and the Turing tournament. The treasury layer is
            intentionally minimal — production-ready features are listed below.
          </p>

          <div className="grid gap-3">
            <div className="card p-4">
              <div className="flex items-start gap-3 mb-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--accent)] mono shrink-0 mt-0.5">Now</span>
                <div className="text-sm font-medium">Notional rebalancing</div>
              </div>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                <code className="text-[var(--fg)] mono">executeAllocation()</code> updates a target
                allocation variable, opens a tournament round, and logs reasoning on-chain. It does
                <span className="text-[var(--fg)]"> not</span> swap underlying tokens. The treasury holds
                whatever assets users deposited; the AI&apos;s decision is measured against price moves
                of mETH and USDY but no actual swap is executed.
              </p>
              <p className="text-xs text-[var(--fg-dim)] mt-2">
                <span className="text-[var(--fg-muted)]">Why:</span> rebalancing on a single round
                without slippage controls would be dangerous. Better to first prove the AI&apos;s
                allocation calls beat baseline (which the alpha stat does), then add execution.
              </p>
            </div>

            <div className="card p-4">
              <div className="flex items-start gap-3 mb-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--accent)] mono shrink-0 mt-0.5">Now</span>
                <div className="text-sm font-medium">Per-user balance tracker (not shares)</div>
              </div>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                <code className="text-[var(--fg)] mono">userDeposits[address]</code> is a single
                accumulator that doesn&apos;t distinguish mETH from USDY. The MVP is safe because TVL is
                small / zero, but in a multi-user mainnet deployment a depositor of mETH could in theory
                withdraw another user&apos;s USDY. Not exploited in the demo, but a known design gap.
              </p>
            </div>

            <div className="card p-4">
              <div className="flex items-start gap-3 mb-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mono shrink-0 mt-0.5">Next</span>
                <div className="text-sm font-medium">ERC-4626 share model + real swap execution</div>
              </div>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                Replace the unified balance with shares minted at deposit and burned at withdraw,
                proportional to USD value of the treasury at the time. Every depositor owns
                a slice of the entire pool, regardless of asset composition.
                <span className="text-[var(--fg)]"> executeAllocation</span> then routes a real swap via
                Velora (mainnet) or Uniswap V3 (Sepolia) with slippage caps and a sanity check on
                price. Both pieces are scaffolded — see the
                {' '}<code className="text-[var(--fg)] mono">simulation.ts</code> module — and were
                deferred to keep the demo focused on the AI loop.
              </p>
            </div>

            <div className="card p-4">
              <div className="flex items-start gap-3 mb-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mono shrink-0 mt-0.5">Next</span>
                <div className="text-sm font-medium">Real human-vote aggregation in settle</div>
              </div>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                The auto-settle script currently passes a fixed 50% as the human aggregate when no
                voters showed up — which makes the &quot;Human&quot; column actually a 50/50 baseline.
                Once voting picks up we&apos;ll compute the reputation-weighted average of votes
                off-chain and pass that into <code className="text-[var(--fg)] mono">settleRound</code>.
                Until then the tournament UI labels it as &quot;Baseline 50/50&quot; for honesty.
              </p>
            </div>

            <div className="card p-4">
              <div className="flex items-start gap-3 mb-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mono shrink-0 mt-0.5">Later</span>
                <div className="text-sm font-medium">Hybrid AI / human steering</div>
              </div>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                Right now humans only score against the AI. A future iteration feeds the
                reputation-weighted human consensus back into the next Claude call as a soft input,
                turning Mensa into a hybrid where the AI learns from voters who consistently
                outperform it.
              </p>
            </div>
          </div>
        </section>

        {/* Run locally */}
        <section className="mb-12">
          <h2 className="text-lg font-medium mb-4">Run locally</h2>
          <div className="card p-5 mono text-xs leading-relaxed overflow-x-auto whitespace-pre text-[var(--fg-muted)]">
{`# Clone & install
git clone https://github.com/obseasd/mensa
cd mensa
npm install --legacy-peer-deps

# Run frontend
npm run dev
# http://localhost:3000

# Compile + test contracts
cd contracts
forge install
forge test
# 10/10 passing

# Deploy (testnet)
PRIVATE_KEY=0x... forge script script/Deploy.s.sol:Deploy \\
  --rpc-url mantle_sepolia --broadcast --legacy`}
          </div>
        </section>
      </main>
    </div>
  )
}
