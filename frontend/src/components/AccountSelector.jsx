import React, { useState } from 'react';
import { ChevronDown, Wallet, ShieldCheck } from 'lucide-react';

export default function AccountSelector({ 
  accounts = [], 
  selectedAccount = null, 
  onSelectAccount 
}) {
  const [isOpen, setIsOpen] = useState(false);

  const activeAccountName = selectedAccount?.name || 'Personal';
  const displayAccounts = accounts.length > 0 
    ? accounts 
    : [{ id: 'personal-fallback', name: 'Personal', is_default: true, cash_balance: '0.00', bank_balance: '0.00' }];

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-stone-200/80 bg-white px-4 py-1.5 text-xs font-bold text-[#24151B] shadow-2xs hover:border-[#FF902B]/40 active:scale-95 transition-all cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="w-5 h-5 rounded-full bg-[#FFF0E2] text-[#FF902B] flex items-center justify-center">
          <Wallet className="w-3 h-3" />
        </div>
        <span>{activeAccountName}</span>
        {selectedAccount?.is_default && (
          <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E4F5EE] text-[#075743]">
            DEFAULT
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 sm:left-0 mt-2 w-64 rounded-3xl bg-white border border-stone-100 shadow-2xl z-30 p-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 border-b border-stone-100">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                Select Financial Account
              </p>
            </div>
            
            <div className="py-1 space-y-1">
              {displayAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    onSelectAccount?.(acc);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                    acc.id === selectedAccount?.id ? 'bg-[#FFF0E2] text-[#B85700] font-bold' : 'hover:bg-stone-50 text-[#24151B]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#FAF6F0] text-[#FF902B] flex items-center justify-center font-extrabold text-[11px]">
                      {acc.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-[#24151B]">{acc.name}</p>
                      <p className="text-[10px] text-stone-400">
                        {acc.is_default ? 'Default Account' : 'Secondary'}
                      </p>
                    </div>
                  </div>
                  {acc.is_default && (
                    <ShieldCheck className="w-4 h-4 text-[#075743]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
