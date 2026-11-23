/**
 * TransferModal.jsx
 * Prompt 04 — Milestone 6: Cash ↔ Bank Transfer
 *
 * Moves money between Cash and Bank balances.
 * Total available balance does NOT change — this is NOT income.
 * Atomically debits source and credits destination on the backend.
 */
import React, { useState, useRef } from 'react';
import { X, ArrowLeftRight, Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { createTransfer } from '../../api/client';

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function TransferModal({ accountId, cashBalance, bankBalance, onSuccess, onClose }) {
  const [form, setForm] = useState({
    amount: '',
    balance_type: 'CASH',          // source
    note: 'Cash to Bank transfer',  // default note
    date: today(),
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [serverError, setServerError] = useState('');
  const submitting = useRef(false);

  const destination = form.balance_type === 'CASH' ? 'BANK' : 'CASH';
  const sourceLabel = form.balance_type === 'CASH' ? 'Cash' : 'Bank';
  const destLabel = destination === 'CASH' ? 'Cash' : 'Bank';
  const sourceBalance = form.balance_type === 'CASH' ? cashBalance : bankBalance;

  function validate() {
    const e = {};
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) {
      e.amount = 'Enter a valid positive amount.';
    } else if (amt > parseFloat(sourceBalance || 0)) {
      e.amount = `Insufficient ${sourceLabel} balance (₹${parseFloat(sourceBalance || 0).toFixed(2)}).`;
    }
    if (!form.note || form.note.trim().length < 3) {
      e.note = 'Note must be at least 3 characters.';
    }
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting.current) return;

    const ev = validate();
    if (Object.keys(ev).length) { setErrors(ev); return; }

    submitting.current = true;
    setStatus('loading');
    setErrors({});
    setServerError('');

    try {
      const result = await createTransfer({
        account_id: accountId,
        amount: form.amount,
        source_balance_type: form.balance_type,
        balance_type: form.balance_type,
        destination_balance_type: destination,
        note: form.note.trim(),
        date: form.date,
      });
      setStatus('success');
      onSuccess(result.account, result.transaction);
    } catch (err) {
      setStatus('error');
      setServerError(err.message || 'Transfer failed. Please try again.');
    } finally {
      submitting.current = false;
    }
  }

  // Auto-update note when source changes
  function toggleSource() {
    const newSrc = form.balance_type === 'CASH' ? 'BANK' : 'CASH';
    setForm((f) => ({
      ...f,
      balance_type: newSrc,
      note: newSrc === 'CASH' ? 'Cash to Bank transfer' : 'Bank to Cash withdrawal',
    }));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <ArrowLeftRight className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Transfer Funds</h2>
              <p className="text-xs text-slate-500">Move between Cash and Bank</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {status === 'success' ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-green-50 mx-auto flex items-center justify-center">
              <CheckCircle className="w-9 h-9 text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Transfer Complete!</h3>
            <p className="text-sm text-slate-500">Your total balance is unchanged.</p>
            <button onClick={onClose} className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold shadow cursor-pointer">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {serverError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Total balance info */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Total available balance stays the same after a transfer.</span>
            </div>

            {/* Direction selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Transfer Direction</label>
              <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50">
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-700">{sourceLabel}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">₹{parseFloat(sourceBalance || 0).toFixed(2)}</p>
                </div>
                <button
                  type="button" onClick={toggleSource}
                  className="p-2 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                  title="Swap direction"
                >
                  <ArrowLeftRight className="w-5 h-5 text-emerald-600" />
                </button>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-700">{destLabel}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">receives</p>
                </div>
              </div>
              <p className="mt-1.5 text-[10px] text-slate-400 text-center">
                Tap ⇄ to swap direction
              </p>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number" min="0.01" step="0.01" placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className={`w-full pl-7 pr-4 py-3 rounded-xl border text-sm font-semibold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition ${errors.amount ? 'border-red-400' : 'border-slate-200'}`}
                />
              </div>
              {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Note</label>
              <input
                type="text" placeholder="Min 3 characters…"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                className={`w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition ${errors.note ? 'border-red-400' : 'border-slate-200'}`}
              />
              {errors.note && <p className="mt-1 text-xs text-red-600">{errors.note}</p>}
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
              <input
                type="date" value={form.date} max={today()}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition"
              />
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={status === 'loading'}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold shadow hover:from-emerald-600 hover:to-teal-700 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {status === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Transferring…</>
              ) : (
                <><ArrowLeftRight className="w-4 h-4" /> Transfer {sourceLabel} → {destLabel}</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
