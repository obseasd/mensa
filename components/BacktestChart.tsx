'use client'

interface Point {
  ts: number
  mensaCumBps: number
  hold5050CumBps: number
  allMethCumBps: number
  allUsdyCumBps: number
}

interface BacktestChartProps {
  points: Point[]
  height?: number
}

const SERIES = [
  { key: 'mensaCumBps' as const,    label: 'Mensa AI',     color: 'var(--accent)',          width: 2.5 },
  { key: 'hold5050CumBps' as const, label: 'Passive 50/50', color: 'rgba(255,255,255,0.55)', width: 1.5 },
  { key: 'allMethCumBps' as const,  label: '100% mETH',     color: '#fbbf24',                 width: 1 },
  { key: 'allUsdyCumBps' as const,  label: '100% USDY',     color: '#7c8ca8',                 width: 1 },
]

function fmtBps(bps: number): string {
  const pct = bps / 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
}

function fmtDate(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export default function BacktestChart({ points, height = 280 }: BacktestChartProps) {
  if (points.length < 2) {
    return <div className="text-xs text-[var(--fg-dim)]">Not enough data to chart.</div>
  }

  // Compute combined min/max across all series for shared scale
  let min = Infinity
  let max = -Infinity
  for (const p of points) {
    for (const s of SERIES) {
      const v = p[s.key]
      if (v < min) min = v
      if (v > max) max = v
    }
  }
  // Add 5% padding
  const range = max - min
  const padding = range * 0.05 || 100
  min -= padding
  max += padding

  // SVG dims
  const W = 1000  // viewBox width
  const H = height // viewBox height
  const PAD_L = 60
  const PAD_R = 16
  const PAD_T = 12
  const PAD_B = 28
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  const xFor = (i: number) => PAD_L + (i / (points.length - 1)) * innerW
  const yFor = (v: number) => PAD_T + innerH - ((v - min) / (max - min)) * innerH

  // Y-axis ticks (5)
  const yTicks: number[] = []
  for (let i = 0; i <= 4; i++) {
    yTicks.push(min + (range + 2 * padding) * (i / 4))
  }

  // X-axis ticks (~5 evenly spaced dates)
  const xTickIdx: number[] = []
  for (let i = 0; i <= 4; i++) {
    xTickIdx.push(Math.round((points.length - 1) * (i / 4)))
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-[var(--fg-muted)]">
        {SERIES.map(s => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5" style={{ background: s.color }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card p-2 overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto block"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Y grid */}
          {yTicks.map((v, i) => {
            const y = yFor(v)
            return (
              <g key={i}>
                <line
                  x1={PAD_L}
                  x2={W - PAD_R}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth="0.5"
                  strokeDasharray={v === 0 ? 'none' : '2 3'}
                />
                <text
                  x={PAD_L - 6}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="var(--fg-dim)"
                  fontFamily="ui-monospace, monospace"
                >
                  {fmtBps(v)}
                </text>
              </g>
            )
          })}

          {/* X axis labels */}
          {xTickIdx.map((idx, i) => (
            <text
              key={i}
              x={xFor(idx)}
              y={H - 8}
              textAnchor="middle"
              fontSize="11"
              fill="var(--fg-dim)"
              fontFamily="ui-monospace, monospace"
            >
              {fmtDate(points[idx].ts)}
            </text>
          ))}

          {/* Series */}
          {SERIES.map(s => {
            const path = points.map((p, i) =>
              `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(p[s.key]).toFixed(1)}`
            ).join(' ')
            return (
              <path
                key={s.key}
                d={path}
                fill="none"
                stroke={s.color}
                strokeWidth={s.width}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
          })}
        </svg>
      </div>
    </div>
  )
}
