# Mensa

**The AI treasury that proves itself.**

An autonomous AI treasury agent on Mantle. Allocates funds across mETH and USDY based on real on-chain yields, then competes against humans on identical inputs to prove every decision. All reasoning is logged on-chain.

Built for the [Mantle Turing Test Hackathon 2026](https://dorahacks.io/hackathon/mantleturingtesthackathon2026/).

**Live demo:** https://mensa-mu.vercel.app

---

## Why

You can't trust an AI with your money if you can't verify its reasoning.

Mensa solves this with three primitives:
1. **Every decision is logged on-chain** — action, confidence, reasoning hash. The full reasoning text is emitted as event data.
2. **Every decision is explained** — Claude Haiku 4.5 produces a 1-2 sentence justification in plain English for each rebalance.
3. **Every decision is challenged** — the Tournament Vault pits AI vs human allocators on identical inputs. Performance settles on-chain.

The hackathon is called "Turing Test." Mensa takes the name literally: the AI must prove, statistically, that it allocates better than humans on the same data.

---

## Live state (Mantle Sepolia)

| Component | Address |
|-----------|---------|
| MensaAgent | [`0x0B1018150C18dF5EB453Baa25a169884069AA81F`](https://explorer.sepolia.mantle.xyz/address/0x0B1018150C18dF5EB453Baa25a169884069AA81F) |
| DecisionLog | [`0x32f6911E8bb653d9B4210748972F8EbF3651ef85`](https://explorer.sepolia.mantle.xyz/address/0x32f6911E8bb653d9B4210748972F8EbF3651ef85) |
| TournamentVault | [`0xE0C0088acaD843e07Ceb77338fF1eC49979Be5f2`](https://explorer.sepolia.mantle.xyz/address/0xE0C0088acaD843e07Ceb77338fF1eC49979Be5f2) |
| Reputation | [`0xb431a54b5801c5278D64ED38e1a7b31585560992`](https://explorer.sepolia.mantle.xyz/address/0xb431a54b5801c5278D64ED38e1a7b31585560992) |
| BountyPool | [`0x597ef1750d0d83d8764dB5B62be0F1f1F13f9313`](https://explorer.sepolia.mantle.xyz/address/0x597ef1750d0d83d8764dB5B62be0F1f1F13f9313) |
| MensaBadges | [`0x94831c84f00c1F6D9331318fD94e0C77243cb5EE`](https://explorer.sepolia.mantle.xyz/address/0x94831c84f00c1F6D9331318fD94e0C77243cb5EE) |
| Mock mETH | [`0x66174C1BFe93a8c3FD5820148a664df52Ca4d170`](https://explorer.sepolia.mantle.xyz/address/0x66174C1BFe93a8c3FD5820148a664df52Ca4d170) |
| Mock USDY | [`0xe73A1eeC53BE30c7AA1e57953216aebBFC0bb120`](https://explorer.sepolia.mantle.xyz/address/0xe73A1eeC53BE30c7AA1e57953216aebBFC0bb120) |

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

## Tracks (Mantle Turing Test 2026)

Submitted to **3 of 6 Phase 2 tracks**:

| Track | Mensa fit |
|-------|-----------|
| **Agentic Wallets & Economy** (primary) | The AI agent IS a wallet that holds + manages user-deposited funds, with reasoning logged on-chain |
| **AI x RWA** | Allocates between mETH (Mantle liquid staking) and USDY (Ondo tokenized T-bills), both real Mantle RWAs |
| **AI Trading & Strategy** | Off-chain agent loop integrates Bybit API for market signals, executes via Solidity templates |

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
| Trading signals | Bybit API |
| Skills | Byreal Skills CLI (track requirement) |
| Deploy | Vercel (frontend), Mantle Sepolia (contracts) |

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
5. **Multi-sponsor stack** — Mantle + Byreal + Bybit + Anthropic + Ondo
6. **Clean Mantle UI/UX** — black/white restrained design language
7. **Production-ready economics** — performance fee model, not churn fee, anti-Sybil layers

---

## License

MIT

---

Built by [@obseasd](https://github.com/obseasd) for Mantle Turing Test 2026.
