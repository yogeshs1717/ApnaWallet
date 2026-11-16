import React from 'react';
import { Receipt, Clock, Sparkles } from 'lucide-react';

export default function RecentTransactions({ transactions = [] }) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
            <Receipt className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase">
            Recent Transactions
          </h3>
        </div>
        <span className="text-xs text-slate-400">All Accounts</span>
      </div>

      {transactions.length === 0 ? (
        <div className="py-10 px-4 text-center border-2 border-dashed border-slate-100 rounded-2xl">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800">No Transactions Recorded Yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            When you add cash, log an expense with notes (min 3 characters), or make transfers, your financial activity will appear here in real-time.
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Backend transaction ledger ready for PostgreSQL models
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* List items will render here once transactions exist */}
        </div>
      )}
    </div>
  );
}
