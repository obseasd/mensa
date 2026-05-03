// Mantle network configuration
// Mainnet: 5000, Testnet (Sepolia): 5003

export const MANTLE_MAINNET = {
  id: 5000,
  name: 'Mantle',
  nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
  rpc: 'https://rpc.mantle.xyz',
  explorer: 'https://mantlescan.xyz',
  faucet: null,
  // Real RWA contracts on Mantle Mainnet
  contracts: {
    mETH: '0xcDA86A272531e8640cD7F1a92c01839911B90bb0',  // Mantle Staked ETH
    USDY: '0x5bE26527e817998A7206475496fDE1E68957c5A6',  // Ondo USDY on Mantle
    // Mensa contracts (TBD — to be deployed)
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
    mETH: '',
    USDY: '',
    mensaAgent: '',
    decisionLog: '',
    tournamentVault: '',
  },
} as const

// Switch to MAINNET for production deploy
export const ACTIVE_CHAIN = MANTLE_MAINNET
