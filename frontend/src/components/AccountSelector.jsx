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
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-amber-200/80 shadow-xs hover:border-amber-300 text-slate-800 text-sm font-semibold transition-all focus:outline-hidden cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-xs">
          <Wallet className="w-3.5 h-3.5" />
        </div>
        <span>{activeAccountName}</span>
        {selectedAccount?.is_default && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
            Default
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 sm:left-0 mt-2 w-64 rounded-2xl bg-white border border-slate-100 shadow-xl z-30 py-2 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Financial Accounts
              </p>
            </div>
            
            <div className="p-1 space-y-1">
              {displayAccounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => {
                    onSelectAccount?.(acc);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                    acc.id === selectedAccount?.id ? 'bg-amber-50/80 text-orange-950 font-bold' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[10px]">
                      {acc.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{acc.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {acc.is_default ? 'Default Account' : 'Secondary'}
                      </p>
                    </div>
                  </div>
                  {acc.is_default && (
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-1 pt-1 border-t border-slate-100 px-3 py-1 text-[11px] text-amber-800 bg-amber-50/50">
              💡 Multiple accounts per user supported in PostgreSQL schema.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
