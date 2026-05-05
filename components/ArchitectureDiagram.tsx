export default function ArchitectureDiagram() {
  return (
    <div className="card p-6 overflow-x-auto">
      <svg viewBox="0 0 800 480" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="accent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A3BAB9" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#A3BAB9" stopOpacity="0.02" />
          </linearGradient>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <polygon points="0 0, 8 4, 0 8" fill="#5a5a5a" />
          </marker>
        </defs>

        {/* User wallet */}
        <g>
          <rect x="320" y="20" width="160" height="50" rx="8" fill="#0a0a0a" stroke="#3a3a3a" />
          <text x="400" y="42" textAnchor="middle" fill="#fff" fontSize="13" fontFamily="Inter">User wallet</text>
          <text x="400" y="58" textAnchor="middle" fill="#a0a0a0" fontSize="10" fontFamily="Inter">mETH / USDY</text>
        </g>

        {/* Arrows down to MensaAgent + TournamentVault */}
        <line x1="380" y1="70" x2="220" y2="120" stroke="#5a5a5a" markerEnd="url(#arrow)" />
        <line x1="420" y1="70" x2="580" y2="120" stroke="#5a5a5a" markerEnd="url(#arrow)" />

        {/* MensaAgent */}
        <g>
          <rect x="100" y="120" width="220" height="80" rx="8" fill="url(#accent)" stroke="#A3BAB9" />
          <text x="210" y="148" textAnchor="middle" fill="#fff" fontSize="14" fontFamily="Inter" fontWeight="500">MensaAgent</text>
          <text x="210" y="166" textAnchor="middle" fill="#a0a0a0" fontSize="10" fontFamily="Inter">Treasury</text>
          <text x="210" y="182" textAnchor="middle" fill="#5a5a5a" fontSize="9" fontFamily="Inter">deposit / withdraw / executeAllocation</text>
        </g>

        {/* TournamentVault */}
        <g>
          <rect x="480" y="120" width="220" height="80" rx="8" fill="#0a0a0a" stroke="#3a3a3a" />
          <text x="590" y="148" textAnchor="middle" fill="#fff" fontSize="14" fontFamily="Inter" fontWeight="500">TournamentVault</text>
          <text x="590" y="166" textAnchor="middle" fill="#a0a0a0" fontSize="10" fontFamily="Inter">AI vs Human rounds</text>
          <text x="590" y="182" textAnchor="middle" fill="#5a5a5a" fontSize="9" fontFamily="Inter">openRound / voteHuman / settleRound</text>
        </g>

        {/* Bidirectional arrow between agent and vault */}
        <line x1="320" y1="160" x2="475" y2="160" stroke="#5a5a5a" markerEnd="url(#arrow)" />
        <line x1="475" y1="170" x2="320" y2="170" stroke="#5a5a5a" markerEnd="url(#arrow)" />

        {/* Arrows down to DecisionLog, Reputation, Badges, Bounty */}
        <line x1="210" y1="200" x2="180" y2="240" stroke="#5a5a5a" markerEnd="url(#arrow)" />
        <line x1="590" y1="200" x2="450" y2="240" stroke="#5a5a5a" markerEnd="url(#arrow)" />
        <line x1="590" y1="200" x2="640" y2="240" stroke="#5a5a5a" markerEnd="url(#arrow)" />

        {/* DecisionLog */}
        <g>
          <rect x="60" y="240" width="200" height="60" rx="8" fill="#0a0a0a" stroke="#3a3a3a" />
          <text x="160" y="265" textAnchor="middle" fill="#fff" fontSize="13" fontFamily="Inter">DecisionLog</text>
          <text x="160" y="282" textAnchor="middle" fill="#a0a0a0" fontSize="10" fontFamily="Inter">on-chain reasoning</text>
        </g>

        {/* Reputation */}
        <g>
          <rect x="290" y="240" width="200" height="60" rx="8" fill="#0a0a0a" stroke="#3a3a3a" />
          <text x="390" y="265" textAnchor="middle" fill="#fff" fontSize="13" fontFamily="Inter">Reputation</text>
          <text x="390" y="282" textAnchor="middle" fill="#a0a0a0" fontSize="10" fontFamily="Inter">sqrt-weighted votes</text>
        </g>

        {/* Badges */}
        <g>
          <rect x="540" y="240" width="200" height="60" rx="8" fill="#0a0a0a" stroke="#3a3a3a" />
          <text x="640" y="265" textAnchor="middle" fill="#fff" fontSize="13" fontFamily="Inter">MensaBadges</text>
          <text x="640" y="282" textAnchor="middle" fill="#a0a0a0" fontSize="10" fontFamily="Inter">soulbound NFT awards</text>
        </g>

        {/* Arrow from agent down to BountyPool */}
        <line x1="210" y1="200" x2="400" y2="340" stroke="#5a5a5a" markerEnd="url(#arrow)" />
        <line x1="390" y1="300" x2="400" y2="340" stroke="#5a5a5a" markerEnd="url(#arrow)" />

        {/* BountyPool */}
        <g>
          <rect x="290" y="340" width="220" height="60" rx="8" fill="url(#accent)" stroke="#A3BAB9" />
          <text x="400" y="365" textAnchor="middle" fill="#fff" fontSize="13" fontFamily="Inter" fontWeight="500">BountyPool</text>
          <text x="400" y="382" textAnchor="middle" fill="#a0a0a0" fontSize="10" fontFamily="Inter">15% perf fee → 50/30/20 split</text>
        </g>

        {/* AI Operator (off-chain) */}
        <line x1="210" y1="200" x2="120" y2="430" stroke="#5a5a5a" strokeDasharray="4 2" markerEnd="url(#arrow)" />
        <g>
          <rect x="40" y="420" width="200" height="40" rx="8" fill="#000" stroke="#3a3a3a" strokeDasharray="4 2" />
          <text x="140" y="445" textAnchor="middle" fill="#a0a0a0" fontSize="11" fontFamily="Inter">AI Operator (Claude Haiku 4.5)</text>
        </g>
        <text x="140" y="475" textAnchor="middle" fill="#5a5a5a" fontSize="9" fontFamily="Inter">off-chain · Bybit signals · executes via aiOperator role</text>
      </svg>

      <div className="text-[10px] text-[var(--fg-dim)] mt-4 text-center">
        All contracts deployed on Mantle (Mainnet 5000 + Sepolia 5003).
      </div>
    </div>
  )
}
