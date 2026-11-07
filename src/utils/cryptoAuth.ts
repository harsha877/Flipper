// Web Crypto API (PBKDF2-SHA256 + AES-256-GCM) Zero-Plaintext Creator Authentication
// Your password (and optional GitHub Personal Access Token) are never stored in plain text.
// Only an encrypted ciphertext token (v1:<salt_b64>:<iv_b64>:<cipher_b64>) is stored in site-config.txt.

const PBKDF2_ITERATIONS = 100000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = window.atob(base64.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesGcmKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptCreatorVault(
  password: string,
  options?: { githubPat?: string; customSecretMessage?: string }
): Promise<{ token: string; payloadJson: string }> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesGcmKey(password, salt);

  const payloadJson = JSON.stringify({
    verified: true,
    site: 'Retunda',
    message: options?.customSecretMessage || 'Retunda Creator Studio Access Granted',
    githubPat: options?.githubPat?.trim() || undefined,
    v: 1,
  });

  const encoder = new TextEncoder();
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    encoder.encode(payloadJson)
  );

  const cipherBytes = new Uint8Array(encryptedBuffer);
  const token = `v1:${bytesToBase64(salt)}:${bytesToBase64(iv)}:${bytesToBase64(
    cipherBytes
  )}`;

  return { token, payloadJson };
}

export async function decryptCreatorVault(
  password: string,
  vaultToken: string
): Promise<{ ok: boolean; decryptedText?: string; githubPat?: string }> {
  try {
    const cleanToken = vaultToken.trim();
    const parts = cleanToken.split(':');
    if (parts.length !== 4 || parts[0] !== 'v1') {
      return { ok: false };
    }

    const salt = base64ToBytes(parts[1]);
    const iv = base64ToBytes(parts[2]);
    const cipherBytes = base64ToBytes(parts[3]);

    const key = await deriveAesGcmKey(password, salt);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      cipherBytes as unknown as BufferSource
    );

    const decoder = new TextDecoder();
    const decryptedText = decoder.decode(decryptedBuffer);
    const parsed = JSON.parse(decryptedText) as {
      verified?: boolean;
      githubPat?: string;
    };

    if (parsed && parsed.verified === true) {
      return {
        ok: true,
        decryptedText,
        githubPat: parsed.githubPat,
      };
    }
    return { ok: false };
  } catch {
    // AES-GCM authentication tag mismatch (wrong password) throws OperationError
    return { ok: false };
  }
}
