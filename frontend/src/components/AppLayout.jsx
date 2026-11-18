import React from 'react';
import Navbar from './Navbar';

export default function AppLayout({ activeTab, onSelectTab, onOpenExpense, children }) {
  return (
    <div className="min-h-screen bg-[#FCFAF6] flex flex-col font-sans text-slate-800 antialiased selection:bg-orange-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar activeTab={activeTab} onSelectTab={onSelectTab} onOpenExpense={onOpenExpense} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8 overflow-x-hidden">
        {children}
      </main>

      {/* Footer */}
      <footer className="hidden md:block border-t border-amber-100/60 bg-white/60 py-6 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} ApnaWallet. All rights reserved.</p>
          <p className="font-medium text-amber-800">
            Your Money. Your Rules. — Secured with PostgreSQL & Django
          </p>
        </div>
      </footer>
    </div>
  );
}
