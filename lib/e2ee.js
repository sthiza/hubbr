// lib/e2ee.js
import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import nacl from 'tweetnacl';
import { api } from './api';
import { encode as b64encode, decode as b64decode } from 'base-64';

// --- tiny utf8 helpers (avoid TextEncoder/TextDecoder dependency) ---
function utf8Encode(str) {
  // fallback safe for RN
  return Uint8Array.from(unescape(encodeURIComponent(String(str))), c => c.charCodeAt(0));
}
function utf8Decode(u8) {
  return decodeURIComponent(escape(String.fromCharCode(...u8)));
}

// --- base64 helpers that work on Uint8Array in RN ---
const btoaU8 = (u8) => b64encode(String.fromCharCode(...u8));
const atobU8 = (b) => Uint8Array.from(b64decode(String(b)), c => c.charCodeAt(0));

const DEVICE_ID_KEY = 'e2ee.device_id';
const ID_KEYPAIR    = 'e2ee.idkp';   // {pub, sec} base64
const SIGNED_PREKEY = 'e2ee.spk';    // {pub, sig, sec} base64
const OTPREKEYS     = 'e2ee.otpk';   // [pubB64,...]
const E2EE_READY    = 'e2ee.ready';

export async function ensureKeys() {
  let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `rn-${Math.random().toString(36).slice(2,10)}-${Date.now()}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  // Identity (sign) keys
  let idkp = await AsyncStorage.getItem(ID_KEYPAIR);
  if (!idkp) {
    const kp = nacl.sign.keyPair();
    idkp = JSON.stringify({ pub: btoaU8(kp.publicKey), sec: btoaU8(kp.secretKey) });
    await AsyncStorage.setItem(ID_KEYPAIR, idkp);
  }
  const { pub: idPubB64, sec: idSecB64 } = JSON.parse(idkp);

  // Signed prekey (curve25519) + signature (over spk pub using identity secret)
  let spk = await AsyncStorage.getItem(SIGNED_PREKEY);
  if (!spk) {
    const spkPair = nacl.box.keyPair();
    const idSec = atobU8(idSecB64);
    const signature = nacl.sign.detached(spkPair.publicKey, idSec);
    spk = JSON.stringify({ pub: btoaU8(spkPair.publicKey), sig: btoaU8(signature), sec: btoaU8(spkPair.secretKey) });
    await AsyncStorage.setItem(SIGNED_PREKEY, spk);
  }
  const { pub: spkPubB64, sig: spkSigB64, sec: spkSecB64 } = JSON.parse(spk);

  // One-time prekeys (public only — dev)
  let otList = await AsyncStorage.getItem(OTPREKEYS);
  if (!otList) {
    const arr = [];
    for (let i = 0; i < 10; i++) arr.push(btoaU8(nacl.box.keyPair().publicKey));
    otList = JSON.stringify(arr);
    await AsyncStorage.setItem(OTPREKEYS, otList);
  }
  const oneTimes = JSON.parse(otList);

  // Upload PUBLICS only
  await api('/keys/upload', {
    method: 'POST',
    body: JSON.stringify({
      device_id: deviceId,
      identity_pub: idPubB64,
      signed_prekey_pub: spkPubB64,
      signed_prekey_sig: spkSigB64,
      one_time_prekeys: oneTimes
    })
  });

  await AsyncStorage.setItem(E2EE_READY, '1');
  return { deviceId, idPubB64, spkSecB64 };
}

// Encrypt using recipient signed_prekey_pub and ephemeral sender key
export async function encryptForUser(recipientUsername, plaintext) {
  const res = await api(`/keys/for/${encodeURIComponent(recipientUsername)}`);
  if (!res.ok) throw new Error(`No prekeys for ${recipientUsername}`);
  const k = await res.json();

  const eph = nacl.box.keyPair();
  const recipPub = atobU8(k.signed_prekey_pub);
  const nonce = nacl.randomBytes(24);
  const msg = utf8Encode(String(plaintext));
  const ct = nacl.box(msg, nonce, recipPub, eph.secretKey);

  // pack: [nonce(24)][ephPub(32)][ct(...)]
  const packed = new Uint8Array(24 + 32 + ct.length);
  packed.set(nonce, 0);
  packed.set(eph.publicKey, 24);
  packed.set(ct, 56);
  return btoaU8(packed);
}

// Dev-only decrypt: open messages TO ME using local signed_prekey_secret
export async function decryptIfPossible(ciphertextB64) {
  try {
    if (!ciphertextB64) return null;
    const packed = atobU8(ciphertextB64);
    if (packed.length < 56) return null;
    const nonce = packed.slice(0, 24);
    const ephPub = packed.slice(24, 56);
    const ct = packed.slice(56);

    const spk = JSON.parse((await AsyncStorage.getItem(SIGNED_PREKEY)) || '{}');
    if (!spk.sec) return null;
    const spkSec = atobU8(spk.sec);

    const msg = nacl.box.open(ct, nonce, ephPub, spkSec);
    if (!msg) return null;
    return utf8Decode(msg);
  } catch {
    return null;
  }
}
