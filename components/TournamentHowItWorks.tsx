export default function TournamentHowItWorks() {
  return (
    // Nav is now sticky at top-0 with ~80px height, so offset this sidebar's
    // sticky position by 6rem to clear it. Cap height to viewport so long
    // content scrolls inside the card instead of getting clipped under the
    // browser bottom edge.
    <div
      className="card p-5 lg:sticky lg:top-24 lg:overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 8rem)' }}
    >
      <div className="text-[10px] uppercase tracking-wider text-[var(--accent)] mb-4">
        How it works
      </div>
      <div className="space-y-5">
        <div>
          <div className="text-[10px] mono text-[var(--fg-dim)] mb-1">01</div>
          <div className="text-sm font-medium mb-1">A round opens</div>
          <div className="text-xs text-[var(--fg-muted)] leading-relaxed">
            Every time Mensa rebalances, a round opens with the AI&apos;s allocation
            snapshot and the current mETH/USDY prices.
          </div>
        </div>
        <div>
          <div className="text-[10px] mono text-[var(--fg-dim)] mb-1">02</div>
          <div className="text-sm font-medium mb-1">You vote your allocation</div>
          <div className="text-xs text-[var(--fg-muted)] leading-relaxed">
            Pick your own mETH/USDY split. Live simulation shows projected returns
            vs the AI. Vote weight scales with sqrt(reputation) — bots can&apos;t
            dominate.
          </div>
        </div>
        <div>
          <div className="text-[10px] mono text-[var(--fg-dim)] mb-1">03</div>
          <div className="text-sm font-medium mb-1">Round settles in 24h</div>
          <div className="text-xs text-[var(--fg-muted)] leading-relaxed">
            Whoever&apos;s allocation produced the better return wins on-chain.
            Human winners earn from the bounty pool funded by the 15% performance
            fee on yield.
          </div>
        </div>
      </div>
    </div>
  )
}
