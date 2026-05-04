// Mantle network configuration

export const MANTLE_MAINNET = {
  id: 5000,
  name: 'Mantle',
  nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
  rpc: 'https://rpc.mantle.xyz',
  explorer: 'https://mantlescan.xyz',
  faucet: null,
  contracts: {
    mETH: '0xcDA86A272531e8640cD7F1a92c01839911B90bb0',
    USDY: '0x5bE26527e817998A7206475496fDE1E68957c5A6',
    mensaAgent: '',
    decisionLog: '',
    tournamentVault: '',
  },
} as const

export const MANTLE_SEPOLIA = {
  id: 5003,
  name: 'Mantle Sepolia',
  nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
  rpc: 'https://rpc.sepolia.mantle.xyz',
  explorer: 'https://explorer.sepolia.mantle.xyz',
  faucet: 'https://faucet.sepolia.mantle.xyz',
  contracts: {
    mETH: '0x1d03f395bCC1E5bd0e516bE2C1Aa28950910DDC5',
    USDY: '0x3338d2791e1cab22835a3975b1401C0f16C2AcCa',
    mensaAgent: '0x022F2E3EeAC339E4bE51A8a5193779477eB7B7C2',
    decisionLog: '0x01952C203cA2deBC37753322EB098D3E6546b8b8',
    tournamentVault: '0x217dC1a541e72B2dcE8EF921885123DD5F6AbA5D',
  },
} as const

// Active chain — switch between testnet and mainnet here
export const ACTIVE_CHAIN = MANTLE_SEPOLIA
