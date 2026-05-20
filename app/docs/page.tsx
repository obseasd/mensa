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
  {
    name: 'MensaAgentIdentity (ERC-8004)',
    addr: ACTIVE_CHAIN.contracts.agentIdentity,
    role: 'ERC-8004 IdentityRegistry implementation. The Mensa agent is registered as agentId #1 with a tokenURI pointing to a discoverable agent card (capabilities, services, model, contracts) served from /api/agent-card. Any A2A-compatible agent or protocol can read this NFT to discover what Mensa is and how to compose with it.',
    risk: 'Spec-compliant with eips.ethereum.org/EIPS/eip-8004 — register / setAgentURI / setMetadata / getAgentWallet. EIP-712 wallet rotation deferred (standard ERC-721 transfer is sufficient for the MVP).',
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
        <div className="mb-8">
          <h1 className="text-3xl font-medium tracking-tight mb-2">Architecture</h1>
          <p className="text-sm text-[var(--fg-muted)]">
            How Mensa works: the contracts, the agent loop, and why every piece is on Mantle.
          </p>
        </div>

        {/* Quick nav — helps a judge or visitor jump straight to what they care about */}
        <nav className="mb-12 flex flex-wrap gap-2 text-[11px]">
          {[
            { href: '#thesis', label: 'Thesis' },
            { href: '#flow', label: 'Flow' },
            { href: '#post-hackathon', label: 'Post-hackathon roadmap' },
            { href: '#contracts', label: 'Contracts' },
            { href: '#stack', label: 'Stack' },
            { href: '#why-mantle', label: 'Why Mantle' },
            { href: '#tracks', label: 'Hackathon tracks' },
            { href: '#compliance', label: 'Compliance' },
            { href: '#yield-landscape', label: 'Mantle yield markets' },
            { href: '#strategy-economics', label: 'Strategy economics' },
            { href: '#mvp-scope', label: 'MVP scope & roadmap' },
            { href: '#run-locally', label: 'Run locally' },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="px-2 py-1 rounded border border-[var(--border)] text-[var(--fg-muted)] hover:text-white hover:border-[var(--border-strong)] transition"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* The thesis */}
        <section id="thesis" className="mb-12 scroll-mt-24">
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
        <section id="flow" className="mb-12 scroll-mt-24">
          <h2 className="text-lg font-medium mb-4">Flow</h2>
          <ArchitectureDiagram />
        </section>

        {/* Post-hackathon roadmap */}
        <section id="post-hackathon" className="mb-12 scroll-mt-24">
          <h2 className="text-lg font-medium mb-4">Post-hackathon roadmap</h2>
          <p className="text-sm text-[var(--fg-muted)] leading-relaxed mb-4">
            What Mensa ships next, once the Mantle Turing Test judging closes. Each milestone has a concrete trigger, a target metric, and a Mantle-anchored partner where relevant. Mensa is not a one-off hackathon submission; the roadmap below is the post-grant trajectory.
          </p>

          <div className="grid gap-3">
            <div className="card p-4">
              <div className="flex items-start gap-3 mb-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--accent)] mono shrink-0 mt-0.5">Q3 2026</span>
                <div className="text-sm font-medium">ERC-4626 share model + Velora swap execution</div>
              </div>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                Migrate the unified user balance to a proper ERC-4626 vault with shares minted at deposit and burned at withdraw. Route every <code className="text-[var(--fg)] mono">executeAllocation</code> through the Velora aggregator with slippage caps and price sanity checks. This is the production substrate every other milestone sits on.
              </p>
              <p className="text-xs text-[var(--fg-dim)] mt-2">
                <span className="text-[var(--fg-muted)]">Target:</span> V2 contracts audited (Zellic, ChainSecurity, or Code4rena), $100K real TVL milestone, the first 50 rounds with actual swap-realized returns instead of notional.
              </p>
            </div>

            <div className="card p-4">
              <div className="flex items-start gap-3 mb-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--accent)] mono shrink-0 mt-0.5">Q3 2026</span>
                <div className="text-sm font-medium">Gasless first deposit via Etherspot Arka</div>
              </div>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                Integrate the Etherspot Arka Paymaster, the official Mantle AA partner, to sponsor the first deposit + first claim for new users so they can join without holding MNT. Fees come from the BountyPool operations cut (20% of perf fee), making the sponsorship sustainable as TVL scales.
              </p>
              <p className="text-xs text-[var(--fg-dim)] mt-2">
                <span className="text-[var(--fg-muted)]">Target:</span> 1-click onboarding from a fresh wallet, measured by the conversion rate from landing page visit to first deposit.
              </p>
            </div>

            <div className="card p-4">
              <div className="flex items-start gap-3 mb-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--accent)] mono shrink-0 mt-0.5">Q4 2026</span>
                <div className="text-sm font-medium">DAO treasury beta with Mantle ecosystem partners</div>
              </div>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                Mensa&apos;s primary user segment is DAOs holding idle stablecoin or RWA in their treasury. Engage 3 to 5 ecosystem DAOs (Mantle-native + cross-chain) for a private beta where the AI manages a defined slice of their treasury, with on-chain transparency on every decision.
              </p>
              <p className="text-xs text-[var(--fg-dim)] mt-2">
                <span className="text-[var(--fg-muted)]">Target:</span> $1M TVL across pilot partners, with at least 2 partners publicly verifiable on Mantlescan.
              </p>
            </div>

            <div className="card p-4">
              <div className="flex items-start gap-3 mb-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--accent)] mono shrink-0 mt-0.5">Q4 2026</span>
                <div className="text-sm font-medium">Multi-asset basket extension</div>
              </div>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                Extend the basket from 2 assets (mETH + USDY) to 4-6 assets covering the live Mantle RWA stack: mUSD, COOK collaboration assets, additional Ondo primitives (OUSG, USDY tranches), and a hedging leg. The Claude reasoning loop scales naturally to N assets since the prompt already accepts asset metadata as a list.
              </p>
              <p className="text-xs text-[var(--fg-dim)] mt-2">
                <span className="text-[var(--fg-muted)]">Target:</span> 4-6 assets supported, basket-aware allocation with explicit risk budgets per asset class.
              </p>
            </div>

            <div className="card p-4">
              <div className="flex items-start gap-3 mb-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--accent)] mono shrink-0 mt-0.5">Q1 2027</span>
                <div className="text-sm font-medium">Compliance layer for institutional flows</div>
              </div>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                Mantle&apos;s AI x RWA Path A contemplates institutional capital. Add a per-user KYC gating layer (Brale, Polygon ID, or similar attestation provider) that unlocks institutional deposits while keeping the retail tournament publicly open. The AI operator and contracts stay unchanged; only the deposit gate adds an attestation check.
              </p>
              <p className="text-xs text-[var(--fg-dim)] mt-2">
                <span className="text-[var(--fg-muted)]">Target:</span> First institutional pilot signed, regulatory memo published.
              </p>
            </div>

            <div className="card p-4">
              <div className="flex items-start gap-3 mb-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mono shrink-0 mt-0.5">Q2 2027</span>
                <div className="text-sm font-medium">Decentralized AI operator rotation</div>
              </div>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                Today there is a single AI operator wallet running Claude Haiku 4.5. V3 rotates between multiple LLM backends (Claude, GPT, open-source Llama-derivatives) with the rotation choice itself voted on by reputation-weighted humans every N rounds. The ERC-8004 IdentityRegistry already supports multiple agents, so the contract change is incremental.
              </p>
              <p className="text-xs text-[var(--fg-dim)] mt-2">
                <span className="text-[var(--fg-muted)]">Target:</span> Reduce single-point-of-trust on the operator role; surface model-versus-model alpha as a public benchmark.
              </p>
            </div>

            <div className="card p-4 border-[var(--accent)]" style={{ background: 'var(--accent-soft)' }}>
              <div className="flex items-start gap-3 mb-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--accent)] mono shrink-0 mt-0.5">North star</span>
                <div className="text-sm font-medium">Be the verifiable AI treasury layer for the Mantle RWA stack</div>
              </div>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                When a DAO, an institutional desk, or a sophisticated retail user wants AI-managed exposure to Mantle RWAs, Mensa is the default substrate: every decision on-chain, every reasoning trace auditable, every claim of alpha computable from contract reads, and humans can put their own allocation on the line against the AI in the tournament.
              </p>
            </div>
          </div>
        </section>

        {/* Contracts */}
        <section id="contracts" className="mb-12 scroll-mt-24">
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
        <section id="stack" className="mb-12 scroll-mt-24">
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
        <section id="why-mantle" className="mb-12 scroll-mt-24">
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
        <section id="tracks" className="mb-12 scroll-mt-24">
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
                fit: 'Cross-track. Scores Technical Depth (AI × on-chain integration, 7 verified contracts including ERC-8004 IdentityRegistry), Innovation (Turing tournament + verifiable alpha + self-feedback memory loop), Mantle Ecosystem Contribution (RWA-native, low-gas decision logging), and Product Completeness (live deployed app, autonomous loop).',
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
                fit: 'First-come, first-served. Mensa hits all bars: 7 contracts deployed and verified on Mantle Mainnet, AI-powered function (executeAllocation) callable on-chain, public frontend, open-source repo with README + Foundry tests + GitHub Actions cron.',
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
        <section id="compliance" className="mb-12 scroll-mt-24">
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
                with Foundry tests. All 7 contracts verified on Mantlescan (linked in the Contracts
                section above). A formal audit by a Web3 audit firm (Spearbit / Trail of Bits / Macro)
                is part of any production launch checklist — not done at hackathon stage.
              </p>
            </div>
          </div>
        </section>

        {/* Mantle yield landscape */}
        <section id="yield-landscape" className="mb-12 scroll-mt-24">
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

        {/* Strategy economics — sourced cost / break-even analysis */}
        <section id="strategy-economics" className="mb-12 scroll-mt-24">
          <h2 className="text-lg font-medium mb-4">Strategy economics</h2>
          <p className="text-sm text-[var(--fg-muted)] leading-relaxed mb-4">
            A treasury agent that rebalances aggressively can lose to a passive 50/50 even if
            its allocation calls are correct, because rebalancing has a real cost (gas + DEX
            slippage). This section makes that cost explicit, with sourced numbers from
            Mantle today, and derives the minimum viable treasury size for active
            rebalancing on Mantle.
          </p>

          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-2">Cost of a single rebalance, observed on-chain (2026-05-15)</div>
          <div className="card p-4 mb-4">
            <table className="w-full text-xs">
              <tbody className="text-[var(--fg-muted)]">
                <tr className="border-b border-[var(--border)]">
                  <td className="py-1.5 pr-3">Average gas per <code className="text-[var(--fg)] mono">executeAllocation</code></td>
                  <td className="py-1.5 mono text-right text-white">299,416 gas</td>
                </tr>
                <tr className="border-b border-[var(--border)]">
                  <td className="py-1.5 pr-3">Mantle gas price (typical, observed)</td>
                  <td className="py-1.5 mono text-right text-white">50 gwei</td>
                </tr>
                <tr className="border-b border-[var(--border)]">
                  <td className="py-1.5 pr-3">Cost per rebalance in MNT</td>
                  <td className="py-1.5 mono text-right text-white">0.0150 MNT</td>
                </tr>
                <tr className="border-b border-[var(--border)]">
                  <td className="py-1.5 pr-3">MNT spot price (DefiLlama)</td>
                  <td className="py-1.5 mono text-right text-white">$0.6722</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3">Cost per rebalance in USD</td>
                  <td className="py-1.5 mono text-right text-[var(--accent)]">$0.0101</td>
                </tr>
              </tbody>
            </table>
            <p className="text-[10px] text-[var(--fg-dim)] mt-2 leading-relaxed">
              Source: Mantlescan API <code className="mono">eth_getTransactionReceipt</code> for the last
              15 calls to MensaAgent. Gas cost is fixed in MNT regardless of trade size, so a $1k
              treasury and a $1M treasury pay the same on-chain.
            </p>
          </div>

          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-2">Mantle DEX pool depth for mETH and USDY (observed via DexScreener, 2026-05-15)</div>
          <div className="card p-4 mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[var(--fg-dim)]">
                  <th className="py-1.5 pr-3 text-left font-normal">Pool</th>
                  <th className="py-1.5 pr-3 text-left font-normal">DEX</th>
                  <th className="py-1.5 text-right font-normal">Liquidity (USD)</th>
                  <th className="py-1.5 text-right font-normal">24h vol (USD)</th>
                </tr>
              </thead>
              <tbody className="text-[var(--fg-muted)]">
                <tr className="border-t border-[var(--border)]"><td className="py-1.5 pr-3 mono">mETH / WMNT</td><td className="py-1.5 pr-3">Oku</td><td className="py-1.5 mono text-right">$5,438</td><td className="py-1.5 mono text-right">$2,232</td></tr>
                <tr className="border-t border-[var(--border)]"><td className="py-1.5 pr-3 mono">mETH / WMNT</td><td className="py-1.5 pr-3">FusionX</td><td className="py-1.5 mono text-right">$4,019</td><td className="py-1.5 mono text-right">$0.18</td></tr>
                <tr className="border-t border-[var(--border)]"><td className="py-1.5 pr-3 mono">WMNT / cmETH</td><td className="py-1.5 pr-3">Merchant Moe</td><td className="py-1.5 mono text-right">$2,466</td><td className="py-1.5 mono text-right">$366</td></tr>
                <tr className="border-t border-[var(--border)]"><td className="py-1.5 pr-3 mono">mETH / WMNT</td><td className="py-1.5 pr-3">Agni</td><td className="py-1.5 mono text-right">$1,382</td><td className="py-1.5 mono text-right">$442</td></tr>
                <tr className="border-t border-[var(--border)]"><td className="py-1.5 pr-3 mono">WMNT / mETH</td><td className="py-1.5 pr-3">Merchant Moe</td><td className="py-1.5 mono text-right">$880</td><td className="py-1.5 mono text-right">$64</td></tr>
                <tr className="border-t border-[var(--border)]"><td className="py-1.5 pr-3 text-[var(--accent)] mono">mETH total</td><td></td><td className="py-1.5 mono text-right text-[var(--accent)]">$14,185</td><td></td></tr>
                <tr className="border-t border-[var(--border)]"><td className="py-1.5 pr-3 mono">USDY / WMNT</td><td className="py-1.5 pr-3">butter.xyz</td><td className="py-1.5 mono text-right">$165</td><td className="py-1.5 mono text-right">$0.94</td></tr>
                <tr className="border-t border-[var(--border)]"><td className="py-1.5 pr-3 mono">USDY / WMNT</td><td className="py-1.5 pr-3">Agni (×3)</td><td className="py-1.5 mono text-right">$83</td><td className="py-1.5 mono text-right">$6</td></tr>
                <tr className="border-t border-[var(--border)]"><td className="py-1.5 pr-3 mono">USDY / WMNT</td><td className="py-1.5 pr-3">Velocimeter</td><td className="py-1.5 mono text-right">$6</td><td className="py-1.5 mono text-right">$0</td></tr>
                <tr className="border-t border-[var(--border)]"><td className="py-1.5 pr-3 text-[var(--accent)] mono">USDY total</td><td></td><td className="py-1.5 mono text-right text-[var(--accent)]">$254</td><td></td></tr>
              </tbody>
            </table>
            <p className="text-[10px] text-[var(--fg-dim)] mt-2 leading-relaxed">
              Source: DexScreener Mantle, queried 2026-05-15. There is no direct mETH/USDY pair anywhere
              on Mantle. A swap would route through WMNT (two hops) on pools whose combined depth on the
              USDY side is roughly $254. Constant-product slippage at this depth is severe even on small
              notional sizes.
            </p>
          </div>

          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-2">Slippage estimate by trade size (constant-product, on the $254 USDY side)</div>
          <div className="card p-4 mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[var(--fg-dim)]">
                  <th className="py-1.5 pr-3 text-left font-normal">Trade size (USD)</th>
                  <th className="py-1.5 text-right font-normal">% of USDY pool depth</th>
                  <th className="py-1.5 text-right font-normal">Approx slippage</th>
                  <th className="py-1.5 text-right font-normal">Verdict</th>
                </tr>
              </thead>
              <tbody className="text-[var(--fg-muted)]">
                <tr className="border-t border-[var(--border)]"><td className="py-1.5 pr-3 mono">$1</td><td className="py-1.5 mono text-right">0.4%</td><td className="py-1.5 mono text-right">~0.8%</td><td className="py-1.5 text-right text-[var(--accent)]">demo OK</td></tr>
                <tr className="border-t border-[var(--border)]"><td className="py-1.5 pr-3 mono">$10</td><td className="py-1.5 mono text-right">4%</td><td className="py-1.5 mono text-right">~8%</td><td className="py-1.5 text-right text-yellow-400">demo only</td></tr>
                <tr className="border-t border-[var(--border)]"><td className="py-1.5 pr-3 mono">$50</td><td className="py-1.5 mono text-right">20%</td><td className="py-1.5 mono text-right">~40%</td><td className="py-1.5 text-right text-red-400">not viable</td></tr>
                <tr className="border-t border-[var(--border)]"><td className="py-1.5 pr-3 mono">$100</td><td className="py-1.5 mono text-right">39%</td><td className="py-1.5 mono text-right">~64%</td><td className="py-1.5 text-right text-red-400">not viable</td></tr>
                <tr className="border-t border-[var(--border)]"><td className="py-1.5 pr-3 mono">$1,000</td><td className="py-1.5 mono text-right">394%</td><td className="py-1.5 mono text-right">untradeable</td><td className="py-1.5 text-right text-red-400">untradeable</td></tr>
              </tbody>
            </table>
            <p className="text-[10px] text-[var(--fg-dim)] mt-2 leading-relaxed">
              Constant-product slippage approximation: slippage ≈ trade / (pool + trade). Doubles
              roughly with each step. The mETH side is wider (~$14K total) so slippage there is much
              lower for the same notional; USDY is the bottleneck.
            </p>
          </div>

          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-2">Break-even: how many rebalances per year a strategy can absorb</div>
          <div className="card p-4 mb-4">
            <p className="text-xs text-[var(--fg-muted)] leading-relaxed mb-3">
              Assume the yield differential between mETH (around 0.34% to 2.28% APY observed on
              Mantle pools, per DefiLlama 2026-05-15) and USDY (3.55% APY, Ondo native) is roughly
              200 to 300 bps on average. A rebalance captures a fraction of that differential
              proportional to how long the new allocation is held and how much of the treasury
              actually moves.
            </p>
            <p className="text-xs text-[var(--fg-muted)] leading-relaxed mb-3">
              Take a generous case: each rebalance captures 100 bps of annualized alpha. Take a
              realistic cost: at production pool depth ($500K+ on the USDY side), a rebalance
              touching 20% of treasury costs roughly 0.5% × 20% = 0.1% of total treasury. Then:
            </p>
            <div className="bg-[var(--bg-elevated)] p-3 rounded mono text-[11px] text-[var(--fg-muted)] mb-3">
              <div>Annual alpha captured ≥ Annual rebalance cost</div>
              <div>100 bps ≥ N × 0.1% × treasury</div>
              <div>N ≤ 10 rebalances per year</div>
            </div>
            <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
              At today&apos;s Mantle pool depth, the USDY side is too thin to support even a single
              real rebalance above $100 notional. The strategy is therefore gated on pool depth
              growth or aggregator routing (Velora-style) on a chain where USDY has liquidity.
              Until then, Mensa runs in notional rebalancing mode: the AI declares the optimal
              allocation, the contract records it, and the tournament measures the AI&apos;s
              decision quality against price moves without actual swap execution.
            </p>
          </div>

          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-2">Minimum viable treasury, as a function of USDY pool depth</div>
          <div className="card p-4 mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[var(--fg-dim)]">
                  <th className="py-1.5 pr-3 text-left font-normal">USDY pool depth on Mantle</th>
                  <th className="py-1.5 text-right font-normal">Max single trade @ 1% slippage</th>
                  <th className="py-1.5 text-right font-normal">Implied max treasury (at 20% trade per rebalance)</th>
                </tr>
              </thead>
              <tbody className="text-[var(--fg-muted)]">
                <tr className="border-t border-[var(--border)]"><td className="py-1.5 pr-3 mono">$254 (today)</td><td className="py-1.5 mono text-right">~$2.50</td><td className="py-1.5 mono text-right">~$12</td></tr>
                <tr className="border-t border-[var(--border)]"><td className="py-1.5 pr-3 mono">$10K</td><td className="py-1.5 mono text-right">~$100</td><td className="py-1.5 mono text-right">~$500</td></tr>
                <tr className="border-t border-[var(--border)]"><td className="py-1.5 pr-3 mono">$100K</td><td className="py-1.5 mono text-right">~$1,000</td><td className="py-1.5 mono text-right">~$5,000</td></tr>
                <tr className="border-t border-[var(--border)]"><td className="py-1.5 pr-3 mono">$1M</td><td className="py-1.5 mono text-right">~$10,000</td><td className="py-1.5 mono text-right">~$50,000</td></tr>
                <tr className="border-t border-[var(--border)]"><td className="py-1.5 pr-3 mono">$10M</td><td className="py-1.5 mono text-right">~$100,000</td><td className="py-1.5 mono text-right">~$500,000</td></tr>
              </tbody>
            </table>
            <p className="text-[10px] text-[var(--fg-dim)] mt-2 leading-relaxed">
              For an actively rebalancing treasury to make economic sense on Mantle today, USDY
              pool depth would need to grow by roughly 40x (to $10K) for a $500 treasury to be
              viable, and 400x (to $100K) for a $5K treasury. The numbers are sensitive to the
              tolerated slippage cap and to the average trade size as a percentage of treasury,
              but the order of magnitude is clear: Mantle DEX depth for USDY is the dominant
              constraint, not gas, not Claude, not contract design.
            </p>
          </div>

          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-2">What we changed in response</div>
          <div className="card p-4">
            <p className="text-xs text-[var(--fg-muted)] leading-relaxed mb-3">
              The hackathon-bootstrap config used a 50 bps rebalance threshold and a 30 minute
              cooldown to force tournament rounds to open quickly. Once we computed the numbers
              above, we restored the contract defaults:
            </p>
            <ul className="text-xs text-[var(--fg-muted)] leading-relaxed list-disc pl-5 space-y-1">
              <li><code className="text-[var(--fg)] mono">minRebalanceBps</code>: 50 → 200 (2 percentage points minimum allocation delta to act)</li>
              <li><code className="text-[var(--fg)] mono">minTimeBetweenRebalances</code>: 30 min → 6 hours</li>
            </ul>
            <p className="text-xs text-[var(--fg-muted)] leading-relaxed mt-3">
              The Claude system prompt was also updated to require rebalance-cost reasoning before
              proposing REBALANCE, and to apply a 24h stickiness rule against direction reversals.
              See <code className="text-[var(--fg)] mono">lib/agent.ts</code>.
            </p>
          </div>
        </section>

        {/* MVP scope & roadmap */}
        <section id="mvp-scope" className="mb-12 scroll-mt-24">
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
        <section id="run-locally" className="mb-12 scroll-mt-24">
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
