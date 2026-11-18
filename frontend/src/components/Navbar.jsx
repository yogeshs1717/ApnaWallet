import React from 'react';
import logoImg from '../assets/logo.jpg';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from './NotificationCenter';
import {
  Home,
  ArrowLeftRight,
  HandCoins,
  CreditCard,
  Briefcase,
  BarChart3,
  MoreHorizontal,
  WalletCards,
  LogOut,
  User as UserIcon,
  LogIn
} from 'lucide-react';

export default function Navbar({ activeTab = 'home', onSelectTab, onOpenExpense }) {
  const { user, isAuthenticated, logout, setAuthView } = useAuth();

  // Desktop navigation items
  const desktopNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'activity', label: 'Activity', icon: ArrowLeftRight },
    { id: 'lending', label: 'Lending', icon: HandCoins },
    { id: 'credit', label: 'Credit', icon: CreditCard },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'budgets', label: 'Budgets', icon: WalletCards },
    { id: 'more', label: 'More', icon: MoreHorizontal },
  ];

  // Mobile bottom bar navigation (5 thumb-accessible items)
  const mobileNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'activity', label: 'Activity', icon: ArrowLeftRight },
    { id: 'lending', label: 'Lend', icon: HandCoins },
    { id: 'credit', label: 'Credit', icon: CreditCard },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'budgets', label: 'Budgets', icon: WalletCards },
  ];

  return (
    <>
      {/* Top Header Bar for Desktop & Mobile */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-100 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Brand Logo & Tagline */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab('home')}>
              <div className="w-10 h-10 rounded-2xl overflow-hidden bg-black flex items-center justify-center shadow-md shadow-orange-500/20 border border-amber-200/50 shrink-0 group">
                <img
                  src={logoImg}
                  alt="ApnaWallet Logo"
                  className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-200"
                />
              </div>
              <div className="max-[380px]:hidden">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xl font-black tracking-tight text-slate-900">
                    Apna<span className="text-orange-500">Wallet</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                    v0.1
                  </span>
                </div>
                <p className="text-[10px] font-medium text-slate-500 tracking-wide">
                  Your Money. Your Rules.
                </p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto px-2 md:flex">
              {desktopNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`flex shrink-0 items-center space-x-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                      isActive
                        ? 'bg-orange-50 text-orange-600 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-orange-500' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Action Icons & Auth Controls */}
            <div className="flex items-center space-x-2">
              {isAuthenticated ? (
                <div className="flex items-center space-x-2">
                  <NotificationCenter onNavigate={onSelectTab} onOpenExpense={onOpenExpense} />
                  <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200/60">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                      {user?.full_name?.charAt(0) || 'U'}
                    </div>
                    <span className="text-xs font-semibold text-slate-800 max-w-[120px] truncate">
                      {user?.full_name || user?.email}
                    </span>
                  </div>

                  <button
                    onClick={logout}
                    className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setAuthView('login')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setAuthView('register')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xs cursor-pointer"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md border-t border-slate-200 px-1.5 pt-1 shadow-lg">
        <div className="grid grid-cols-7 gap-0.5">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex min-h-11 flex-col items-center justify-center rounded-xl px-0.5 text-[10px] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1 ${
                  isActive
                    ? 'text-orange-600 font-bold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-orange-500 scale-110' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
