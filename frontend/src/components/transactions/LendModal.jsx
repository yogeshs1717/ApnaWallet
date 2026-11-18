/**
 * LendModal.jsx
 * Prompt 05 — Milestone 3: Lend Money Workflow
 *
 * Records money lent to an individual.
 * Deducts from Cash or Bank balance atomically.
 * Crucial accounting rule: Lending is an asset exchange, NOT an ordinary expense!
 */
import React, { useState, useRef } from 'react';
import { X, HandCoins, Wallet, Landmark, Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { createLend } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

function today() {
  return new Date().toISOString().split('T')[0];
}

const COMMON_BORROWERS = ['Ranjan', 'Rohan', 'Vikram', 'Sunita', 'Ankit', 'Friend'];

export default function LendModal({ accountId, onSuccess, onClose, cashBalance, bankBalance }) {
  const { selectedAccount } = useAuth();
  const cash = parseFloat(cashBalance ?? selectedAccount?.cash_balance ?? 0);
  const bank = parseFloat(bankBalance ?? selectedAccount?.bank_balance ?? 0);

  // Smart default: If Cash is empty but Bank has money, default to BANK
  const defaultSource = (cash <= 0 && bank > 0) ? 'BANK' : 'CASH';

  const [form, setForm] = useState({
    borrower_name: '',
    amount: '',
    balance_type: defaultSource,
    date: today(),
    note: '',
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [serverError, setServerError] = useState('');
  const submitting = useRef(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function validate() {
    const e = {};
    if (!form.borrower_name || !form.borrower_name.trim()) {
      e.borrower_name = 'Borrower name is mandatory.';
    }
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) {
      e.amount = 'Enter a valid positive amount.';
    } else {
      const selectedBal = form.balance_type === 'CASH' ? cash : bank;
      if (amt > selectedBal) {
        if (form.balance_type === 'CASH' && bank >= amt) {
          e.amount = `Insufficient Cash (₹${cash.toFixed(2)}). You have ₹${bank.toFixed(2)} in Bank — please select Bank below.`;
        } else {
          e.amount = `Insufficient ${form.balance_type === 'CASH' ? 'Cash' : 'Bank'} balance. Available: ₹${selectedBal.toFixed(2)}, requested: ₹${amt.toFixed(2)}.`;
        }
      }
    }
    if (!form.date) e.date = 'Date is required.';
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
      const result = await createLend({
        account_id: accountId || selectedAccount?.id,
        borrower_name: form.borrower_name.trim(),
        amount: form.amount,
        balance_type: form.balance_type,
        date: form.date,
        note: form.note.trim(),
      });
      setStatus('success');
      onSuccess(result.account, result.lending);
    } catch (err) {
      setStatus('error');
      setServerError(err.message || 'Failed to record loan. Please check your balance.');
    } finally {
      submitting.current = false;
    }
  }

  const enteredAmt = parseFloat(form.amount || 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center shadow-sm">
              <HandCoins className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Lend Money</h2>
              <p className="text-xs text-slate-500">Track money given to others</p>
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
            <h3 className="text-lg font-bold text-slate-900">Loan Recorded!</h3>
            <p className="text-sm text-slate-500">
              Deducted from your balance and added to your Money Lent receivables.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-sm font-bold shadow cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            {serverError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Financial Info Badge */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Lending reduces available cash/bank now and tracks a receivable asset. When repaid, it recovers principal without counting as taxable income.
              </span>
            </div>

            {/* Borrower Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Borrower Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Who are you lending to? (e.g. Ranjan)"
                value={form.borrower_name}
                onChange={set('borrower_name')}
                className={`w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition ${errors.borrower_name ? 'border-red-400' : 'border-slate-200'}`}
              />
              {errors.borrower_name && <p className="mt-1 text-xs text-red-600">{errors.borrower_name}</p>}

              {/* Quick suggestion chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {COMMON_BORROWERS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, borrower_name: name }))}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

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
                  step="any"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={set('amount')}
                  className={`w-full pl-7 pr-4 py-3 rounded-xl border text-sm font-semibold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition ${errors.amount ? 'border-red-400' : 'border-slate-200'}`}
                />
              </div>
              {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}

              {/* Smart auto-switch suggestion */}
              {enteredAmt > cash && bank >= enteredAmt && form.balance_type === 'CASH' && (
                <div className="mt-2 flex items-center justify-between rounded-xl bg-amber-50 p-2.5 text-xs text-amber-900 border border-amber-300">
                  <span>💡 Cash has ₹{cash.toFixed(2)}. Your Bank has ₹{bank.toFixed(2)}.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, balance_type: 'BANK' }));
                      setErrors((e) => ({ ...e, amount: undefined }));
                    }}
                    className="ml-2 px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition cursor-pointer"
                  >
                    Switch to Bank
                  </button>
                </div>
              )}
            </div>

            {/* Payment Source */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">Disburse from</label>
                <span className="text-[11px] text-slate-400">Total available: ₹{(cash + bank).toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'CASH', label: 'Cash', available: cash, Icon: Wallet, desc: 'Physical cash' },
                  { value: 'BANK', label: 'Bank', available: bank, Icon: Landmark, desc: 'Online / UPI' },
                ].map(({ value, label, available, Icon, desc }) => {
                  const isSelected = form.balance_type === value;
                  const isInsufficient = enteredAmt > available && enteredAmt > 0;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, balance_type: value }));
                        setErrors((e) => ({ ...e, amount: undefined }));
                      }}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border-2 transition cursor-pointer text-left ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-bold ${isSelected ? 'text-amber-900' : 'text-slate-700'}`}>{label}</p>
                          <span className={`text-[11px] font-bold ${available > 0 ? (isSelected ? 'text-amber-800' : 'text-slate-700') : 'text-slate-400'}`}>
                            ₹{available.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{desc}</p>
                        {isInsufficient && (
                          <span className="inline-block text-[10px] font-semibold text-rose-600 mt-0.5">
                            Insufficient
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lending Date</label>
              <input
                type="date"
                value={form.date}
                max={today()}
                onChange={set('date')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Note / Purpose (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Travel emergency, College books..."
                value={form.note}
                onChange={set('note')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-sm font-bold shadow hover:from-amber-600 hover:to-yellow-700 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {status === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Recording Loan…</>
              ) : (
                <><HandCoins className="w-4 h-4" /> Record Loan</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
