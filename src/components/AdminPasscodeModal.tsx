import React, { useState } from 'react';
import { KeyRound, Lock, X } from 'lucide-react';

interface AdminPasscodeModalProps {
  expectedPasscode: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const AdminPasscodeModal: React.FC<AdminPasscodeModalProps> = ({
  expectedPasscode,
  onSuccess,
  onClose,
}) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === expectedPasscode) {
      setError(null);
      onSuccess();
    } else {
      setError('Invalid creator passcode. Check ADMIN_PASSCODE in src/content/site-config.txt.');
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
                Retunda Creator Gate
              </p>
              <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
                Unlock Page Builder &amp; Pin Studio
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

        <p className="text-xs text-[#57534E] leading-relaxed">
          Public visitors from Pinterest only see the read-only shopping storefront. Enter your creator passcode (set in <code className="font-mono text-[#1C1917]">src/content/site-config.txt</code>) to unlock the <code className="font-mono text-[#1C1917]">.txt</code> Page Builder and 2:3 Pin Studio for this session.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-[#57534E] mb-1.5">
              Creator Passcode
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
                placeholder="Enter passcode..."
                autoFocus
                className="w-full bg-[#F3F1EC] border border-[#E7E5E0] pl-9 pr-3 py-2.5 font-mono text-sm text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
              />
            </div>
            {error && (
              <p className="text-xs text-[#B91C1C] mt-1.5 font-medium">{error}</p>
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
              className="px-5 py-2.5 text-xs font-mono uppercase tracking-wider bg-[#1C1917] text-[#FAF9F6] hover:bg-[#B45309] transition-colors cursor-pointer"
            >
              Unlock Creator Studio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
