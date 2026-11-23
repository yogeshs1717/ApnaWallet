import React, { useState, useEffect } from 'react';
import { getBackendHealth } from '../api/client';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ApiStatus() {
  const [status, setStatus] = useState('idle'); // 'idle' | 'connected' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  const checkConnection = async () => {
    try {
      await getBackendHealth();
      setStatus('connected');
      setErrorMessage('');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message || 'Unable to connect to ApnaWallet backend service.');
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  // When connected or probing normally, run completely in the background without UI clutter
  if (status !== 'error') {
    return null;
  }

  // Only display a compact alert if the backend server is actually unreachable
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 animate-in fade-in">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
        <span className="font-medium">
          {errorMessage || 'Server connection issue. Please check your network.'}
        </span>
      </div>
      <button
        onClick={checkConnection}
        className="inline-flex items-center self-start sm:self-auto px-3 py-1 rounded-xl bg-white hover:bg-rose-100 text-rose-800 font-bold border border-rose-200 shadow-2xs transition-colors cursor-pointer"
      >
        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
        Retry
      </button>
    </div>
  );
}
