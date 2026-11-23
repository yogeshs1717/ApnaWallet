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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#331B24]/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md bg-[#FAF6F0] rounded-t-[36px] sm:rounded-[36px] shadow-[0_20px_60px_rgba(51,27,36,0.25)] border border-[#331B24]/10 overflow-hidden animate-in slide-in-from-bottom-6 duration-300 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#331B24]/5 bg-white">
          <div>
            <h2 className="text-base font-extrabold text-[#331B24] tracking-tight">Record Repayment</h2>
            <p className="text-xs text-[#331B24]/60 font-medium">From {lending.borrower_name}</p>
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
            <h3 className="text-xl font-extrabold text-[#331B24]">Repayment Recorded!</h3>
            <p className="text-sm text-[#331B24]/70 max-w-xs mx-auto leading-relaxed">
              Recovered principal has been credited to your balance.
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

            {/* Current Loan Summary */}
            <div className="p-4 rounded-2xl bg-[#FF902B]/10 border border-[#FF902B]/30 text-xs text-[#331B24] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#331B24]/60 font-medium">Borrower:</span>
                <span className="font-extrabold text-[#331B24]">{lending.borrower_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#331B24]/60 font-medium">Original Loan:</span>
                <span className="font-bold">₹{parseFloat(lending.original_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#331B24]/10">
                <span className="text-[#331B24] font-extrabold">Outstanding Due:</span>
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
                  onClick={() => setForm((f) => ({ ...f, amount: String(maxRepay) }))}
                  className="text-[11px] font-extrabold text-[#331B24] underline hover:text-[#FF902B] cursor-pointer"
                >
                  Pay Full (₹{maxRepay.toFixed(2)})
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

            {/* Received Into Balance */}
            <div>
              <label className="block text-xs font-bold text-[#331B24]/80 mb-1.5">Received Into</label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { value: 'CASH', label: 'Cash Balance', Icon: Wallet },
                  { value: 'BANK', label: 'Bank Balance', Icon: Landmark },
                ].map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, balance_type: value }))}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                      form.balance_type === value
                        ? 'border-[#331B24] bg-[#FAF6F0]'
                        : 'border-transparent bg-[#FAF6F0]/60 hover:bg-[#FAF6F0]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${form.balance_type === value ? 'text-[#331B24]' : 'text-[#331B24]/50'}`} />
                    <span className={`text-xs font-bold ${form.balance_type === value ? 'text-[#331B24]' : 'text-[#331B24]/70'}`}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-[#331B24]/80 mb-1.5">Repayment Date</label>
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
                placeholder={`Auto-note: "${lending.borrower_name} paid ₹..."`}
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
                <><CheckCircle className="w-4 h-4 text-[#C5F52A]" /> Confirm Repayment</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
