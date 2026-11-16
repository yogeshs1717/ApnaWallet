import React, { useState } from 'react';
import { ChevronDown, Wallet, Plus, ShieldCheck } from 'lucide-react';

export default function AccountSelector({ selectedAccount = 'Personal', onSelectAccount }) {
  const [isOpen, setIsOpen] = useState(false);

  const accounts = [
    { id: 'personal', name: 'Personal', type: 'Default Account', isDefault: true },
    { id: 'business', name: 'Business', type: 'Secondary', isDefault: false, disabled: true },
  ];

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
        <span>{selectedAccount}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
          Default
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white border border-slate-100 shadow-xl z-30 py-2 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Select Financial Account
              </p>
            </div>
            
            <div className="p-1 space-y-1">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  disabled={acc.disabled}
                  onClick={() => {
                    if (!acc.disabled) {
                      onSelectAccount?.(acc.name);
                      setIsOpen(false);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                    acc.disabled
                      ? 'opacity-40 cursor-not-allowed bg-slate-50'
                      : 'hover:bg-amber-50 text-slate-800 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[10px]">
                      {acc.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{acc.name}</p>
                      <p className="text-[10px] text-slate-500">{acc.type}</p>
                    </div>
                  </div>
                  {acc.isDefault && (
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-1 pt-1 border-t border-slate-100 px-3 py-1 text-[11px] text-amber-800 bg-amber-50/50">
              💡 Multiple accounts per user will be enabled in future database milestones.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
