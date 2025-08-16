// src/api/wallet.js
import { jsonFetch } from './client';

// A tiny fingerprint the screen can verify
export const __ping = 'wallet-js-loaded';

export const getBalance = () =>
  jsonFetch('wallet/balance');

export const topup = (amount) =>
  jsonFetch('wallet/topup', {
    method: 'POST',
    body: JSON.stringify({ amount: Number(amount) }),
  });

export const send = (to, amount) =>
  jsonFetch('wallet/send', {
    method: 'POST',
    body: JSON.stringify({ to, amount: Number(amount) }),
  });

// Default too (guards against stale import styles)
export default { getBalance, topup, send, __ping };
