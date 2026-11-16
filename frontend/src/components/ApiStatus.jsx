import React, { useState, useEffect } from 'react';
import { getBackendHealth } from '../api/client';
import { CheckCircle2, AlertTriangle, RefreshCw, Server } from 'lucide-react';

export default function ApiStatus() {
  const [status, setStatus] = useState('loading'); // 'loading' | 'connected' | 'error'
  const [data, setData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [latency, setLatency] = useState(null);

  const checkConnection = async () => {
    setStatus('loading');
    setErrorMessage('');
    const startTime = performance.now();
    try {
      const response = await getBackendHealth();
      const endTime = performance.now();
      setData(response);
      setLatency(Math.round(endTime - startTime));
      setStatus('connected');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Backend API Connection
              </span>
              {status === 'connected' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                  Live {latency ? `(${latency}ms)` : ''}
                </span>
              )}
              {status === 'loading' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Connecting...
                </span>
              )}
              {status === 'error' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Offline
                </span>
              )}
            </div>
            
            <p className="text-xs text-slate-600 mt-0.5">
              {status === 'connected' && (
                <span>Connected to <strong>{data?.application || 'ApnaWallet'}</strong> Django API (<code>/api/health/</code>)</span>
              )}
              {status === 'loading' && (
                <span>Probing Django service at <code>http://127.0.0.1:8000</code>...</span>
              )}
              {status === 'error' && (
                <span className="text-rose-600 font-medium">{errorMessage}</span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={checkConnection}
          disabled={status === 'loading'}
          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          title="Retry backend connection check"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${status === 'loading' ? 'animate-spin' : ''}`} />
          Verify Connection
        </button>
      </div>
    </div>
  );
}
