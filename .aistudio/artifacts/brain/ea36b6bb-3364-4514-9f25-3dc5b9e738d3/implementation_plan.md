# Retunda — Zero-Plaintext AES-256-GCM Encrypted Admin Authentication Plan

## 1. Is "Encrypt Text & Decrypt With Password" a Good Approach?
**Yes—for a serverless static React website, this is the strongest client-side cryptographic pattern available.**

* **Why the previous approach exposed the password**: Because `site-config.txt` is bundled into the frontend, a plaintext `ADMIN_PASSCODE` could be read by someone inspecting browser DevTools.
* **How Authenticated Decryption (`PBKDF2` + `AES-256-GCM`) solves this**:
  1. Your password is **never stored anywhere** in `src/content/site-config.txt` or the JavaScript code.
  2. Instead, `site-config.txt` stores only a base64 **Encrypted Vault Token (`ADMIN_VAULT`)** containing a random 16-byte salt, a 12-byte IV, and an AES-256-GCM ciphertext + 128-bit authentication tag.
  3. When you type your password into the modal, the browser's native **Web Crypto API (`window.crypto.subtle`)** runs **100,000 iterations of PBKDF2-SHA256** to derive a 256-bit AES key from your password and attempts to decrypt the ciphertext.
  4. If the password is wrong, AES-GCM authentication fails immediately. If the password is correct, it decrypts the verification payload (`RETUNDA_CREATOR_VERIFIED::...`) and unlocks Creator Mode.

---

## 2. Cryptographic Flow & File Changes

### A. `src/utils/cryptoAuth.ts` (Web Crypto API Engine)
* **`encryptCreatorVault(password: string, payload?: string): Promise<string>`**:
  * Generates a cryptographically random 16-byte salt and 12-byte IV.
  * Derives a 256-bit AES-GCM key via `PBKDF2` (`100,000` iterations, `SHA-256`).
  * Encrypts a signed JSON verification token (`{ verified: true, site: "Retunda", createdAt }`).
  * Returns a compact `v1:<salt_b64>:<iv_b64>:<cipher_b64>` string to paste into `src/content/site-config.txt`.
* **`decryptCreatorVault(password: string, vaultToken: string): Promise<boolean>`**:
  * Extracts the salt, IV, and ciphertext from `ADMIN_VAULT`.
  * Derives the key from the user-entered password and runs `crypto.subtle.decrypt`.
  * Verifies the decrypted JSON token and returns `true` only on valid decryption.

### B. `src/content/site-config.txt` (No Plaintext Password)
* Removes `ADMIN_PASSCODE` completely.
* Stores only:
  * `ADMIN_KEY: retunda` (URL query trigger `?admin=retunda`)
  * `ADMIN_VAULT: v1:...` (AES-256-GCM encrypted ciphertext—zero plaintext password in the file).

### C. `src/components/AdminPasscodeModal.tsx` & Built-in Vault Key Generator
* Uses `decryptCreatorVault(password, config.adminVault)` to verify your password asynchronously via Web Crypto.
* Inside the unlocked **Page Builder Studio**, includes a **"Change Password / Generate New Encrypted Vault Token"** utility: type any new password, and it generates a fresh `ADMIN_VAULT: v1:...` encrypted string that you can copy into `src/content/site-config.txt` without ever exposing your new password in plain text.
