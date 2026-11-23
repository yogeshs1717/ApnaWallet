import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import Dashboard from './components/Dashboard';
import ActivityPage from './pages/ActivityPage';
import LendingPage from './pages/LendingPage';
import CreditPage from './pages/CreditPage';
import PlaceholderView from './pages/PlaceholderView';
import PortfolioPage from './pages/PortfolioPage';
import BudgetsPage from './pages/BudgetsPage';
import ReportsPage from './pages/ReportsPage';
import AuthModal from './components/auth/AuthModal';

const VALID_TABS = ['home', 'activity', 'lending', 'credit', 'portfolio', 'reports', 'budgets', 'more'];

function getInitialTab() {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
    if (VALID_TABS.includes(hash)) {
      return hash;
    }
    const saved = localStorage.getItem('apna_active_tab');
    if (VALID_TABS.includes(saved)) {
      return saved;
    }
  }
  return 'home';
}

function MainApp() {
  const [activeTab, setActiveTabState] = useState(getInitialTab);
  const [expenseOpenSignal, setExpenseOpenSignal] = useState(0);
  const { authView, setAuthView } = useAuth();

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('apna_active_tab', tab);
        window.location.hash = `#/${tab}`;
      } catch {}
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      if (VALID_TABS.includes(hash)) {
        setActiveTabState(hash);
        try {
          localStorage.setItem('apna_active_tab', hash);
        } catch {}
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Reset token URL query detection (e.g. from password recovery email link)
  const [resetParams, setResetParams] = useState({ uid: '', token: '' });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      let uid = urlParams.get('uid');
      let token = urlParams.get('token');

      // Also check hash in case query parameters are in the hash (e.g. /#/?uid=... or /#reset-password?uid=...)
      if (!uid || !token) {
        const hash = window.location.hash || '';
        const qIndex = hash.indexOf('?');
        if (qIndex !== -1) {
          const hashParams = new URLSearchParams(hash.slice(qIndex));
          uid = uid || hashParams.get('uid');
          token = token || hashParams.get('token');
        }
      }

      if (uid && token) {
        setResetParams({ uid, token });
        setAuthView('reset');
      }
    }
  }, [setAuthView]);

  return (
    <>
      <AppLayout activeTab={activeTab} onSelectTab={setActiveTab} onOpenExpense={() => {
        setActiveTab('home');
        setExpenseOpenSignal((value) => value + 1);
      }}>
        {activeTab === 'home'     ? <Dashboard onNavigateTab={setActiveTab} expenseOpenSignal={expenseOpenSignal} /> :
         activeTab === 'activity' ? <ActivityPage /> :
         activeTab === 'lending'  ? <LendingPage /> :
         activeTab === 'credit'   ? <CreditPage /> :
         activeTab === 'portfolio' ? <PortfolioPage /> :
         activeTab === 'reports' ? <ReportsPage /> :
         activeTab === 'budgets' ? <BudgetsPage /> :
                                    <PlaceholderView section={activeTab} />}
      </AppLayout>

      {/* Authentication Modal / Mobile Sheet */}
      {authView && (
        <AuthModal
          initialView={authView}
          initialUid={resetParams.uid}
          initialToken={resetParams.token}
          onClose={() => setAuthView(null)}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
