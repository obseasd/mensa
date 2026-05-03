import Nav from '@/components/Nav'

const MOCK_DECISIONS = [
  {
    id: 47,
    timestamp: Date.now() - 3 * 60 * 1000,
    action: 'REBALANCE',
    confidence: 87,
    reasoning: 'Increased mETH allocation from 40% to 55%. Mantle staking yield is now 4.2% APR, while USDY T-bill yield dropped to 3.8%. The 40bps spread justifies rebalancing despite ~$0.18 in gas costs.',
    txHash: '0xab12cd34ef56789012345678901234567890abcdefabcdef1234567890abcdef',
    block: 87234012,
  },
  {
    id: 46,
    timestamp: Date.now() - 1 * 60 * 60 * 1000,
    action: 'HOLD',
    confidence: 72,
    reasoning: 'Yield spread between mETH (4.0%) and USDY (3.9%) is too narrow to justify rebalancing gas costs. Current 50/50 allocation remains optimal.',
    txHash: '0x9876fedcba0123456789012345678901234567890abcdef1234567890abcdef0',
    block: 87233998,
  },
  {
    id: 45,
    timestamp: Date.now() - 4 * 60 * 60 * 1000,
    action: 'REBALANCE',
    confidence: 91,
    reasoning: 'mETH staking yield jumped to 4.5% APR after Mantle network upgrade. Increased mETH allocation from 30% to 50% to capture the spread vs USDY (3.7%).',
    txHash: '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    block: 87233520,
  },
  {
    id: 44,
    timestamp: Date.now() - 8 * 60 * 60 * 1000,
    action: 'REBALANCE',
    confidence: 83,
    reasoning: 'USDY yield rose to 4.1% (T-bill rate increase). Reduced mETH allocation from 50% to 30% for safer real-yield exposure.',
    txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    block: 87232850,
  },
]

const ACTION_COLORS: Record<string, string> = {
  REBALANCE: 'text-[var(--accent)] bg-[var(--accent-soft)]',
  STAKE: 'text-blue-400 bg-blue-400/10',
  UNSTAKE: 'text-orange-400 bg-orange-400/10',
  HOLD: 'text-[var(--fg-muted)] bg-white/5',
}

function timeAgo(ts: number) {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function DecisionsPage() {
  return (
    <div className="min-h-screen relative">
      <Nav />

      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-12 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-medium tracking-tight mb-2">Decisions</h1>
          <p className="text-sm text-[var(--fg-muted)]">
            Every Mensa decision is logged on-chain with reasoning. No black box.
            Every transaction is verifiable on Mantlescan.
          </p>
        </div>

        <div className="space-y-3">
          {MOCK_DECISIONS.map((d) => (
            <div key={d.id} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[var(--fg-muted)]">#{d.id}</span>
                  <span className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded ${ACTION_COLORS[d.action]}`}>
                    {d.action}
                  </span>
                  <span className="text-xs text-[var(--fg-muted)]">{timeAgo(d.timestamp)}</span>
                </div>
                <div className="text-xs text-[var(--fg-muted)]">
                  Confidence: <span className="text-white mono">{d.confidence}%</span>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-[var(--fg)] mb-4">
                {d.reasoning}
              </p>

              <div className="flex items-center justify-between text-xs text-[var(--fg-muted)] pt-3 border-t border-[var(--border)]">
                <a
                  href={`https://mantlescan.xyz/tx/${d.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono hover:text-[var(--accent)] transition truncate max-w-[300px]"
                >
                  {d.txHash.slice(0, 18)}...{d.txHash.slice(-6)}
                </a>
                <span className="font-mono">Block {d.block.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button className="btn-secondary text-xs">Load older decisions</button>
        </div>
      </main>
    </div>
  )
}
