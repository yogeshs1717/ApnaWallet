import React from 'react';
import Navbar from './Navbar';

export default function AppLayout({ activeTab, onSelectTab, onOpenExpense, children }) {
  return (
    <div className="min-h-screen bg-[#F5EFE3] flex flex-col font-sans text-[#24151B] antialiased selection:bg-[#C5F52A] selection:text-[#1C1014]">
      {/* Top Navbar */}
      <Navbar activeTab={activeTab} onSelectTab={onSelectTab} onOpenExpense={onOpenExpense} />

      {/* Main Content Area — ample bottom padding (pb-28) to never obscure content behind the floating dock */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 pb-28 lg:pb-12">
        {children}
      </main>

      {/* Subtle Footer for Desktop */}
      <footer className="hidden lg:block border-t border-stone-200/50 py-6 text-center text-xs text-stone-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} ApnaWallet. All rights reserved.</p>
          <p className="font-semibold text-stone-500">
            Your Money. Your Rules. — Secured with PostgreSQL &amp; Django
          </p>
        </div>
      </footer>
    </div>
  );
}
