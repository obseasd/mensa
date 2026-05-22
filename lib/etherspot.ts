/// Etherspot Prime SDK integration for gasless onboarding on Mantle Mainnet.
///
/// Mensa's standard /deposit flow uses an EOA + MetaMask signing every tx, which
/// requires the user to hold MNT for gas. This module wires Etherspot's Account
/// Abstraction stack (Prime SDK + Arka Paymaster) so a fresh user can interact
/// with Mensa without first acquiring MNT.
///
/// Architecture choice:
///   - We use Etherspot Prime SDK to deploy a smart wallet for the user, derived
///     deterministically from their EOA signer (MetaMask).
///   - User-operation transactions from the smart wallet are sponsored by the
///     Arka Paymaster, funded with MNT by the Mensa operator post-grant.
///   - The smart wallet address is counter-factual: it has a known address even
///     before the first tx, so users can pre-fund it.
///
/// API key:
///   - For the hackathon demo we use the public testnet key `etherspot_public_key`
///     which is rate-limited but works for proof-of-integration runs.
///   - Production key is sourced from NEXT_PUBLIC_ETHERSPOT_API_KEY when set.
///   - Get a production key at https://portal.etherspot.io
///
/// Funding the paymaster:
///   - The Arka paymaster must be funded with MNT before it sponsors txs.
///   - The operator wallet deposits MNT into the paymaster contract on Mantle.
///   - Without funding, sponsored txs revert with "insufficient paymaster balance".

import { PrimeSdk, EtherspotBundler, Web3eip1193WalletProvider } from '@etherspot/prime-sdk'

export const ETHERSPOT_API_KEY =
  process.env.NEXT_PUBLIC_ETHERSPOT_API_KEY || 'etherspot_public_key'

export const MANTLE_CHAIN_ID = 5000
export const MANTLE_BUNDLER_URL = `https://rpc.etherspot.io/v1/${MANTLE_CHAIN_ID}`
export const ARKA_PAYMASTER_URL = 'https://arka.etherspot.io'

/// Minimal EIP-1193 surface the Etherspot SDK consumes (window.ethereum-like).
/// We accept this shape rather than wagmi's viem WalletClient because Etherspot
/// expects the lower-level request-based interface.
export interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>
}

/// Build a PrimeSdk instance bound to the user's MetaMask (or any EIP-1193
/// provider). We wrap the raw provider with Etherspot's
/// Web3eip1193WalletProvider, which adapts the EIP-1193 request method into
/// the SDK's internal signer interface.
export async function getPrimeSdk(provider: Eip1193Provider): Promise<PrimeSdk> {
  const walletProvider = await Web3eip1193WalletProvider.connect(provider as never)
  return new PrimeSdk(walletProvider, {
    chainId: MANTLE_CHAIN_ID,
    bundlerProvider: new EtherspotBundler(MANTLE_CHAIN_ID, ETHERSPOT_API_KEY),
  })
}

/// Resolve the user's counter-factual smart wallet address. This is the address
/// at which they will hold tokens and from which sponsored txs will originate.
/// Works before any tx is sent because Etherspot uses deterministic CREATE2.
export async function getSmartWalletAddress(sdk: PrimeSdk): Promise<string> {
  return await sdk.getCounterFactualAddress()
}

/// Arka paymaster URL is parameterised by the API key in-path.
/// PaymasterApi shape from the SDK accepts only `url` + optional `context`,
/// so the api key lives in the URL.
const SPONSOR_PAYMASTER_URL = `${ARKA_PAYMASTER_URL}/v1/${ETHERSPOT_API_KEY}/sponsor`

/// Pack a single sponsored userOp that calls `to` with `data` and `value`,
/// then estimates + sends it via the Arka Paymaster. Returns the userOp hash.
export async function sendSponsoredCall(
  sdk: PrimeSdk,
  to: string,
  data: string,
  value: bigint = BigInt(0)
): Promise<string> {
  await sdk.clearUserOpsFromBatch()
  await sdk.addUserOpsToBatch({
    to: to as `0x${string}`,
    value,
    data: data as `0x${string}`,
  })
  const userOp = await sdk.estimate({
    paymasterDetails: {
      url: SPONSOR_PAYMASTER_URL,
      context: { mode: 'sponsor' },
    },
  })
  return await sdk.send(userOp)
}

/// Convenience: pack two calls (approve + deposit) into a single sponsored
/// userOp. This is the production flow for first-deposit users.
export async function sendSponsoredDeposit(
  sdk: PrimeSdk,
  approveTo: string,
  approveData: string,
  depositTo: string,
  depositData: string
): Promise<string> {
  await sdk.clearUserOpsFromBatch()
  await sdk.addUserOpsToBatch({
    to: approveTo as `0x${string}`,
    value: BigInt(0),
    data: approveData as `0x${string}`,
  })
  await sdk.addUserOpsToBatch({
    to: depositTo as `0x${string}`,
    value: BigInt(0),
    data: depositData as `0x${string}`,
  })
  const userOp = await sdk.estimate({
    paymasterDetails: {
      url: SPONSOR_PAYMASTER_URL,
      context: { mode: 'sponsor' },
    },
  })
  return await sdk.send(userOp)
}
