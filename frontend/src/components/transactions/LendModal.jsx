/**
 * LendModal.jsx
 * Redesigned with Playful Modern Fintech UI inspired by Taxmate references
 */
import React, { useState, useRef } from 'react';
import { X, HandCoins, Wallet, Landmark, Loader2, CheckCircle2, AlertCircle, Info, Plus } from 'lucide-react';
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

  const defaultSource = (cash <= 0 && bank > 0) ? 'BANK' : 'CASH';

  const [form, setForm] = useState({
    borrower_name: '',
    amount: '',
    balance_type: defaultSource,
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
          e.amount = `Insufficient ${form.balance_type === 'CASH' ? 'Cash' : 'Bank'} balance. Available: ₹${selectedBal.toFixed(2)}.`;
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md bg-white sm:rounded-[36px] rounded-t-[36px] shadow-2xl overflow-hidden border border-stone-100 animate-in slide-in-from-bottom-4 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 bg-[#FAF6F0] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FFF0E2] text-[#FF902B] flex items-center justify-center shadow-2xs">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#24151B]">Lend Money</h2>
              <p className="text-[11px] text-stone-400">Track money given to others</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-200/60 text-stone-400 hover:text-stone-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {status === 'success' ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#E4F5EE] text-[#075743] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-[#24151B]">Loan Recorded!</h3>
              <p className="text-xs text-stone-500 mt-1">
                Deducted from your balance and tracked under Money Lent receivables.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-full bg-[#C5F52A] text-[#1C1014] text-xs font-extrabold shadow hover:bg-[#B4E81E] transition cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            {serverError && (
              <div className="flex items-start gap-2 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Info Badge */}
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#FFF0E2] text-[11px] text-[#B85700] font-medium border border-amber-200/60">
              <Info className="w-4 h-4 text-[#FF902B] shrink-0 mt-0.5" />
              <span>
                Lending is an asset transfer, not an expense. When repaid, it restores your balance without double-counting income.
              </span>
            </div>

            {/* Borrower Name */}
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                Borrower Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Ranjan, Alex, Sister…"
                value={form.borrower_name}
                onChange={set('borrower_name')}
                className={`w-full px-4 py-3 rounded-2xl border text-xs sm:text-sm bg-[#FAF6F0] text-[#24151B] focus:bg-white focus:outline-none focus:border-[#FF902B] transition-all ${errors.borrower_name ? 'border-rose-400' : 'border-stone-200'}`}
              />
              {errors.borrower_name && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.borrower_name}</p>}

              <div className="flex flex-wrap gap-1.5 mt-2">
                {COMMON_BORROWERS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, borrower_name: name }))}
                    className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#FAF6F0] text-stone-600 border border-stone-200 hover:bg-[#FFF0E2] hover:text-[#FF902B] transition cursor-pointer"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-extrabold text-sm">₹</span>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={set('amount')}
                  className={`w-full pl-9 pr-4 py-3 rounded-2xl border text-sm font-extrabold text-[#24151B] bg-[#FAF6F0] focus:bg-white focus:outline-none focus:border-[#FF902B] transition-all ${errors.amount ? 'border-rose-400' : 'border-stone-200'}`}
                />
              </div>
              {errors.amount && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.amount}</p>}

              {enteredAmt > cash && bank >= enteredAmt && form.balance_type === 'CASH' && (
                <div className="mt-2.5 flex items-center justify-between rounded-2xl bg-[#FFF0E2] p-3 text-xs text-[#B85700] border border-amber-200">
                  <span>💡 Cash has ₹{cash.toFixed(2)}. Bank has ₹{bank.toFixed(2)}.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, balance_type: 'BANK' }));
                      setErrors((e) => ({ ...e, amount: undefined }));
                    }}
                    className="ml-2 px-3 py-1.5 rounded-full bg-[#FF902B] text-white font-extrabold text-[11px] hover:bg-[#E0791B] transition cursor-pointer shadow-xs"
                  >
                    Use Bank
                  </button>
                </div>
              )}
            </div>

            {/* Source Balance */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">Disburse From</label>
                <span className="text-[11px] text-stone-400">Available: ₹{(cash + bank).toFixed(2)}</span>
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
                      className={`flex items-start gap-2.5 p-3 rounded-2xl border-2 transition cursor-pointer text-left ${
                        isSelected ? 'border-[#331B24] bg-[#FAF6F0]' : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${isSelected ? 'text-[#FF902B]' : 'text-stone-400'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-bold ${isSelected ? 'text-[#24151B]' : 'text-stone-600'}`}>{label}</p>
                          <span className={`text-[11px] font-bold ${available > 0 ? (isSelected ? 'text-[#075743]' : 'text-stone-700') : 'text-stone-400'}`}>
                            ₹{available.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-400 truncate mt-0.5">{desc}</p>
                        {isInsufficient && (
                          <span className="inline-block text-[10px] font-bold text-rose-600 mt-0.5">
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
              <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">Lending Date</label>
              <input
                type="date"
                value={form.date}
                max={today()}
                onChange={set('date')}
                className="w-full px-4 py-2.5 rounded-2xl border border-stone-200 text-xs sm:text-sm bg-[#FAF6F0] text-[#24151B] focus:bg-white focus:outline-none focus:border-[#FF902B] transition"
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">Purpose / Note (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Emergency, Rent, College books…"
                value={form.note}
                onChange={set('note')}
                className="w-full px-4 py-2.5 rounded-2xl border border-stone-200 text-xs sm:text-sm bg-[#FAF6F0] text-[#24151B] focus:bg-white focus:outline-none focus:border-[#FF902B] transition"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3.5 rounded-full bg-[#FF902B] text-white text-xs font-extrabold shadow-md hover:bg-[#E0791B] active:scale-95 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {status === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin text-white" /> Recording Loan…</>
              ) : (
                <><Plus className="w-4 h-4" /> Disburse &amp; Record Loan</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
