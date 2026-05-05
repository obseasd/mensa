import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Mensa — The AI Treasury that Passes the Turing Test'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#000',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px',
          fontFamily: 'system-ui',
          color: '#fff',
          backgroundImage: 'linear-gradient(to bottom right, #000 0%, #0a0a0a 50%, #1a1a1a 100%)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '60px' }}>
          <img
            src={`https://mensa-mu.vercel.app/logo.png`}
            width={44}
            height={44}
            style={{ borderRadius: 6 }}
            alt="M"
          />
          <div style={{ fontSize: 28, fontWeight: 500 }}>mensa</div>
          <div
            style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              background: 'rgba(163, 186, 185, 0.12)',
              border: '1px solid rgba(163, 186, 185, 0.3)',
              borderRadius: 999,
              fontSize: 13,
              color: '#A3BAB9',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Live on Mantle
          </div>
        </div>

        {/* Title */}
        <div style={{ fontSize: 84, fontWeight: 500, lineHeight: 1.05, letterSpacing: '-0.04em', display: 'flex', flexDirection: 'column' }}>
          <div>The AI treasury</div>
          <div>that proves itself.</div>
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 28, color: '#a0a0a0', marginTop: 32, lineHeight: 1.4, maxWidth: 980 }}>
          Allocates mETH and USDY on Mantle. Every decision logged on-chain, explained, and challenged by humans.
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 28, fontSize: 16, color: '#5a5a5a' }}>
            <span>Mantle Turing Test 2026</span>
            <span>·</span>
            <span>Agentic Wallets · AI x RWA · AI Trading</span>
          </div>
          <div style={{ fontSize: 16, color: '#A3BAB9', fontFamily: 'monospace' }}>mensa-mu.vercel.app</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
