import type { Metadata } from 'next'
import PitchDeck from '@/components/PitchDeck'

export const metadata: Metadata = {
  title: 'Mensa — Pitch deck',
  description:
    'Mensa is the AI treasury that proves itself: every decision on-chain, every decision challenged. Pitch deck for the Mantle Turing Test 2026.',
}

// The pitch deck owns its own scroll snap container, so no global Nav and no
// max-width main wrapper here. Each slide manages its own padding.
export default function PitchPage() {
  return <PitchDeck />
}
