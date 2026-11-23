import React from 'react';
import logoImg from '../assets/logo.jpg';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from './NotificationCenter';
import {
  Home,
  ArrowLeftRight,
  Briefcase,
  BarChart3,
  User,
  LogOut,
  HandCoins,
  CreditCard,
  PieChart
} from 'lucide-react';

export default function Navbar({ activeTab = 'home', onSelectTab, onOpenExpense }) {
  const { user, isAuthenticated, logout, setAuthView } = useAuth();

  // Desktop navigation items (all modules accessible directly)
  const desktopNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'activity', label: 'Activity', icon: ArrowLeftRight },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
    { id: 'budgets', label: 'Budgets', icon: PieChart },
    { id: 'lending', label: 'Lending', icon: HandCoins },
    { id: 'credit', label: 'Credit', icon: CreditCard },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'more', label: 'Profile', icon: User },
  ];

  // Mobile Floating Dock (5 clean destinations matching Taxmate reference)
  const mobileNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'activity', label: 'Activity', icon: ArrowLeftRight },
    { id: 'portfolio', label: 'Wallet', icon: Briefcase },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'more', label: 'Profile', icon: User },
  ];

  return (
    <>
      {/* Top Header Bar for Desktop & Mobile */}
      <header className="sticky top-0 z-40 bg-[#F5EFE3]/90 backdrop-blur-md border-b border-stone-200/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">

            {/* Brand Logo & Tagline */}
            <div 
              className="flex items-center space-x-3 cursor-pointer group select-none" 
              onClick={() => onSelectTab('home')}
            >
              <div className="w-10 h-10 rounded-2xl overflow-hidden bg-[#331B24] flex items-center justify-center shadow-md shadow-[#331B24]/10 border border-[#462532] shrink-0">
                <img
                  src={logoImg}
                  alt="ApnaWallet Logo"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
                />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xl font-extrabold tracking-tight text-[#24151B]">
                    Apna<span className="text-[#FF902B]">Wallet</span>
                  </span>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-[#C5F52A] text-[#1C1014]">
                    PRO
                  </span>
                </div>
                <p className="text-[10px] font-semibold text-stone-400 tracking-wide">
                  Your Money. Your Rules.
                </p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-1 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-stone-200/70 shadow-2xs">
              {desktopNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#331B24] text-[#FAF6F0] shadow-xs'
                        : 'text-stone-600 hover:text-[#24151B] hover:bg-stone-100/60'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#C5F52A]' : 'text-stone-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Action Icons & Auth Controls */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {isAuthenticated ? (
                <div className="flex items-center space-x-2">
                  <NotificationCenter onNavigate={onSelectTab} onOpenExpense={onOpenExpense} />

                  <div 
                    onClick={() => onSelectTab('more')}
                    className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white border border-stone-200/80 shadow-2xs cursor-pointer hover:border-[#FF902B]/40 active:scale-95 transition-all"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#D2B4ED] text-[#331B24] flex items-center justify-center text-xs font-black">
                      {user?.full_name?.charAt(0) || 'U'}
                    </div>
                    <span className="text-xs font-bold text-[#24151B] max-w-[100px] truncate">
                      {user?.full_name?.split(' ')[0] || user?.email}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={logout}
                    className="p-2.5 rounded-full bg-white text-stone-400 hover:text-rose-600 border border-stone-200/80 shadow-2xs transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setAuthView('login')}
                    className="px-4 py-2 rounded-full text-xs font-bold text-[#24151B] hover:bg-white/80 transition-all cursor-pointer"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthView('register')}
                    className="px-5 py-2 rounded-full text-xs font-extrabold bg-[#C5F52A] text-[#1C1014] shadow-xs hover:bg-[#B4E81E] active:scale-95 transition-all cursor-pointer"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Floating Pill Bottom Navigation Dock for Mobile (Matching Reference) */}
      <nav 
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-xl border border-stone-200/80 shadow-[0_16px_45px_rgba(51,27,36,0.18)] rounded-full px-3 py-1.5 max-w-[92vw] sm:max-w-md w-auto"
      >
        <div className="flex items-center space-x-1 sm:space-x-2">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            // Also highlight 'more' if on lending, credit, or budgets on mobile
            const isActive = activeTab === item.id || (item.id === 'more' && ['lending', 'credit', 'budgets'].includes(activeTab));
            
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center space-x-1.5 px-3.5 py-2.5 rounded-full transition-all cursor-pointer select-none active:scale-90 ${
                  isActive
                    ? 'bg-[#331B24] text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-700'
                }`}
                aria-label={item.label}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#C5F52A]' : 'text-stone-400'}`} />
                {isActive && (
                  <span className="text-xs font-extrabold tracking-tight text-white pr-1 animate-in fade-in duration-150">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
