import Nav from '@/components/Nav'
import ArchitectureDiagram from '@/components/ArchitectureDiagram'
import YieldProtocols from '@/components/YieldProtocols'
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
  {
    name: 'Reputation',
    addr: ACTIVE_CHAIN.contracts.reputation,
    role: 'Tracks each voter\'s on-chain history: total votes, correct votes (rounds they beat the AI), reputation score, first-participation timestamp. Read by TournamentVault to compute sqrt-weighted vote weight.',
    risk: 'Only TournamentVault can update scores. Sqrt weighting caps the influence of any single account, mitigating Sybil attacks and whale dominance.',
  },
  {
    name: 'BountyPool',
    addr: ACTIVE_CHAIN.contracts.bountyPool,
    role: 'Receives 15% of yield as performance fee from MensaAgent. On each settled round, distributes a share to humans who outperformed the AI. Split: 50% to round winners, 30% to a reputation pool (top monthly), 20% to ops.',
    risk: 'Pull-based claim pattern (no push transfers) — winners must claim, no reentrancy surface. Only MensaAgent funds it; only TournamentVault triggers payouts.',
  },
  {
    name: 'MensaBadges',
    addr: ACTIVE_CHAIN.contracts.badges,
    role: 'Soulbound (non-transferable) ERC-721 badges minted automatically on milestones: First Vote, Beat AI 10x, Beat AI 100x, 5-Win Streak, Reputation 500, Reputation 1000, Top 10 Monthly.',
    risk: 'Transfer functions disabled (transfer reverts). Only TournamentVault can mint. No admin burn.',
  },
]

const STACK = [
  { layer: 'Frontend', tech: 'Next.js 16, Tailwind CSS v4, Turbopack' },
  { layer: 'Wallet', tech: 'wagmi v2, viem (Mantle Mainnet + Sepolia)' },
  { layer: 'Smart contracts', tech: 'Solidity 0.8.24, OpenZeppelin v5, Foundry' },
  { layer: 'AI', tech: 'Claude Haiku 4.5 via Anthropic SDK' },
  { layer: 'RWA', tech: 'Mantle mETH (liquid staking), Ondo USDY (T-bills)' },
  { layer: 'Market data', tech: 'Coingecko (ETH price), DefiLlama (yields)' },
  { layer: 'Automation', tech: 'GitHub Actions cron (agent loop + auto-settlement)' },
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
              { title: 'Self-feedback memory loop', detail: 'Before each Claude call, the agent reads its own track record from on-chain settled rounds and injects it into the prompt: per-round alpha vs 50/50 baseline, recent decisions vs in-hindsight optimal. Self-correction without external retraining.' },
              { title: 'Auto-settlement cron', detail: 'GitHub Actions runs every 30 min: settle any expired rounds with current prices, then call Claude for the next allocation. Fully autonomous, the only human in the loop is whoever deposits or votes.' },
              { title: 'On-chain Turing tournament', detail: 'A Mantle smart contract pits AI vs human allocators on identical inputs. Outcomes settle on-chain. The Turing Test is verifiable, not subjective.' },
            ].map((s) => (
              <div key={s.title} className="card p-4">
                <div className="text-sm font-medium mb-1">{s.title}</div>
                <div className="text-xs text-[var(--fg-muted)] leading-relaxed">{s.detail}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Hackathon tracks */}
        <section className="mb-12">
          <h2 className="text-lg font-medium mb-4">Hackathon tracks</h2>
          <p className="text-sm text-[var(--fg-muted)] leading-relaxed mb-4">
            Mantle Turing Test 2026 · Phase 2 (AI Awakening). Mensa is submitted to multiple
            tracks (a single BUIDL can be entered into several, but only one prize wins).
          </p>
          <div className="grid gap-3">
            {[
              {
                name: 'AI × RWA',
                primary: true,
                fit: 'Path B — end-user-facing AI × RWA product. Mensa is exactly an "intelligent RWA portfolio management agent" managing mETH (Mantle LST) and USDY (Ondo tokenized T-bills), the two RWAs the track explicitly names.',
              },
              {
                name: 'Grand Champion',
                primary: false,
                fit: 'Cross-track. Scores Technical Depth (AI × on-chain integration, 6 verified contracts), Innovation (Turing tournament + verifiable alpha), Mantle Ecosystem Contribution (RWA-native, low-gas decision logging), and Product Completeness (live deployed app, autonomous loop).',
              },
              {
                name: 'AI Alpha & Data',
                primary: false,
                fit: 'Path B — trading strategy with verifiable on-chain Alpha. Every decision and outcome is settled on-chain; cumulative alpha vs 50/50 baseline is computed from contract reads, not self-reported.',
              },
              {
                name: 'Best UI/UX Award',
                primary: false,
                fit: 'Clean dark Mantle-aligned design with sage accent. AI interaction surfaced via the live decision card with reasoning. Fully responsive.',
              },
              {
                name: '20 Project Deployment Award',
                primary: false,
                fit: 'First-come, first-served. Mensa hits all bars: 6 contracts deployed and verified on Mantle Mainnet, AI-powered function (executeAllocation) callable on-chain, public frontend, open-source repo with README.',
              },
            ].map((t) => (
              <div key={t.name} className="card p-4">
                <div className="flex items-start gap-3 mb-1">
                  {t.primary && (
                    <span className="text-[10px] uppercase tracking-wider text-[var(--accent)] mono shrink-0 mt-0.5">Primary</span>
                  )}
                  <div className="text-sm font-medium">{t.name}</div>
                </div>
                <p className="text-xs text-[var(--fg-muted)] leading-relaxed">{t.fit}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Compliance & target users */}
        <section className="mb-12">
          <h2 className="text-lg font-medium mb-4">Compliance posture</h2>
          <p className="text-sm text-[var(--fg-muted)] leading-relaxed mb-4">
            Mensa is a non-custodial smart-contract treasury. The protocol itself
            doesn&apos;t collect or hold off-chain user data, but RWAs come with
            jurisdictional rails. How we think about it:
          </p>

          <div className="grid gap-3">
            <div className="card p-4">
              <div className="text-sm font-medium mb-1">Asset-side (USDY) compliance is upstream</div>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                Ondo&apos;s USDY is itself KYC-gated at issuance — only whitelisted addresses can
                receive newly-minted USDY directly from Ondo. Mensa never mints USDY; we accept it
                from depositors who already hold it. The KYC perimeter sits with Ondo, not us,
                which is the standard pattern for DeFi protocols composing with permissioned RWAs.
              </p>
            </div>

            <div className="card p-4">
              <div className="text-sm font-medium mb-1">Sanctions screening (next)</div>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                For institutional adoption we&apos;d wire a sanctions hook into{' '}
                <code className="text-[var(--fg)] mono">deposit()</code> and{' '}
                <code className="text-[var(--fg)] mono">withdraw()</code> that consults Chainalysis
                Oracle (or equivalent) and reverts on hits. Cost: ~30k gas per call on Mantle, a few
                cents. Designed but not yet wired into the MVP contract.
              </p>
            </div>

            <div className="card p-4">
              <div className="text-sm font-medium mb-1">Geo-fencing at the frontend (next)</div>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                The smart contracts are jurisdiction-neutral, but the frontend can refuse to render
                deposit UI for IPs in restricted regions (US persons for unregistered RWAs, etc.).
                Cloudflare Workers / Vercel Edge config — standard pattern, deferred until we have
                a real go-to-market plan.
              </p>
            </div>

            <div className="card p-4">
              <div className="text-sm font-medium mb-1">Audit & disclosure</div>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                Source is open under MIT.{' '}
                <a href="https://github.com/obseasd/mensa" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">GitHub repo</a>{' '}
                with Foundry tests. All 6 contracts verified on Mantlescan (linked in the Contracts
                section above). A formal audit by a Web3 audit firm (Spearbit / Trail of Bits / Macro)
                is part of any production launch checklist — not done at hackathon stage.
              </p>
            </div>
          </div>
        </section>

        {/* Mantle yield landscape */}
        <section className="mb-12">
          <h2 className="text-lg font-medium mb-2">Mantle yield landscape</h2>
          <p className="text-sm text-[var(--fg-muted)] leading-relaxed mb-4">
            The broader DeFi yield universe Mensa monitors on Mantle. Today the agent
            allocates only to <span className="text-[var(--fg)]">mETH</span> (liquid staking)
            and <span className="text-[var(--fg)]">USDY</span> (T-bills). Aave, Lendle, and
            Fluxion are listed for context — adding them to the allocation set is
            gated on the share-model upgrade in the roadmap below. Click a pool for APY history.
          </p>
          <YieldProtocols />
        </section>

        {/* MVP scope & roadmap */}
        <section className="mb-12" id="mvp-scope">
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
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed mb-3">
                Replace the unified balance with shares minted at deposit and burned at withdraw,
                proportional to USD value of the treasury at the time. Every depositor owns a
                slice of the entire pool, regardless of asset composition.{' '}
                <code className="text-[var(--fg)] mono">executeAllocation</code> then routes a real
                swap via a DEX aggregator with slippage caps and a sanity check on price.
              </p>
              <p className="text-xs text-[var(--fg-dim)] leading-relaxed">
                <span className="text-[var(--fg-muted)]">DEX reality check:</span> we surveyed Merchant
                Moe V2 (router{' '}
                <a
                  href="https://mantlescan.xyz/address/0xeaEE7EE68874218c3558b40063c42B82D3E7232a"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--accent)] underline"
                >
                  0xeaEE...232a
                </a>
                ) for live mETH↔USDY routing. No direct pool. Multi-hop via USDC is technically
                possible but pool reserves are thin (mETH/USDC ≈ $6 TVL, USDC/USDY ≈ $22 TVL as of
                this run) — any meaningful swap would slip 30-50%. Real execution is gated less on
                our code and more on Mantle DEX liquidity maturity. Velora aggregator on mainnet
                is the production path; until then the tournament mechanism measures the AI&apos;s
                allocation quality on theoretical returns, which is what alpha tracking does.
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

# Deploy to Mantle Mainnet
PRIVATE_KEY=0x... forge script script/Deploy.s.sol:Deploy \\
  --rpc-url https://rpc.mantle.xyz --broadcast --legacy

# Run a single agent cycle (or set up GH Actions cron)
ANTHROPIC_API_KEY=sk-ant-... PRIVATE_KEY=0x... \\
  node scripts/agent-loop.mjs --once`}
          </div>
        </section>
      </main>
    </div>
  )
}
