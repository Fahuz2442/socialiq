import CryptoJS from 'crypto-js';

const KEY = process.env.TOKEN_ENCRYPTION_KEY;

if (!KEY) {
  throw new Error('TOKEN_ENCRYPTION_KEY is not set in environment variables');
}

export function encrypt(plaintext) {
  if (!plaintext) return null;
  return CryptoJS.AES.encrypt(plaintext, KEY).toString();
}

export function decrypt(ciphertext) {
  if (!ciphertext) return null;
  const bytes = CryptoJS.AES.decrypt(ciphertext, KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
