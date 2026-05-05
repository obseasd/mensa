// Performance simulation engine.
// Given an allocation (mETH%, USDY%) and a time period, compute the realistic
// return based on real Mantle DeFi APYs from DefiLlama.
//
// This is what the contract uses to score AI vs humans during settlement.
// In production this would also query a price oracle for actual settled prices.

import { CuratedYield, getMantleYields } from './yields'

export interface SimulationInput {
  methAllocPct: number  // 0-100
  durationDays: number  // typically 1 (mainnet round)
}

export interface SimulationOutput {
  methAllocPct: number
  usdyAllocPct: number
  durationDays: number
  methAPY: number          // sourced from DefiLlama
  usdyAPY: number
  methReturnPct: number    // for the period (not annualized)
  usdyReturnPct: number
  totalReturnPct: number
  expectedReturnBps: number  // basis points, what gets recorded on-chain
}

const DEFAULT_METH_APY = 3.9  // fallback if DefiLlama is down
const DEFAULT_USDY_APY = 3.55

/// Get current APYs for mETH-equivalent and USDY-equivalent assets
export async function getCurrentBaselineAPYs(): Promise<{ methAPY: number; usdyAPY: number; pools: CuratedYield[] }> {
  const pools = await getMantleYields()

  // mETH baseline = use Lendle mETH supply APY (best on-chain proxy of mETH yield in DeFi context)
  // Or fallback to default if not available
  const methPool = pools.find(p => p.symbol === 'METH' && p.project === 'lendle-pooled-markets')
  const usdyPool = pools.find(p => p.symbol === 'USDY')

  return {
    methAPY: methPool?.apy ?? DEFAULT_METH_APY,
    usdyAPY: usdyPool?.apy ?? DEFAULT_USDY_APY,
    pools,
  }
}

/// Run a simulation: project the return of a given allocation over N days
export async function simulateAllocation(input: SimulationInput): Promise<SimulationOutput> {
  const { methAPY, usdyAPY } = await getCurrentBaselineAPYs()
  const dayFraction = input.durationDays / 365

  // Period return = APY * (days / 365)  (approximating linear, no compounding)
  const methReturnPct = methAPY * dayFraction
  const usdyReturnPct = usdyAPY * dayFraction

  const usdyAllocPct = 100 - input.methAllocPct
  const totalReturnPct =
    (input.methAllocPct * methReturnPct + usdyAllocPct * usdyReturnPct) / 100

  return {
    methAllocPct: input.methAllocPct,
    usdyAllocPct,
    durationDays: input.durationDays,
    methAPY,
    usdyAPY,
    methReturnPct,
    usdyReturnPct,
    totalReturnPct,
    expectedReturnBps: Math.round(totalReturnPct * 100),
  }
}

/// Simulate AI vs Human head-to-head with current market data
export async function simulateMatchup(aiAllocPct: number, humanAllocPct: number, durationDays = 1) {
  const ai = await simulateAllocation({ methAllocPct: aiAllocPct, durationDays })
  const human = await simulateAllocation({ methAllocPct: humanAllocPct, durationDays })

  const aiOutperformBps = ai.expectedReturnBps - human.expectedReturnBps
  let winner: 'AI' | 'Human' | 'Tie' = 'Tie'
  if (aiOutperformBps > 0) winner = 'AI'
  else if (aiOutperformBps < 0) winner = 'Human'

  return {
    ai,
    human,
    aiOutperformBps,
    winner,
  }
}
