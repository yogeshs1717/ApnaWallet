/**
 * RepayCreditModal.jsx
 * Prompt 05 — Milestone 7: Credit Repayment
 *
 * Deducts money from Cash or Bank to pay down an existing liability.
 * Crucial accounting rule: Paying off debt is liability extinguishment, NOT an ordinary expense!
 */
import React, { useState, useRef } from 'react';
import { X, CheckCircle, Wallet, Landmark, Loader2, AlertCircle, Info } from 'lucide-react';
import { repayCredit } from '../../api/client';

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function RepayCreditModal({ credit, cashBalance, bankBalance, onSuccess, onClose }) {
  const maxRepay = parseFloat(credit.outstanding_amount || 0);

  const [form, setForm] = useState({
    amount: '',
    payment_source: 'CASH',
    date: today(),
    note: '',
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [serverError, setServerError] = useState('');
  const submitting = useRef(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const selectedSourceBal = form.payment_source === 'CASH' ? parseFloat(cashBalance || 0) : parseFloat(bankBalance || 0);

  function validate() {
    const e = {};
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) {
      e.amount = 'Enter a valid positive repayment amount.';
    } else if (amt > maxRepay) {
      e.amount = `Repayment cannot exceed debt balance of ₹${maxRepay.toFixed(2)}.`;
    } else if (amt > selectedSourceBal) {
      e.amount = `Insufficient ${form.payment_source.toLowerCase()} balance (₹${selectedSourceBal.toFixed(2)} available).`;
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
      const result = await repayCredit(credit.id, {
        amount: form.amount,
        payment_source: form.payment_source,
        date: form.date,
        note: form.note.trim(),
      });
      setStatus('success');
      onSuccess(result.account, result.credit, result.repayment);
    } catch (err) {
      setStatus('error');
      setServerError(err.message || 'Failed to record credit repayment.');
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
          <div>
            <h2 className="text-base font-bold text-slate-900">Repay Credit / Debt</h2>
            <p className="text-xs text-slate-500">To {credit.creditor_name}</p>
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
            <h3 className="text-lg font-bold text-slate-900">Debt Repaid!</h3>
            <p className="text-sm text-slate-500">
              Your balance was deducted and liability reduced.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-bold shadow cursor-pointer"
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

            {/* Current Debt Summary */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-xs text-slate-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Creditor:</span>
                <span className="font-bold text-slate-900">{credit.creditor_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Original Obligation:</span>
                <span className="font-semibold">₹{parseFloat(credit.original_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-900 font-bold">Outstanding Debt:</span>
                <span className="text-blue-900 font-bold text-sm">₹{maxRepay.toFixed(2)}</span>
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
                  onClick={() => setForm((f) => ({ ...f, amount: String(Math.min(maxRepay, selectedSourceBal)) }))}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Pay Max (₹{Math.min(maxRepay, selectedSourceBal).toFixed(2)})
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
                  className={`w-full pl-7 pr-4 py-3 rounded-xl border text-sm font-semibold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition ${errors.amount ? 'border-red-400' : 'border-slate-200'}`}
                />
              </div>
              {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
            </div>

            {/* Payment Source */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pay From</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'CASH', label: 'Cash Balance', bal: cashBalance, Icon: Wallet },
                  { value: 'BANK', label: 'Bank Balance', bal: bankBalance, Icon: Landmark },
                ].map(({ value, label, bal, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, payment_source: value }))}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition cursor-pointer ${
                      form.payment_source === value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${form.payment_source === value ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div className="text-left">
                      <p className={`text-xs font-bold ${form.payment_source === value ? 'text-blue-700' : 'text-slate-700'}`}>{label}</p>
                      <p className="text-[10px] text-slate-400">₹{parseFloat(bal || 0).toFixed(2)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Date</label>
              <input
                type="date"
                value={form.date}
                max={today()}
                onChange={set('date')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition"
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Note (Optional)</label>
              <input
                type="text"
                placeholder={`Repayment to ${credit.creditor_name}`}
                value={form.note}
                onChange={set('note')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-bold shadow hover:from-blue-600 hover:to-indigo-700 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {status === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Recording Repayment…</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Confirm Debt Repayment</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
