import React, { useState } from 'react';
import AppLayout from './components/AppLayout';
import Dashboard from './components/Dashboard';
import PlaceholderView from './pages/PlaceholderView';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <AppLayout activeTab={activeTab} onSelectTab={setActiveTab}>
      {activeTab === 'home' ? (
        <Dashboard />
      ) : (
        <PlaceholderView section={activeTab} />
      )}
    </AppLayout>
  );
}
