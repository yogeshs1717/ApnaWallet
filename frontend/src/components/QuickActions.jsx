import React, { useState } from 'react';
import { PlusCircle, ArrowDownRight, HandCoins, CreditCard, ArrowLeftRight, Info } from 'lucide-react';

export default function QuickActions() {
  const [activeNotice, setActiveNotice] = useState(null);

  const actions = [
    {
      id: 'add-cash',
      label: 'Add Cash',
      icon: PlusCircle,
      desc: 'Deposit physical cash from any income source',
      color: 'from-orange-500 to-amber-500',
      bgColor: 'bg-orange-50 text-orange-600 border-orange-100',
    },
    {
      id: 'expense',
      label: 'Expense',
      icon: ArrowDownRight,
      desc: 'Log daily spend with mandatory 3+ char note',
      color: 'from-rose-500 to-red-500',
      bgColor: 'bg-rose-50 text-rose-600 border-rose-100',
    },
    {
      id: 'lend',
      label: 'Lend',
      icon: HandCoins,
      desc: 'Track money given to others with expected return',
      color: 'from-amber-500 to-yellow-600',
      bgColor: 'bg-amber-50 text-amber-700 border-amber-100',
    },
    {
      id: 'credit',
      label: 'Credit',
      icon: CreditCard,
      desc: 'Manage borrowed funds and repayment tracking',
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    {
      id: 'transfer',
      label: 'Transfer',
      icon: ArrowLeftRight,
      desc: 'Move funds between Cash and Bank accounts',
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
  ];

  const handleActionClick = (action) => {
    setActiveNotice(`Action "${action.label}": ${action.desc}. (Backend API integration will be enabled in upcoming database models milestone).`);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase">
          Quick Actions
        </h3>
        <span className="text-xs text-slate-400">Tap to record transaction</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              onClick={() => handleActionClick(act)}
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-100 hover:border-amber-300 hover:shadow-md transition-all group cursor-pointer bg-slate-50/50 hover:bg-white text-center"
            >
              <div className={`w-11 h-11 rounded-2xl ${act.bgColor} flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110 shadow-xs`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-800 group-hover:text-amber-800">
                {act.label}
              </span>
            </button>
          );
        })}
      </div>

      {activeNotice && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 animate-in fade-in">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{activeNotice}</p>
          </div>
          <button
            onClick={() => setActiveNotice(null)}
            className="text-amber-700 hover:text-amber-900 font-bold ml-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
