import { ethers } from 'ethers';

/**
 * Canonicalize payload: sort feeds by pair to ensure deterministic signing.
 */
export function canonicalizePayload(timestamp: number, feeds: Array<{ pair: string; price: string; decimals: number }>) {
  const sorted = [...feeds].sort((a, b) => a.pair.localeCompare(b.pair));
  return JSON.stringify({ timestamp, feeds: sorted });
}

/**
 * Verify a signature produced by ethers' signMessage over canonical payload.
 * Returns recovered address in checksum format.
 */
export async function verifySignature(signature: string, timestamp: number, feeds: Array<{ pair: string; price: string; decimals: number }>) {
  const message = canonicalizePayload(timestamp, feeds);
  // ethers verifies a UTF-8 string prefixed with "\x19Ethereum Signed Message:\n" length
  const recovered = ethers.utils.verifyMessage(message, signature);
  return ethers.utils.getAddress(recovered);
}