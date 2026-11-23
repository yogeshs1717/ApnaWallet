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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#331B24]/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md bg-[#FAF6F0] rounded-t-[36px] sm:rounded-[36px] shadow-[0_20px_60px_rgba(51,27,36,0.25)] border border-[#331B24]/10 overflow-hidden animate-in slide-in-from-bottom-6 duration-300 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#331B24]/5 bg-white">
          <div>
            <h2 className="text-base font-extrabold text-[#331B24] tracking-tight">Repay Credit / Debt</h2>
            <p className="text-xs text-[#331B24]/60 font-medium">To {credit.creditor_name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#FAF6F0] hover:bg-[#331B24]/10 text-[#331B24] flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {status === 'success' ? (
          <div className="p-8 text-center space-y-4 bg-white">
            <div className="w-16 h-16 rounded-full bg-[#C5F52A]/30 mx-auto flex items-center justify-center">
              <CheckCircle className="w-9 h-9 text-[#075743]" />
            </div>
            <h3 className="text-xl font-extrabold text-[#331B24]">Debt Repaid!</h3>
            <p className="text-sm text-[#331B24]/70 max-w-xs mx-auto leading-relaxed">
              Your balance was deducted and liability reduced.
            </p>
            <button
              onClick={onClose}
              className="mt-3 px-8 py-3.5 rounded-full bg-[#331B24] text-white text-sm font-bold shadow hover:bg-[#41232E] transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
            {serverError && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Current Debt Summary */}
            <div className="p-4 rounded-2xl bg-[#D2B4ED]/20 border border-[#D2B4ED]/40 text-xs text-[#331B24] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#331B24]/60 font-medium">Creditor:</span>
                <span className="font-extrabold text-[#331B24]">{credit.creditor_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#331B24]/60 font-medium">Original Obligation:</span>
                <span className="font-bold">₹{parseFloat(credit.original_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#331B24]/10">
                <span className="text-[#331B24] font-extrabold">Outstanding Debt:</span>
                <span className="text-[#331B24] font-extrabold text-sm">₹{maxRepay.toFixed(2)}</span>
              </div>
            </div>

            {/* Repayment Amount */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#331B24]/80">
                  Repayment Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, amount: String(Math.min(maxRepay, selectedSourceBal)) }))}
                  className="text-[11px] font-extrabold text-[#331B24] underline hover:text-[#FF902B] cursor-pointer"
                >
                  Pay Max (₹{Math.min(maxRepay, selectedSourceBal).toFixed(2)})
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#331B24]/40 font-bold text-base">₹</span>
                <input
                  type="number"
                  min="0.01"
                  max={maxRepay}
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={set('amount')}
                  className={`w-full pl-9 pr-4 py-3 rounded-2xl border text-base font-extrabold text-[#331B24] bg-[#FAF6F0] focus:outline-none focus:ring-2 focus:ring-[#331B24]/20 focus:bg-white transition ${errors.amount ? 'border-rose-400' : 'border-[#331B24]/10'}`}
                />
              </div>
              {errors.amount && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.amount}</p>}
            </div>

            {/* Payment Source */}
            <div>
              <label className="block text-xs font-bold text-[#331B24]/80 mb-1.5">Pay From</label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { value: 'CASH', label: 'Cash Balance', bal: cashBalance, Icon: Wallet },
                  { value: 'BANK', label: 'Bank Balance', bal: bankBalance, Icon: Landmark },
                ].map(({ value, label, bal, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, payment_source: value }))}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                      form.payment_source === value
                        ? 'border-[#331B24] bg-[#FAF6F0]'
                        : 'border-transparent bg-[#FAF6F0]/60 hover:bg-[#FAF6F0]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${form.payment_source === value ? 'text-[#331B24]' : 'text-[#331B24]/50'}`} />
                    <div className="text-left">
                      <p className={`text-xs font-bold ${form.payment_source === value ? 'text-[#331B24]' : 'text-[#331B24]/70'}`}>{label}</p>
                      <p className="text-[10px] text-[#331B24]/50 font-medium">₹{parseFloat(bal || 0).toFixed(2)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-[#331B24]/80 mb-1.5">Payment Date</label>
              <input
                type="date"
                value={form.date}
                max={today()}
                onChange={set('date')}
                className="w-full px-4 py-2.5 rounded-2xl border border-[#331B24]/10 text-xs font-semibold text-[#331B24] bg-[#FAF6F0] focus:outline-none focus:ring-2 focus:ring-[#331B24]/20 focus:bg-white transition"
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-bold text-[#331B24]/80 mb-1.5">Note (Optional)</label>
              <input
                type="text"
                placeholder={`Repayment to ${credit.creditor_name}`}
                value={form.note}
                onChange={set('note')}
                className="w-full px-4 py-2.5 rounded-2xl border border-[#331B24]/10 text-xs font-semibold text-[#331B24] bg-[#FAF6F0] focus:outline-none focus:ring-2 focus:ring-[#331B24]/20 focus:bg-white transition"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-4 rounded-full bg-[#331B24] hover:bg-[#41232E] text-white text-sm font-extrabold tracking-wide shadow-md transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {status === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin text-[#C5F52A]" /> Recording Repayment…</>
              ) : (
                <><CheckCircle className="w-4 h-4 text-[#C5F52A]" /> Confirm Debt Repayment</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
