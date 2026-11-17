/**
 * AddCashModal.jsx
 * Prompt 04 — Milestone 4: Add Cash entry form
 *
 * Receives new money (pocket money, gift, freelance, refund, etc.)
 * into Cash or Bank balance.  This is NOT a transfer — it creates
 * entirely new money for the user's account.
 */
import React, { useState, useRef } from 'react';
import { X, PlusCircle, Wallet, Landmark, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { addCash } from '../../api/client';

const SOURCE_SUGGESTIONS = ['Pocket money', 'Gift', 'Freelance', 'Refund', 'Salary', 'Other'];

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function AddCashModal({ accountId, onSuccess, onClose }) {
  const [form, setForm] = useState({
    amount: '',
    note: '',
    balance_type: 'CASH',
    date: today(),
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [serverError, setServerError] = useState('');
  // Prevents duplicate network requests if user double-clicks
  const submitting = useRef(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  // ── Client-side validation ──────────────────────────────────────────────────
  function validate() {
    const e = {};
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) {
      e.amount = 'Enter a valid positive amount.';
    }
    if (!form.note || form.note.trim().length < 3) {
      e.note = 'Source/description must be at least 3 characters.';
    }
    if (!form.date) e.date = 'Date is required.';
    return e;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting.current) return; // block double-submit

    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }

    submitting.current = true;
    setStatus('loading');
    setErrors({});
    setServerError('');

    try {
      const result = await addCash({
        account_id: accountId,
        amount: form.amount,
        balance_type: form.balance_type,
        note: form.note.trim(),
        date: form.date,
      });
      setStatus('success');
      // Give parent fresh account + new transaction for dashboard refresh
      onSuccess(result.account, result.transaction);
    } catch (err) {
      setStatus('error');
      setServerError(err.message || 'Failed to add cash. Please try again.');
    } finally {
      submitting.current = false;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-orange-500/10 to-amber-500/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-sm">
              <PlusCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Cash</h2>
              <p className="text-xs text-slate-500">Record money received</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success state */}
        {status === 'success' ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-green-50 mx-auto flex items-center justify-center">
              <CheckCircle className="w-9 h-9 text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Cash Added!</h3>
            <p className="text-sm text-slate-500">Your balance has been updated.</p>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold shadow cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Server error banner */}
            {serverError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={set('amount')}
                  className={`w-full pl-7 pr-4 py-3 rounded-xl border text-sm font-semibold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition ${errors.amount ? 'border-red-400' : 'border-slate-200'}`}
                />
              </div>
              {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
            </div>

            {/* Source / Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Source / Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Pocket money, Gift, Freelance..."
                value={form.note}
                onChange={set('note')}
                className={`w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition ${errors.note ? 'border-red-400' : 'border-slate-200'}`}
              />
              {errors.note && <p className="mt-1 text-xs text-red-600">{errors.note}</p>}
              {/* Quick suggestion chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SOURCE_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, note: s }))}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Destination: Cash or Bank */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Destination</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'CASH', label: 'Cash', Icon: Wallet, desc: 'Physical wallet' },
                  { value: 'BANK', label: 'Bank', Icon: Landmark, desc: 'Bank account' },
                ].map(({ value, label, Icon, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, balance_type: value }))}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition cursor-pointer ${
                      form.balance_type === value
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${form.balance_type === value ? 'text-orange-600' : 'text-slate-400'}`} />
                    <div className="text-left">
                      <p className={`text-xs font-bold ${form.balance_type === value ? 'text-orange-700' : 'text-slate-700'}`}>{label}</p>
                      <p className="text-[10px] text-slate-400">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
              <input
                type="date"
                value={form.date}
                max={today()}
                onChange={set('date')}
                className={`w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition ${errors.date ? 'border-red-400' : 'border-slate-200'}`}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold shadow hover:from-orange-600 hover:to-amber-600 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {status === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Adding Cash…</>
              ) : (
                <><PlusCircle className="w-4 h-4" /> Add Cash</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
