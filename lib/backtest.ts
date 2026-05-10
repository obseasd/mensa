// Backtest engine — simulates Mensa allocation vs baselines on real historical
// ETH price data from Coingecko. Uses a deterministic heuristic that approximates
// Claude's live decision-making (momentum + spread + smoothing) so we don't burn
// API tokens calling Claude N times.

const COINGECKO = 'https://api.coingecko.com/api/v3/coins/ethereum/market_chart'

// Yield assumptions held constant over the backtest window. Real APYs drift,
// but for a 90-day backtest the stationary assumption is fine and the price
// action dominates the alpha signal anyway.
const METH_APY = 0.04   // 4% annual mETH/ETH appreciation
const USDY_APY = 0.045  // 4.5% annual USDY appreciation
const METH_ETH_RATE_BASE = 1.04 // mETH/ETH rate at start (compounds via METH_APY)

export interface BacktestPoint {
  ts: number          // epoch ms (start of day UTC)
  ethPrice: number    // $/ETH
  methPrice: number   // $/mETH
  usdyPrice: number   // $/USDY
  // Allocation chosen by each strategy AT THE END of this day's decision
  mensaAlloc: number  // 0-100 % mETH
  // Cumulative return since day 0, in basis points
  mensaCumBps: number
  hold5050CumBps: number
  allMethCumBps: number
  allUsdyCumBps: number
}

export interface BacktestResult {
  days: number
  points: BacktestPoint[]
  summary: {
    mensa: StrategyStats
    hold5050: StrategyStats
    allMeth: StrategyStats
    allUsdy: StrategyStats
    alphaVsBaseline: number       // mensa - 5050, in bps
    annualizedAlphaPct: number    // alphaBps / days × 365 / 100
    winRateVs5050: number         // % of days where mensa daily return > baseline
  }
}

export interface StrategyStats {
  finalReturnBps: number
  maxDrawdownBps: number
  volatilityBps: number  // stddev of daily returns × sqrt(365)
  sharpeLike: number     // annualizedReturn / annualizedVol (rough)
}

interface RawPair {
  ts: number
  ethPrice: number
}

async function fetchEthHistory(days = 90): Promise<RawPair[]> {
  const url = `${COINGECKO}?vs_currency=usd&days=${days}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`coingecko ${res.status}`)
  const data = await res.json()
  const prices: [number, number][] = data.prices || []
  // Resample to one point per day (00:00 UTC). Coingecko gives ~hourly for 90d.
  const byDay = new Map<string, RawPair>()
  for (const [ts, price] of prices) {
    const d = new Date(ts)
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
    // keep the earliest entry of each day
    if (!byDay.has(key)) {
      const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
      byDay.set(key, { ts: dayStart, ethPrice: price })
    }
  }
  return Array.from(byDay.values()).sort((a, b) => a.ts - b.ts)
}

// Mensa's deterministic backtest decision rule. Mimics what Claude does live:
// look at recent ETH momentum + the structural mETH-vs-USDY yield spread,
// pick a target allocation in [10, 90], with a minimum 10pp move threshold to
// avoid churn.
function mensaDecideAlloc(history: RawPair[], i: number, currentAlloc: number): number {
  // First few days: hold neutral
  if (i < 5) return 50

  const today = history[i].ethPrice
  const wkAgo = history[Math.max(0, i - 7)].ethPrice
  const monthAgo = history[Math.max(0, i - 30)].ethPrice

  const wkMomentum = (today - wkAgo) / wkAgo  // 7-day return
  const monthMomentum = (today - monthAgo) / monthAgo  // 30-day return

  // Yield spread: mETH apy < USDY apy by 50bps in our assumption (4 vs 4.5).
  // Spread is constant over backtest, so the dial is mostly momentum-driven.
  const yieldSpread = METH_APY - USDY_APY

  // Base allocation 50/50, then tilt based on momentum.
  // Strong recent uptrend -> overweight mETH. Strong downtrend -> overweight USDY.
  // Yield spread negative (USDY pays more) so we naturally lean a bit to USDY.
  let target = 50
  target += yieldSpread * 200  // -50 bps spread = -10 from base
  target += wkMomentum * 200   // +5% week = +10 to mETH
  target += monthMomentum * 100

  // Clamp to risk caps (no >90% in a single asset, never <10%)
  target = Math.max(10, Math.min(90, Math.round(target)))

  // Don't rebalance if change < 10pp (mimics live cooldown + minRebalanceBps)
  if (Math.abs(target - currentAlloc) < 10) return currentAlloc
  return target
}

function ret(price0: number, price1: number): number {
  return (price1 / price0) - 1
}

export async function runBacktest(days = 90): Promise<BacktestResult> {
  const raw = await fetchEthHistory(days)
  if (raw.length < 7) throw new Error('not enough history')

  const points: BacktestPoint[] = []
  let mensaAlloc = 50
  let mensaPrincipal = 1.0   // $1 normalized
  let hold5050 = 1.0
  let allMeth = 1.0
  let allUsdy = 1.0
  const mensaDailyReturns: number[] = []
  const baselineDailyReturns: number[] = []

  for (let i = 0; i < raw.length; i++) {
    const day = raw[i]
    const dayIdx = i  // days since start
    const dailyMethYield = METH_APY / 365
    const dailyUsdyYield = USDY_APY / 365

    // Compute today's mETH and USDY prices.
    // mETH = ETH × rate, where rate compounds at METH_APY.
    const methToEthRate = METH_ETH_RATE_BASE * Math.pow(1 + dailyMethYield, dayIdx)
    const methPrice = day.ethPrice * methToEthRate
    // USDY starts at $1.0 and accrues yield daily.
    const usdyPrice = 1.0 * Math.pow(1 + dailyUsdyYield, dayIdx)

    // Step the strategies forward using yesterday's allocation against today's
    // price moves (no lookahead). On day 0, no return — just initialize.
    if (i > 0) {
      const prev = raw[i - 1]
      const prevMethRate = METH_ETH_RATE_BASE * Math.pow(1 + dailyMethYield, dayIdx - 1)
      const prevMethPrice = prev.ethPrice * prevMethRate
      const prevUsdyPrice = 1.0 * Math.pow(1 + dailyUsdyYield, dayIdx - 1)

      const methDayReturn = ret(prevMethPrice, methPrice)
      const usdyDayReturn = ret(prevUsdyPrice, usdyPrice)

      const mensaR = (mensaAlloc / 100) * methDayReturn + ((100 - mensaAlloc) / 100) * usdyDayReturn
      const baselineR = 0.5 * methDayReturn + 0.5 * usdyDayReturn

      mensaPrincipal *= 1 + mensaR
      hold5050 *= 1 + baselineR
      allMeth *= 1 + methDayReturn
      allUsdy *= 1 + usdyDayReturn

      mensaDailyReturns.push(mensaR)
      baselineDailyReturns.push(baselineR)
    }

    // Decide tomorrow's allocation based on data through TODAY (no lookahead)
    mensaAlloc = mensaDecideAlloc(raw, i, mensaAlloc)

    points.push({
      ts: day.ts,
      ethPrice: day.ethPrice,
      methPrice,
      usdyPrice,
      mensaAlloc,
      mensaCumBps: Math.round((mensaPrincipal - 1) * 10000),
      hold5050CumBps: Math.round((hold5050 - 1) * 10000),
      allMethCumBps: Math.round((allMeth - 1) * 10000),
      allUsdyCumBps: Math.round((allUsdy - 1) * 10000),
    })
  }

  const last = points[points.length - 1]
  const alphaVsBaseline = last.mensaCumBps - last.hold5050CumBps
  const annualizedAlphaPct = (alphaVsBaseline / points.length) * 365 / 100

  const winDays = mensaDailyReturns.filter((r, i) => r > baselineDailyReturns[i]).length
  const winRateVs5050 = mensaDailyReturns.length > 0
    ? Math.round((winDays / mensaDailyReturns.length) * 100)
    : 0

  return {
    days: points.length,
    points,
    summary: {
      mensa: stats(points, 'mensaCumBps'),
      hold5050: stats(points, 'hold5050CumBps'),
      allMeth: stats(points, 'allMethCumBps'),
      allUsdy: stats(points, 'allUsdyCumBps'),
      alphaVsBaseline,
      annualizedAlphaPct,
      winRateVs5050,
    },
  }
}

function stats(points: BacktestPoint[], key: keyof BacktestPoint): StrategyStats {
  const series = points.map(p => Number(p[key]))
  const finalReturnBps = series[series.length - 1]
  // max drawdown: largest peak-to-trough drop in basis points
  let peak = series[0]
  let maxDd = 0
  for (const v of series) {
    if (v > peak) peak = v
    const dd = peak - v
    if (dd > maxDd) maxDd = dd
  }
  // daily returns
  const daily: number[] = []
  for (let i = 1; i < series.length; i++) {
    // approximate daily delta from cumulative bps (works because returns are small)
    daily.push((series[i] - series[i - 1]) / 10000)
  }
  const mean = daily.reduce((a, b) => a + b, 0) / Math.max(1, daily.length)
  const variance = daily.reduce((s, r) => s + (r - mean) ** 2, 0) / Math.max(1, daily.length)
  const stddev = Math.sqrt(variance)
  const annualizedVolBps = Math.round(stddev * Math.sqrt(365) * 10000)
  const annualizedReturnPct = (finalReturnBps / Math.max(1, series.length)) * 365 / 100
  const sharpeLike = annualizedVolBps > 0 ? annualizedReturnPct / (annualizedVolBps / 100) : 0
  return {
    finalReturnBps,
    maxDrawdownBps: maxDd,
    volatilityBps: annualizedVolBps,
    sharpeLike: Number(sharpeLike.toFixed(2)),
  }
}
