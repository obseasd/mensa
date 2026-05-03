import { http, createConfig } from 'wagmi'
import { defineChain } from 'viem'
import { injected, metaMask } from 'wagmi/connectors'

// Mantle Mainnet
export const mantle = defineChain({
  id: 5000,
  name: 'Mantle',
  nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mantle.xyz'] } },
  blockExplorers: { default: { name: 'Mantlescan', url: 'https://mantlescan.xyz' } },
})

// Mantle Sepolia
export const mantleSepolia = defineChain({
  id: 5003,
  name: 'Mantle Sepolia',
  nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.sepolia.mantle.xyz'] } },
  blockExplorers: { default: { name: 'Mantle Sepolia Explorer', url: 'https://explorer.sepolia.mantle.xyz' } },
  testnet: true,
})

export const wagmiConfig = createConfig({
  chains: [mantle, mantleSepolia],
  connectors: [injected(), metaMask()],
  transports: {
    [mantle.id]: http(),
    [mantleSepolia.id]: http(),
  },
  ssr: true,
})
