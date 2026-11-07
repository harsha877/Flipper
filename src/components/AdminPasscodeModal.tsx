import React, { useState } from 'react';
import { KeyRound, Lock, ShieldCheck, X } from 'lucide-react';
import { decryptCreatorVault } from '../utils/cryptoAuth';

interface AdminPasscodeModalProps {
  vaultToken: string;
  onSuccess: (decryptedGithubPat?: string) => void;
  onClose: () => void;
}

export const AdminPasscodeModal: React.FC<AdminPasscodeModalProps> = ({
  vaultToken,
  onSuccess,
  onClose,
}) => {
  const [passcode, setPasscode] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;

    setIsDecrypting(true);
    setError(null);

    const result = await decryptCreatorVault(passcode.trim(), vaultToken);
    setIsDecrypting(false);

    if (result.ok) {
      onSuccess(result.githubPat);
    } else {
      setError(
        'AES-256-GCM Decryption failed: Invalid password. Could not authenticate ADMIN_VAULT cipher.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1C1917]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FAF9F6] border border-[#E7E5E0] max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-[#E7E5E0] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#1C1917] text-[#FAF9F6] flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-[#B45309]">
                Zero-Plaintext AES-256-GCM Gate
              </p>
              <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
                Decrypt Creator Vault
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#57534E] hover:text-[#1C1917] border border-[#E7E5E0] bg-[#F3F1EC] cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-[#F3F1EC] border border-[#E7E5E0] p-3 space-y-1">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#1C1917] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-[#B45309]" />
            PBKDF2-SHA256 (100,000 iter) + AES-256-GCM
          </div>
          <p className="text-[11px] text-[#57534E] leading-relaxed">
            Your password is never stored in code. Entering your password derives a 256-bit key to decrypt <code className="font-mono text-[#1C1917]">ADMIN_VAULT</code> from <code className="font-mono text-[#1C1917]">site-config.txt</code>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-[#57534E] mb-1.5">
              Enter Password to Decrypt Vault
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#57534E] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter decryption password..."
                autoFocus
                className="w-full bg-[#F3F1EC] border border-[#E7E5E0] pl-9 pr-3 py-2.5 font-mono text-sm text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
              />
            </div>
            {error && (
              <p className="text-xs text-[#B91C1C] mt-1.5 font-medium leading-relaxed">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-mono uppercase tracking-wider border border-[#D6D3CD] text-[#57534E] hover:text-[#1C1917] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDecrypting}
              className="px-5 py-2.5 text-xs font-mono uppercase tracking-wider bg-[#1C1917] text-[#FAF9F6] hover:bg-[#B45309] transition-colors cursor-pointer disabled:opacity-50"
            >
              {isDecrypting ? 'Decrypting...' : 'Decrypt & Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
