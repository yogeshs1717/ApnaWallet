/**
 * AddCashModal.jsx
 * Redesigned with Playful Modern Fintech UI inspired by Taxmate references
 */
import React, { useState, useRef } from 'react';
import { X, Plus, Wallet, Landmark, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { addCash } from '../../api/client';

const SOURCE_SUGGESTIONS = ['Pocket money', 'Gift', 'Freelance', 'Refund', 'Salary', 'Cash Deposit'];

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
  const submitting = useRef(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

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

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting.current) return;

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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md bg-white sm:rounded-[36px] rounded-t-[36px] shadow-2xl overflow-hidden border border-stone-100 animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 bg-[#FAF6F0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E4F5EE] text-[#075743] flex items-center justify-center shadow-2xs">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#24151B]">Add Cash / Funds</h2>
              <p className="text-[11px] text-stone-400">Record incoming money</p>
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

        {/* Success state */}
        {status === 'success' ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#E4F5EE] text-[#075743] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-[#24151B]">Money Added!</h3>
              <p className="text-xs text-stone-500 mt-1">Your spendable balance has been updated in PostgreSQL.</p>
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
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {serverError && (
              <div className="flex items-start gap-2 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

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
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={set('amount')}
                  className={`w-full pl-9 pr-4 py-3 rounded-2xl border text-sm font-extrabold text-[#24151B] bg-[#FAF6F0] focus:bg-white focus:outline-none focus:border-[#FF902B] transition-all ${errors.amount ? 'border-rose-400' : 'border-stone-200'}`}
                />
              </div>
              {errors.amount && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.amount}</p>}
            </div>

            {/* Source / Note */}
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                Source / Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Pocket money, Gift, Freelance…"
                value={form.note}
                onChange={set('note')}
                className={`w-full px-4 py-3 rounded-2xl border text-xs sm:text-sm bg-[#FAF6F0] focus:bg-white focus:outline-none focus:border-[#FF902B] text-[#24151B] transition-all ${errors.note ? 'border-rose-400' : 'border-stone-200'}`}
              />
              {errors.note && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.note}</p>}
              
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SOURCE_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, note: s }))}
                    className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#FAF6F0] text-stone-600 border border-stone-200 hover:bg-[#FFF0E2] hover:text-[#FF902B] transition cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Destination */}
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">Destination Account</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'CASH', label: 'Cash', Icon: Wallet, desc: 'Physical cash' },
                  { value: 'BANK', label: 'Bank', Icon: Landmark, desc: 'Bank account' },
                ].map(({ value, label, Icon, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, balance_type: value }))}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition cursor-pointer text-left ${
                      form.balance_type === value
                        ? 'border-[#331B24] bg-[#FAF6F0]'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${form.balance_type === value ? 'text-[#FF902B]' : 'text-stone-400'}`} />
                    <div>
                      <p className={`text-xs font-extrabold ${form.balance_type === value ? 'text-[#24151B]' : 'text-stone-600'}`}>{label}</p>
                      <p className="text-[10px] text-stone-400">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">Date</label>
              <input
                type="date"
                value={form.date}
                max={today()}
                onChange={set('date')}
                className={`w-full px-4 py-2.5 rounded-2xl border text-xs sm:text-sm bg-[#FAF6F0] focus:bg-white focus:outline-none focus:border-[#FF902B] text-[#24151B] transition-all ${errors.date ? 'border-rose-400' : 'border-stone-200'}`}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3.5 rounded-full bg-[#C5F52A] text-[#1C1014] text-xs font-extrabold shadow-md hover:bg-[#B4E81E] active:scale-95 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {status === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin text-[#1C1014]" /> Recording…</>
              ) : (
                <><Plus className="w-4 h-4" /> Add Funds to Wallet</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
