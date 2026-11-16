import React, { useState } from 'react';
import AccountSelector from './AccountSelector';
import BalanceCard from './BalanceCard';
import QuickActions from './QuickActions';
import RecentTransactions from './RecentTransactions';
import ApiStatus from './ApiStatus';

export default function Dashboard() {
  const [selectedAccount, setSelectedAccount] = useState('Personal');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Greeting & Account Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-amber-100/60">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Financial Overview
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Welcome back to your personal financial hub.
          </p>
        </div>
        
        <AccountSelector 
          selectedAccount={selectedAccount} 
          onSelectAccount={setSelectedAccount} 
        />
      </div>

      {/* Backend Live Health Probe */}
      <ApiStatus />

      {/* Consolidated Balance Card (Total, Cash, Bank in INR) */}
      <BalanceCard 
        totalBalance={0.0} 
        cashBalance={0.0} 
        bankBalance={0.0} 
        currency="₹"
      />

      {/* Quick Action Buttons */}
      <QuickActions />

      {/* Recent Transactions List / Placeholder */}
      <RecentTransactions transactions={[]} />
    </div>
  );
}
