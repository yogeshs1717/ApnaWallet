import React from 'react';
import logoImg from '../assets/logo.jpg';
import { 
  Home, 
  ArrowLeftRight, 
  BarChart3, 
  Briefcase, 
  MoreHorizontal,
  Bell
} from 'lucide-react';

export default function Navbar({ activeTab = 'home', onSelectTab }) {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'activity', label: 'Activity', icon: ArrowLeftRight },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
    { id: 'more', label: 'More', icon: MoreHorizontal },
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
              <div>
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
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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

            {/* Right Action Icons */}
            <div className="flex items-center space-x-2">
              <button 
                title="Notifications"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Fintech-friendly) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg">
        <div className="grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-medium transition-colors cursor-pointer ${
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
