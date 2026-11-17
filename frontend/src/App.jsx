import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import Dashboard from './components/Dashboard';
import ActivityPage from './pages/ActivityPage';
import LendingPage from './pages/LendingPage';
import CreditPage from './pages/CreditPage';
import PlaceholderView from './pages/PlaceholderView';
import PortfolioPage from './pages/PortfolioPage';
import AuthModal from './components/auth/AuthModal';

function MainApp() {
  const [activeTab, setActiveTab] = useState('home');
  const { authView, setAuthView } = useAuth();

  // Reset token URL query detection (e.g. from password recovery email link)
  const [resetParams, setResetParams] = useState({ uid: '', token: '' });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const uid = urlParams.get('uid');
      const token = urlParams.get('token');
      if (uid && token) {
        setResetParams({ uid, token });
        setAuthView('reset');
      }
    }
  }, [setAuthView]);

  return (
    <>
      <AppLayout activeTab={activeTab} onSelectTab={setActiveTab}>
        {activeTab === 'home'     ? <Dashboard onNavigateTab={setActiveTab} /> :
         activeTab === 'activity' ? <ActivityPage /> :
         activeTab === 'lending'  ? <LendingPage /> :
         activeTab === 'credit'   ? <CreditPage /> :
         activeTab === 'portfolio' ? <PortfolioPage /> :
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
