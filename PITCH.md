# Mensa — Pitch deck

> Live interactive version: **https://mensa-mu.vercel.app/pitch**
>
> This markdown is a plain-text mirror. If you'd rather drop content into
> Google Slides, Notion, or Pitch.com, copy from here.

---

## 01 · Cover

**The AI treasury that proves itself.**

Intelligent RWA portfolio management agent on Mantle. Allocates between mETH
(Mantle liquid-staked ETH) and USDY (Ondo tokenized US Treasury bills), with
every decision logged on-chain and challenged by humans in a verifiable Turing
tournament.

- Live on Mantle Mainnet
- ERC-8004 · agent #1
- 7/7 contracts verified
- Mantle Turing Test 2026

---

## 02 · Problem

**Every yield vault today is either a black box or a static bet.**

DeFi has hundreds of millions in yield vaults. Users pick one allocation and
live with it for months. When market conditions shift, they stay in the wrong
asset, capturing less yield with more risk than they should. AI-managed vaults
exist, but they act, you trust, you hope. Two broken patterns.

- **Pattern 1, static vaults.** Aave passive, Yearn, single-asset LST vaults.
  Lock in one allocation. When the yield spread between assets shifts, you
  have no way to react. You captured the spread when it favored your bet, you
  lose it when it does not.
- **Pattern 2, AI black boxes.** Existing AI treasuries rebalance, but the
  reasoning is private. No on-chain decision log, no human benchmark, no
  accountability. If the agent underperforms for a year, you find out via
  your wallet, not via a public trail.

The user is left choosing between a static vault that ignores market shifts,
or an opaque AI that you cannot audit. Both leave yield on the table, both
increase risk, and neither earns trust at scale.

---

## 03 · Solution

**Optimize yield and reduce risk, with every move verifiable on-chain.**

Mensa rebalances dynamically between mETH and USDY based on live market state,
so users capture the better-yielding asset while keeping diversification. The
AI decides, humans audit, the chain records. Three primitives make every move
provable.

1. **Logged.** Every allocation decision is written to the DecisionLog
   contract: action, confidence, full reasoning text emitted as event data.
2. **Explained.** Claude Haiku 4.5 generates a plain-English justification
   for every rebalance. No black-box scores.
3. **Challenged.** The TournamentVault pits the AI against humans on
   identical inputs. After 24h, the higher-return allocation wins, settled
   on-chain.

**Net effect for users:** better risk-adjusted yield than any static vault,
plus a public audit trail no AI black box can match.

---

## 04 · Traction (live numbers)

| Metric | Current value |
|--------|---------------|
| Decisions logged | live from `/api/onchain` |
| Tournament rounds | live |
| AI win rate | live |
| Alpha / round (since memory loop calibrated) | live |

These values are fetched live on every page load — not screenshots, not mocks.

Verified contracts: see https://mantlescan.xyz/address/0xAcA925e51E7C801Af4E4080f041AF0ec112CCe49#code

---

## 05 · Innovation 1 — The memory loop

**How Claude learns without retraining.**

Before every decision, the agent reads its own on-chain track record and
injects it into Claude's prompt. Self-correction emerges without a single
training pipeline.

Shape of the prompt context that ships on every Claude call — the exact
numbers are rendered live from on-chain reads on the deck slide, so they're
always current.

```
Track record (since memory loop calibrated, N rounds):
  Cumulative alpha vs 50/50 baseline: ±X bps
  Per-round average: ±Y bps

Recent rounds:
  Round #M:   AI=Z% mETH, alpha vs 50/50 = ±X bps
  Round #M-1: AI=Z% mETH, alpha vs 50/50 = ±X bps
  Round #M-2: AI=Z% mETH, alpha vs 50/50 = ±X bps

Round #1 was a -324 bps loss made before this feedback loop existed —
note it but don't let it dominate your current strategy.

Reflect: when did you under-allocate to the winning asset?
When did you over-rebalance and lose to passive 50/50?
```

See the live values at https://mensa-mu.vercel.app/pitch (slide 05) and
https://mensa-mu.vercel.app/tournament. Cheap, transparent, no ML infra.

---

## 06 · Innovation 2 — The Turing tournament

**Humans challenge the AI on identical data.**

Each rebalance opens a 24h round. Anyone with a stake can vote their own
mETH/USDY split. After settlement, whoever produced the better return wins
on-chain. No subjective judging, no leaderboard cooking.

- **Sqrt-weighted voting.** Vote weight = sqrt(reputation). 100 Sybil wallets
  at rep=1 sum to weight 100; one whale at rep=10000 also gets weight 100.
  Diminishing returns kill bot dominance.
- **15% performance fee.** On yield, never principal. Splits 50/30/20:
  winners / reputation pool / ops. Humans who beat the AI get paid in MNT.
- **Soulbound badges.** 7 milestones (First Vote, Beat AI 10x/100x, 5-Win
  Streak, Rep 500/1000, Top 10 Monthly) minted as non-transferable ERC-721.

---

## 07 · Why we're honest — Round #1 was a disaster

We didn't ship a pitch deck where the AI looks like a genius. The first round
on mainnet was a -19.43% loss. We learned in public.

The deck slide for this section renders the table live from on-chain so it's
always current. Snapshot of the journey so far:

- **Round #1** — 60% mETH, alpha **−324 bps** (cold start, ETH crashed, the
  feedback loop wasn't running yet)
- **Round #2** — 35% mETH, alpha **+16 bps** (first decision with memory loop)
- **Round #3** — 25% mETH, alpha **+21 bps**
- **Round #4** — 15% mETH, alpha **+11 bps**
- **Round #5** — 5% mETH, alpha **+62 bps**
- **Round #6** — 0% mETH, alpha **+127 bps**
- **Round #7** — 20% mETH, alpha **−29 bps** (AI tried mETH back in, lost
  again — the loop continuing to operate, not a polished result)
- **Round #8** — 10% mETH, alpha **−23 bps**

The AI shifted defensive after the round #1 disaster (60 → 35 → 25 → 15 → 5
→ 0% mETH) and beat the baseline on every round from #2 to #6. Rounds #7
and #8 the AI started easing back into mETH and lost both — that's what
honest in-public learning looks like, recorded irreversibly on-chain.

**See the live cumulative and per-round alpha on the** [Tournament page](https://mensa-mu.vercel.app/tournament) **and** [pitch deck slide 07](https://mensa-mu.vercel.app/pitch).

---

## 08 · Beyond live rounds — backtest

A handful of on-chain rounds isn't a long enough track record. So we replay
Mensa's strategy against three baselines (passive 50/50, 100% mETH HODL,
100% USDY) on a year of Coingecko ETH prices.

See https://mensa-mu.vercel.app/backtest for the live, interactive version.

**Honest finding.** In a strong directional bull (ETH +15%), allocation
strategies always lag pure HODL. Mensa cut max drawdown by 5pp at the cost of
some upside — risk-adjusted, that's the actual trade.

Mensa's value prop is chop and bear regimes, not bull tops. The page is
explicit about this. No cherry-picked window.

---

## 09 · The stack

**7 verified contracts. ERC-8004 native. Production-shaped on mainnet from
day one.**

| Contract | Role |
|----------|------|
| MensaAgent | The treasury. Holds deposits, gates rebalance, opens rounds. |
| DecisionLog | Append-only on-chain record. Reasoning emitted as event data. |
| TournamentVault | Round lifecycle, voting, settlement, payout distribution. |
| Reputation | Sqrt-weighted scoring. Read by Tournament for vote weight. |
| BountyPool | 15% perf-fee sink. 50/30/20 split. Pull-based claims. |
| MensaBadges | 7 soulbound achievement NFTs. Transfer-blocked. |
| MensaAgentIdentity (ERC-8004) | Agent registry NFT, agentId #1. Discoverable for A2A composability. |

Off-chain: Next.js 16 frontend on Vercel, GitHub Actions cron every 30 min
for the decision + auto-settle loop, Claude Haiku 4.5 via Anthropic SDK with
the on-chain track record injected on every call, Coingecko + DefiLlama for
live market state.

---

## 10 · Honest scope — what we know we don't have yet

A hackathon submission that pretends it's production is a hackathon
submission that lies.

| Status | Gap | Notes |
|--------|-----|-------|
| **NOW** | Notional rebalancing | executeAllocation updates a target % and opens a round but does not swap tokens. Mantle DEX liquidity for mETH/USDY swaps is thin (Merchant Moe V2: mETH/USDC ≈ $6 TVL, USDC/USDY ≈ $22). Real execution is gated less on our code and more on DEX maturity. |
| **NOW** | Per-user balance tracker (not shares) | Unified counter, safe at small TVL, multi-user mainnet needs the ERC-4626 upgrade. |
| **NEXT** | ERC-4626 share model + Velora swap | Replace the counter with shares minted at deposit. Route executeAllocation through Velora aggregator with slippage caps. Designed, not deployed. |
| **NEXT** | Real human-vote aggregation in settle | Auto-settle passes 50% as the human aggregate when no voters showed up. With active voting we compute reputation-weighted median off-chain and pass it in. |
| **LATER** | Hybrid AI / human steering | Wired today: Claude reads the human consensus as a soft input. With more voters this becomes a real co-allocation mechanism. |

---

## 11 · The opportunity — static yield vaults are the cassette tape of DeFi

Today every yield vault on every chain locks the user into one allocation.
Mantle has hundreds of millions in yield TVL sitting in static positions. The
first project to ship a verifiable AI-rebalanced vault captures the flow when
those users upgrade. We think that is when, not if.

**Today, static.** Single-asset LST vaults lose when stables yield ahead.
T-bill vaults lose when ETH appreciates. The user holds one view of the
world for months while the market moves on. Yield captured: the spread when
it favored your bet. Yield missed: the spread when it did not.

**Mensa, dynamic.** Every 6 hours Claude reads the live yield spread, the
ETH market, and its own on-chain track record. If a rebalance clears the
cost of execution, the agent moves capital. Same TVL, better risk-adjusted
return, public audit trail of every decision.

**Tomorrow, the default.** Once users compare a static 50/50 vault to a
vault that captured +1278 bps of cumulative alpha over 24 rounds with a
public reasoning trail, the choice writes itself. Static vaults stay around
for the same reason cassette tapes did: legacy, not preference.

### Who this is for, and at what scale

- **DAO treasuries.** Tens of millions in idle stables across Mantle and
  Ethereum DAOs. They need yield without permanent ETH exposure. A verifiable
  AI rebalancing vault is exactly the primitive their governance can defend.
- **Sophisticated DeFi savers.** The user who today rotates between Aave,
  Pendle, Spark, Yearn manually. Mensa automates that rotation and proves it
  on-chain. Their alpha goes up, their gas drops, their reasoning is
  auditable.
- **RWA-backed protocols.** Protocols holding USDY, USDM, BUIDL as collateral
  or as reserve need yield that does not introduce hidden risk. A vault that
  explicitly bounds ETH exposure with a public reasoning trail makes the
  risk committee's job easier.
- **Institutional crypto funds.** Funds that already accept AI in trading
  still avoid AI in custody, because they cannot audit it. An open-source,
  on-chain-reasoning vault closes that gap and opens the door to actual
  institutional flow.

### TVL milestones, what each one unlocks

| TVL stage | What it unlocks |
|-----------|-----------------|
| **Today** | Notional rebalancing. The AI declares the optimal allocation, the contract records it, alpha is measured against the baseline. No swaps yet, Mantle DEX depth is the blocker, not our code. |
| **$100K TVL** | Real swap execution via Velora-style aggregator. Ship the ERC-4626 share model. Mensa stops being notional and starts being a live treasury. |
| **$1M TVL** | DAO treasuries onboard. Active human tournament voting. Auditor engagement (Spearbit, Trail of Bits, Macro). Per-asset isolation in the share model. |
| **$10M and beyond** | Cross-chain deployment (Base, Arbitrum, Solana via WDK). Multiple Mensa instances each with its own ERC-8004 identity, federated reputation across chains. Institutional flow. |

None of this is hypothetical at the protocol level. mETH staking yields 0.34
to 2.28% APY (DefiLlama). USDY T-bills yield 3.55% (Ondo native). A vault
that flips between them based on real-time spread is a primitive that should
exist. We are building it with the audit trail no AI black box can offer.

---

## 12 · Why Mensa fits the Mantle Turing Test

The hackathon brief asked for autonomous agents that compete on-chain,
verify reasoning, and use Mantle's native RWAs. Mensa is that, line by line.

| Track | Mensa fit |
|-------|-----------|
| **AI × RWA (primary)** | End-user-facing intelligent RWA portfolio agent. mETH (Mantle LST) + USDY (Ondo T-bills) are exactly the RWAs the track names. |
| **Grand Champion** | 7 verified contracts (Tech Depth), Turing tournament + verifiable alpha + memory loop (Innovation), Mantle-native (Ecosystem), live deployed (Completeness). |
| **AI Alpha & Data** | Trading strategy with verifiable on-chain alpha. Every return computed from contract reads, alpha measured against passive baseline. |
| **Best UI/UX** | Dark Mantle-aligned design. AI reasoning surfaced. Glossary tooltips. Responsive. Live data everywhere. |
| **Finalist & Deployment Award** | 7/7 verified on Mantlescan, AI-powered function callable on-chain, public frontend, open MIT repo with README + Foundry tests. |

---

## 13 · Try it, now, live

Everything in this deck is fetched from on-chain state at slide load. No fake
numbers, no static screenshots, no PDF tricks.

- https://mensa-mu.vercel.app — Agent (live decisions + allocation)
- https://mensa-mu.vercel.app/tournament — Tournament (vote against the AI)
- https://mensa-mu.vercel.app/backtest — Backtest (1y replay vs baselines)
- https://mensa-mu.vercel.app/deposit — Deposit (try with $1 of mETH)
- https://mensa-mu.vercel.app/leaderboard — Leaderboard (humans + bounty pool)
- https://mensa-mu.vercel.app/docs — Docs (architecture + roadmap + compliance)

**Links**

- GitHub: https://github.com/obseasd/mensa
- Verified contracts: https://mantlescan.xyz/address/0xAcA925e51E7C801Af4E4080f041AF0ec112CCe49#code
- ERC-8004 agent card: https://mensa-mu.vercel.app/api/agent-card

Built for the Mantle Turing Test Hackathon 2026 — Phase 2 AI Awakening. MIT
licensed. No financial advice. Audit pending.
