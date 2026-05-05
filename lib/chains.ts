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
    mensaAgent: '0xAcA925e51E7C801Af4E4080f041AF0ec112CCe49',
    decisionLog: '0xD889B7819eF45cda7b9D30bA677A27E0ef6788Fe',
    tournamentVault: '0x92E6B40da9566d6b7176420D88818500dB77d122',
    reputation: '0x10A519fd1867120C5379C7f8016A4223826b4E5f',
    bountyPool: '0x06460f1cb540951e115A95257D59FEeFf9A55f39',
    badges: '0x22867d39E3e9891A4F76754AF9BD1B131661144E',
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
    mETH: '0x66174C1BFe93a8c3FD5820148a664df52Ca4d170',
    USDY: '0xe73A1eeC53BE30c7AA1e57953216aebBFC0bb120',
    mensaAgent: '0x0B1018150C18dF5EB453Baa25a169884069AA81F',
    decisionLog: '0x32f6911E8bb653d9B4210748972F8EbF3651ef85',
    tournamentVault: '0xE0C0088acaD843e07Ceb77338fF1eC49979Be5f2',
    reputation: '0xb431a54b5801c5278D64ED38e1a7b31585560992',
    bountyPool: '0x597ef1750d0d83d8764dB5B62be0F1f1F13f9313',
    badges: '0x94831c84f00c1F6D9331318fD94e0C77243cb5EE',
  },
} as const

// Active chain — switch between testnet and mainnet here
export const ACTIVE_CHAIN = MANTLE_SEPOLIA
