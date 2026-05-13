import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Mensa — The AI Treasury that proves itself'
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
          backgroundImage:
            'radial-gradient(circle at 0% 0%, rgba(163, 186, 185, 0.08) 0%, transparent 40%), radial-gradient(circle at 100% 100%, rgba(163, 186, 185, 0.05) 0%, transparent 40%), linear-gradient(to bottom right, #000 0%, #0a0a0a 50%, #141414 100%)',
        }}
      >
        {/* Header — logo + brand + live badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '48px' }}>
          <img
            src="https://mensa-mu.vercel.app/logo.png"
            width={72}
            height={72}
            style={{ borderRadius: 8, filter: 'invert(1)' }}
            alt="M"
          />
          <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.01em' }}>mensa</div>
          <div
            style={{
              marginLeft: 'auto',
              padding: '8px 14px',
              background: 'rgba(163, 186, 185, 0.12)',
              border: '1px solid rgba(163, 186, 185, 0.35)',
              borderRadius: 999,
              fontSize: 14,
              color: '#A3BAB9',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: '#A3BAB9',
                display: 'block',
              }}
            />
            Live on Mantle Mainnet
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 86,
            fontWeight: 500,
            lineHeight: 1.04,
            letterSpacing: '-0.045em',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div>The AI treasury</div>
          <div>that proves itself.</div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 26,
            color: '#a0a0a0',
            marginTop: 28,
            lineHeight: 1.4,
            maxWidth: 1000,
          }}
        >
          Intelligent RWA agent on Mantle. Allocates between mETH and USDY, with every decision
          logged on-chain and challenged by humans in a verifiable Turing tournament.
        </div>

        {/* Stat row */}
        <div
          style={{
            marginTop: 36,
            display: 'flex',
            gap: 56,
            paddingTop: 28,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 32, fontWeight: 500, color: '#fff', fontFamily: 'monospace' }}>7/7</div>
            <div style={{ fontSize: 13, color: '#7a7a7a', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Verified contracts
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 32, fontWeight: 500, color: '#A3BAB9', fontFamily: 'monospace' }}>On-chain</div>
            <div style={{ fontSize: 13, color: '#7a7a7a', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Decision log
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 32, fontWeight: 500, color: '#fff', fontFamily: 'monospace' }}>15%</div>
            <div style={{ fontSize: 13, color: '#7a7a7a', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Perf fee → humans
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 32, fontWeight: 500, color: '#fff', fontFamily: 'monospace' }}>Claude</div>
            <div style={{ fontSize: 13, color: '#7a7a7a', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Haiku 4.5 + memory loop
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 32,
          }}
        >
          <div style={{ display: 'flex', gap: 18, fontSize: 15, color: '#5a5a5a' }}>
            <span>Mantle Turing Test 2026</span>
            <span>·</span>
            <span>AI × RWA</span>
            <span>·</span>
            <span>Grand Champion</span>
            <span>·</span>
            <span>Best UI/UX</span>
          </div>
          <div style={{ fontSize: 15, color: '#A3BAB9', fontFamily: 'monospace' }}>mensa-mu.vercel.app</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
