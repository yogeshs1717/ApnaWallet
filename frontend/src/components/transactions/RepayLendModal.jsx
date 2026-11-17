/**
 * RepayLendModal.jsx
 * Prompt 05 — Milestone 4: Record partial or full lending repayment
 *
 * Reduces borrower's outstanding debt.
 * Credits chosen Cash or Bank balance.
 * Recovers principal — does NOT count as income!
 */
import React, { useState, useRef } from 'react';
import { X, CheckCircle, Wallet, Landmark, Loader2, AlertCircle, Info } from 'lucide-react';
import { repayLending } from '../../api/client';

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function RepayLendModal({ lending, onSuccess, onClose }) {
  const maxRepay = parseFloat(lending.outstanding_amount || 0);

  const [form, setForm] = useState({
    amount: '',
    balance_type: 'CASH',
    date: today(),
    note: '',
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [serverError, setServerError] = useState('');
  const submitting = useRef(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function validate() {
    const e = {};
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) {
      e.amount = 'Enter a valid positive repayment amount.';
    } else if (amt > maxRepay) {
      e.amount = `Repayment cannot exceed outstanding balance of ₹${maxRepay.toFixed(2)}.`;
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
      const result = await repayLending(lending.id, {
        amount: form.amount,
        balance_type: form.balance_type,
        date: form.date,
        note: form.note.trim(),
      });
      setStatus('success');
      onSuccess(result.account, result.lending, result.repayment);
    } catch (err) {
      setStatus('error');
      setServerError(err.message || 'Failed to record repayment.');
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
          <div>
            <h2 className="text-base font-bold text-slate-900">Record Repayment</h2>
            <p className="text-xs text-slate-500">From {lending.borrower_name}</p>
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
            <h3 className="text-lg font-bold text-slate-900">Repayment Recorded!</h3>
            <p className="text-sm text-slate-500">
              Recovered principal has been credited to your balance.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold shadow cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {serverError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Current Loan Summary */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-slate-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Borrower:</span>
                <span className="font-bold text-slate-900">{lending.borrower_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Original Loan:</span>
                <span className="font-semibold">₹{parseFloat(lending.original_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-800 font-bold">Outstanding Due:</span>
                <span className="text-amber-800 font-bold text-sm">₹{maxRepay.toFixed(2)}</span>
              </div>
            </div>

            {/* Repayment Amount */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Repayment Amount (₹) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, amount: String(maxRepay) }))}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  Pay Full (₹{maxRepay.toFixed(2)})
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  min="0.01"
                  max={maxRepay}
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={set('amount')}
                  className={`w-full pl-7 pr-4 py-3 rounded-xl border text-sm font-semibold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition ${errors.amount ? 'border-red-400' : 'border-slate-200'}`}
                />
              </div>
              {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
            </div>

            {/* Received Into Balance */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Received Into</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'CASH', label: 'Cash', Icon: Wallet },
                  { value: 'BANK', label: 'Bank', Icon: Landmark },
                ].map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, balance_type: value }))}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition cursor-pointer ${
                      form.balance_type === value
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${form.balance_type === value ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className={`text-xs font-bold ${form.balance_type === value ? 'text-emerald-700' : 'text-slate-700'}`}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Repayment Date</label>
              <input
                type="date"
                value={form.date}
                max={today()}
                onChange={set('date')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition"
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Note (Optional)</label>
              <input
                type="text"
                placeholder={`Auto-note: "${lending.borrower_name} paid ₹..."`}
                value={form.note}
                onChange={set('note')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold shadow hover:from-emerald-600 hover:to-teal-700 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {status === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Recording Repayment…</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Confirm Repayment</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
