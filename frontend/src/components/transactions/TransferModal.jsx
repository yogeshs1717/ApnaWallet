/**
 * TransferModal.jsx
 * Redesigned with Playful Modern Fintech UI inspired by Taxmate references
 */
import React, { useState, useRef } from 'react';
import { X, ArrowLeftRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md bg-white sm:rounded-[36px] rounded-t-[36px] shadow-2xl overflow-hidden border border-stone-100 animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 bg-[#FAF6F0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E4F5EE] text-[#075743] flex items-center justify-center shadow-2xs">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#24151B]">Transfer Funds</h2>
              <p className="text-[11px] text-stone-400">Move money between Cash &amp; Bank</p>
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
              <h3 className="text-xl font-extrabold text-[#24151B]">Transfer Complete!</h3>
              <p className="text-xs text-stone-500 mt-1">Total spendable available balance remains unchanged.</p>
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

            {/* Direction Selector */}
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-2 uppercase tracking-wider">
                Transfer Direction
              </label>
              <div className="flex items-center justify-between p-4 rounded-3xl border border-stone-200 bg-[#FAF6F0]">
                <div className="text-center min-w-[70px]">
                  <p className="text-xs font-extrabold text-[#24151B]">{sourceLabel}</p>
                  <p className="text-[10px] text-stone-500 font-semibold mt-0.5">₹{parseFloat(sourceBalance || 0).toFixed(2)}</p>
                </div>
                <button
                  type="button"
                  onClick={toggleSource}
                  className="p-2.5 rounded-full bg-white border border-stone-200 hover:border-[#FF902B] hover:bg-[#FFF0E2] transition-all cursor-pointer shadow-2xs"
                  title="Swap source and destination"
                >
                  <ArrowLeftRight className="w-4 h-4 text-[#FF902B]" />
                </button>
                <div className="text-center min-w-[70px]">
                  <p className="text-xs font-extrabold text-[#24151B]">{destLabel}</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">receives</p>
                </div>
              </div>
              <p className="mt-1.5 text-[10px] text-stone-400 text-center">
                Tap ⇄ to swap transfer direction
              </p>
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
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className={`w-full pl-9 pr-4 py-3 rounded-2xl border text-sm font-extrabold text-[#24151B] bg-[#FAF6F0] focus:bg-white focus:outline-none focus:border-[#FF902B] transition-all ${errors.amount ? 'border-rose-400' : 'border-stone-200'}`}
                />
              </div>
              {errors.amount && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.amount}</p>}
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">Note</label>
              <input
                type="text"
                placeholder="Description…"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                className={`w-full px-4 py-3 rounded-2xl border text-xs sm:text-sm bg-[#FAF6F0] text-[#24151B] focus:bg-white focus:outline-none focus:border-[#FF902B] transition-all ${errors.note ? 'border-rose-400' : 'border-stone-200'}`}
              />
              {errors.note && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.note}</p>}
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">Date</label>
              <input
                type="date"
                value={form.date}
                max={today()}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-2xl border border-stone-200 text-xs sm:text-sm bg-[#FAF6F0] text-[#24151B] focus:bg-white focus:outline-none focus:border-[#FF902B] transition"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3.5 rounded-full bg-[#075743] text-white text-xs font-extrabold shadow-md hover:bg-[#054333] active:scale-95 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {status === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin text-white" /> Transferring…</>
              ) : (
                <><ArrowLeftRight className="w-4 h-4 text-[#C5F52A]" /> Transfer {sourceLabel} → {destLabel}</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
