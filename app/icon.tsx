import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// Dynamically-generated favicon at 32x32. Replaces the legacy default
// Next.js favicon.ico AND the oversized 1.3MB icon.png — both removed.
// The mark is a stylized 'M' over the sage accent — same vibe as the
// logo without shipping a heavy PNG to every page load.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0F1010',
          color: '#A3BAB9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui',
          fontWeight: 700,
          fontSize: 24,
          letterSpacing: '-0.05em',
          borderRadius: 6,
        }}
      >
        m
      </div>
    ),
    { ...size }
  )
}
