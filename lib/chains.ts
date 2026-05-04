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
    mETH: '0xddf4F73b5943A1Ed07bB78D5D35046905FfC4e81',
    USDY: '0x72B3096D611C31EdF35865D52D46140B2aEE19ab',
    mensaAgent: '0x5dffa3622eAF1945B2A61EF53d342C1C82a4c09c',
    decisionLog: '0x129C036741292750C20F776e04c717c6cE03FBA1',
    tournamentVault: '0x60353cf0062E02348D94c9ce25B5951bD64b2596',
  },
} as const

// Active chain — switch between testnet and mainnet here
export const ACTIVE_CHAIN = MANTLE_SEPOLIA
