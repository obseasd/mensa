# Mensa

**The AI treasury that proves itself.**

Autonomous AI treasury agent on Mantle. Allocates funds across mETH and USDY, then competes against humans to prove every decision. All reasoning is logged on-chain.

Built for the [Mantle Turing Test Hackathon 2026](https://dorahacks.io/hackathon/mantleturingtesthackathon2026/).

---

## Why Mensa

You can't trust an AI with your money if you can't verify its reasoning.

Mensa solves this with three core ideas:

1. **Every decision is logged on-chain.** Action, confidence, reasoning hash, and parameters all recorded permanently on Mantle.
2. **Every decision is explained.** The AI must justify each allocation in plain English. Stored as event data.
3. **Every decision is challenged.** The Tournament Vault pits AI vs human allocators on identical inputs. Performance is settled on-chain.

This is the literal Turing Test for treasury management — does the AI act as well as a thoughtful human?

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   User wallet (mETH / USDY)                             │
│           │                                             │
│           ▼                                             │
│   ┌────────────────┐    ┌────────────────────┐          │
│   │  MensaAgent    │    │  TournamentVault   │          │
│   │  (treasury)    │◄──►│  (AI vs Human)     │          │
│   └───────┬────────┘    └────────────────────┘          │
│           │                       ▲                     │
│           ▼                       │                     │
│   ┌────────────────┐              │                     │
│   │  DecisionLog   │   Humans vote on allocations       │
│   │  (reasoning)   │   AI logs its decisions            │
│   └────────────────┘                                    │
│           ▲                                             │
│           │ executeAllocation(target%, reasoning)       │
│           │                                             │
│   ┌────────────────────────────────────┐                │
│   │  AI Agent Loop (off-chain)         │                │
│   │  - Reads mETH / USDY APRs          │                │
│   │  - Reads Bybit market signals      │                │
│   │  - Asks Claude Haiku 4.5           │                │
│   │  - Submits target allocation       │                │
│   └────────────────────────────────────┘                │
│                                                         │
│            All on Mantle Mainnet (Chain ID 5000)        │
└─────────────────────────────────────────────────────────┘
```

---

## Tracks (Mantle Turing Test 2026)

Mensa is submitted to **3 of 6 Phase 2 tracks**:

| Track | How Mensa fits |
|-------|----------------|
| **Agentic Wallets & Economy** | Treasury agent integrates Byreal Skills CLI as a callable skill |
| **AI x RWA** | Allocates between mETH (liquid staking) and USDY (Ondo T-bills) |
| **AI Trading & Strategy** | Bybit API signals enrich the agent's decision context |

---

## Tech stack

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 16 + Tailwind v4 + Turbopack |
| Wallet | wagmi v2 + viem (Mantle Mainnet + Sepolia) |
| Smart contracts | Solidity 0.8.24 + OpenZeppelin v5 + Foundry |
| AI | Claude Haiku 4.5 via Anthropic SDK |
| RWA | Mantle mETH (`0xcDA86A...`) + Ondo USDY (`0x5bE265...`) |
| Trading signals | Bybit API |
| Skills | Byreal Skills CLI |
| Deploy | Vercel (frontend), Mantle Mainnet (contracts) |

---

## Smart contracts

Three contracts deployed on Mantle:

| Contract | Purpose | Lines |
|----------|---------|-------|
| `MensaAgent.sol` | Holds user-deposited mETH/USDY. AI operator triggers `executeAllocation()` to rebalance, log a decision, and open a tournament round atomically. Risk caps: max 95% single asset, min 2% rebalance threshold. | ~120 |
| `DecisionLog.sol` | Permanent on-chain record of every agent decision (action, confidence, reasoning hash, params). Mantle's low gas makes full transparency economically viable. | ~80 |
| `TournamentVault.sol` | The Turing Test mechanic. AI vs Human compete on identical inputs. Performance settled on-chain. Outcomes recorded: AI_WINS / HUMAN_WINS / TIE. | ~150 |

**Deployed addresses:** see `lib/chains.ts` after deployment.

**Tests:** 10/10 passing — `cd contracts && forge test`

---

## How to test the agent

```bash
# 1. Clone & install
git clone https://github.com/obseasd/mensa
cd mensa
npm install --legacy-peer-deps

# 2. Run the frontend
npm run dev
# Open http://localhost:3000

# 3. (Optional) Compile + test contracts
cd contracts
forge install
forge test
```

To run with a real Claude API key:

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run dev
```

Without an API key, the agent falls back to a deterministic mock that still demonstrates the full UX.

---

## Live demo

- **Frontend:** *(deploy URL TBD)*
- **GitHub:** https://github.com/obseasd/mensa
- **Mantlescan agent:** *(after deploy)*

---

## What makes Mensa hackathon-winning

1. **Lit eral Turing Test thesis** — the hackathon name is taken seriously, not ignored
2. **Real RWA integration** — mETH + USDY are live Mantle Mainnet contracts, not mocks
3. **Reasoning trail on-chain** — Mantle's low gas makes full decision transparency viable
4. **AI vs Human tournament** — measurable, on-chain settlement of who's actually better
5. **Multi-sponsor stack** — Mantle + Byreal Skills CLI + Bybit API + Anthropic
6. **Clean UI/UX** — Mantle design language (black/white, restrained, institutional)

---

## License

MIT

---

Built by [@obseasd](https://github.com/obseasd) for Mantle Turing Test 2026.
