# Mensa

**The AI treasury that proves itself.**

[![Mantle Mainnet](https://img.shields.io/badge/deployed-Mantle%20Mainnet-A3BAB9?style=flat-square)](https://mantlescan.xyz/address/0xAcA925e51E7C801Af4E4080f041AF0ec112CCe49)
[![Contracts verified](https://img.shields.io/badge/contracts-6%2F6%20verified-A3BAB9?style=flat-square)](https://mantlescan.xyz/address/0xAcA925e51E7C801Af4E4080f041AF0ec112CCe49#code)
[![License: MIT](https://img.shields.io/badge/license-MIT-white?style=flat-square)](LICENSE)
[![Built for Mantle Turing Test](https://img.shields.io/badge/hackathon-Mantle%20Turing%20Test%202026-white?style=flat-square)](https://dorahacks.io/hackathon/mantleturingtesthackathon2026/)

Mensa is an **intelligent RWA portfolio management agent** on Mantle. It allocates user-deposited funds between **mETH** (Mantle liquid-staked ETH) and **USDY** (Ondo tokenized US Treasury bills), with every decision:

- Made by Claude Haiku 4.5 reading live market state + the agent's own track record
- Logged on-chain in plain English via `DecisionLog`
- Settled on-chain by the `TournamentVault`, where humans can challenge the AI on identical inputs and earn bounty if they outperform

> The hackathon is called "Turing Test." Mensa takes it literally: the AI must prove, on-chain, that it allocates better than humans on the same data.

**Live demo:** https://mensa-mu.vercel.app · **Pages:** Agent · Tournament · Backtest · Deposit · Leaderboard · Docs

**Built for:** DAO treasuries · Sophisticated DeFi savers · RWA-backed protocols

---

## Why

You can't trust an AI with your money if you can't verify its reasoning.

Mensa solves this with three primitives:
1. **Every decision is logged on-chain** — action, confidence, reasoning hash. The full reasoning text is emitted as event data.
2. **Every decision is explained** — Claude Haiku 4.5 produces a 1-2 sentence justification in plain English for each rebalance.
3. **Every decision is challenged** — the Tournament Vault pits AI vs human allocators on identical inputs. Performance settles on-chain.

The hackathon is called "Turing Test." Mensa takes the name literally: the AI must prove, statistically, that it allocates better than humans on the same data.

---

## Live state (Mantle Mainnet, all 6/6 contracts verified)

| Component | Address |
|-----------|---------|
| MensaAgent | [`0xAcA925e51E7C801Af4E4080f041AF0ec112CCe49`](https://mantlescan.xyz/address/0xAcA925e51E7C801Af4E4080f041AF0ec112CCe49#code) |
| DecisionLog | [`0xD889B7819eF45cda7b9D30bA677A27E0ef6788Fe`](https://mantlescan.xyz/address/0xD889B7819eF45cda7b9D30bA677A27E0ef6788Fe#code) |
| TournamentVault | [`0x92E6B40da9566d6b7176420D88818500dB77d122`](https://mantlescan.xyz/address/0x92E6B40da9566d6b7176420D88818500dB77d122#code) |
| Reputation | [`0x10A519fd1867120C5379C7f8016A4223826b4E5f`](https://mantlescan.xyz/address/0x10A519fd1867120C5379C7f8016A4223826b4E5f#code) |
| BountyPool | [`0x06460f1cb540951e115A95257D59FEeFf9A55f39`](https://mantlescan.xyz/address/0x06460f1cb540951e115A95257D59FEeFf9A55f39#code) |
| MensaBadges | [`0x22867d39E3e9891A4F76754AF9BD1B131661144E`](https://mantlescan.xyz/address/0x22867d39E3e9891A4F76754AF9BD1B131661144E#code) |
| mETH (Mantle native) | [`0xcDA86A272531e8640cD7F1a92c01839911B90bb0`](https://mantlescan.xyz/address/0xcDA86A272531e8640cD7F1a92c01839911B90bb0) |
| USDY (Ondo) | [`0x5bE26527e817998A7206475496fDE1E68957c5A6`](https://mantlescan.xyz/address/0x5bE26527e817998A7206475496fDE1E68957c5A6) |

AI operator + owner (clean wallet): [`0x3a0Dd90212838f32a953Acd4B32596b62859324A`](https://mantlescan.xyz/address/0x3a0Dd90212838f32a953Acd4B32596b62859324A)

GitHub Actions cron runs the agent loop every 30 min: see [`.github/workflows/agent.yml`](.github/workflows/agent.yml).

---

## Architecture

```
                 User wallet (mETH / USDY)
                         |
                         v
    +----------------+      +-------------------+
    |  MensaAgent    |<---->| TournamentVault   |
    |  (treasury)    |      | (AI vs Human)     |
    +-------+--------+      +---------+---------+
            |                         |
            v                         v
    +----------------+      +-------------------+      +---------------+
    |  DecisionLog   |      |   Reputation      |<-----|  MensaBadges  |
    |  (reasoning)   |      |   (sqrt-weighted) |      |  (SBT awards) |
    +----------------+      +---------+---------+      +---------------+
                                      |
                                      v
                            +-------------------+
                            |   BountyPool      |
                            |   (15% perf fee)  |
                            +-------------------+
                                      ^
                                      |
                                +------------+
                                | AI Operator|
                                | (off-chain)|
                                |  Claude AI |
                                +------------+

         All on Mantle. Sepolia (5003) for testing, Mainnet (5000) for prod.
```

---

## Tracks (Mantle Turing Test 2026 — Phase 2 AI Awakening)

Submitted to multiple tracks (the rules allow multi-track submission, but only one prize wins):

| Track | Mensa fit |
|-------|-----------|
| **AI x RWA** (primary) | Mantle's moat track. Mensa is exactly an "intelligent RWA portfolio management agent" — allocates between mETH (Mantle liquid staking) and USDY (Ondo tokenized T-bills), both live Mantle RWAs. Path B: end-user-facing AI × RWA product. |
| **Grand Champion** | Cross-track award. Mensa scores on Technical Depth (AI × on-chain integration, 6 verified contracts), Innovation (Turing tournament + verifiable alpha), Mantle Ecosystem Contribution (RWA-native), and Product Completeness (live deployed app). |
| **AI Alpha & Data** | Path B: trading strategy with verifiable on-chain Alpha. Every decision and outcome is settled on-chain; cumulative alpha vs 50/50 baseline is computed from contract reads. |
| **Best UI/UX Award** | Clean dark Mantle-aligned design, AI interaction shown via the live decision card with reasoning, fully responsive. |
| **20 Project Deployment Award** | First-come, first-served. Mensa hits all bars: deployed to mainnet, AI-powered function callable on-chain, public frontend, open-source repo. |

---

## Economics

### How rewards work for humans

When a tournament round settles, the contract:
1. Computes each voter's return based on their proposed allocation × actual mETH/USDY price moves
2. Identifies winners (humans whose return > AI's return)
3. Updates reputation: +up to 50 per win, -up to 25 per loss (proportional to outperformance)
4. Distributes 1% of the winner pool to winners, weighted by `outperformance × sqrt(reputation)`

### Performance fee (not churn fee)

Mensa charges **15% of yield generated** (industry standard, like Yearn/Aave), not a per-rebalance fee. With $100k TVL at 4.5% APR, that's $675/year in fees, leaving stakers with 3.825% APR net.

The fee splits:
- 50% → BountyPool winners (humans who beat the AI)
- 30% → Reputation pool (top voters monthly)
- 20% → Operations

### Anti-Sybil protection

| Layer | Mechanism |
|-------|-----------|
| Stake gate | Mainnet requires user to have ≥10 ether equivalent in MensaAgent to vote |
| Reputation weighting | Vote weight = sqrt(reputation), so whales with high rep don't dominate, bots stay at weight 1 |
| Cost of entry | Gas required to deposit + vote (Mantle is cheap but non-zero) |
| Performance-weighted rewards | Random voters with low outperformance receive negligible bounty share |

---

## Tech stack

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 16 + Tailwind v4 + Turbopack |
| Wallet | wagmi v2 + viem (Mantle Mainnet + Sepolia) |
| Smart contracts | Solidity 0.8.24 + OpenZeppelin v5 + Foundry |
| AI | Claude Haiku 4.5 via Anthropic SDK |
| RWA | Mantle mETH + Ondo USDY |
| Market data | Coingecko (ETH/USD), DefiLlama (mETH and USDY APRs) |
| Automation | GitHub Actions cron — agent loop + auto-settlement every 30 min |
| Deploy | Vercel (frontend), Mantle Mainnet (contracts) |

---

## Quick start

```bash
# Frontend
git clone https://github.com/obseasd/mensa
cd mensa
npm install --legacy-peer-deps
npm run dev
# http://localhost:3000

# Smart contracts
cd contracts
forge install
forge test
# 10/10 passing

# Deploy to Mantle Sepolia
cd contracts
PRIVATE_KEY=0x... forge script script/Deploy.s.sol:Deploy \
  --rpc-url mantle_sepolia --broadcast --legacy

# Run autonomous agent loop
INTERVAL_MIN=30 PRIVATE_KEY=0x... node scripts/agent-loop.mjs

# Or single execution
PRIVATE_KEY=0x... node scripts/agent-loop.mjs --once
```

---

## User flow

1. Visit https://mensa-mu.vercel.app
2. Connect wallet (MetaMask or Rabby on Mantle Sepolia, chain 5003)
3. Get testnet MNT from https://faucet.sepolia.mantle.xyz
4. Go to `/deposit`, mint 1000 mETH/USDY (mock tokens), approve, deposit
5. Go to `/tournament`, see pending rounds, vote your allocation
6. Wait for settlement (instant on testnet, 24h on mainnet)
7. Check `/leaderboard` for ranking, `/profile/<your-address>` for stats and bounty claims

---

## What makes Mensa hackathon-winning

1. **Literal Turing Test thesis** — the hackathon name is taken seriously, not ignored
2. **Real RWA integration** — mETH + USDY are live Mantle Mainnet contracts
3. **Reasoning trail on-chain** — Mantle's low gas makes full decision transparency viable
4. **AI vs Human tournament** — measurable, on-chain settlement of who's actually better
5. **Verifiable alpha** — every decision settles on-chain, alpha vs 50/50 baseline is computed from contract reads, no claim is unprovable
6. **Clean Mantle UI/UX** — black/white restrained design language
7. **Production-ready economics** — performance fee model, not churn fee, anti-Sybil layers

---

## License

MIT

---

Built by [@obseasd](https://github.com/obseasd) for Mantle Turing Test 2026.
