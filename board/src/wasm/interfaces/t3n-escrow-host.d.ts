/** @module Interface t3n:escrow/host **/
export function kvGet(namespace: string, key: string): string;
export function kvSet(namespace: string, key: string, value: string): string;
export function signSecp256k1(walletAddress: string, messageHash: string): string;
export function outboxPost(url: string, body: string, idempotencyKey: string): string;
