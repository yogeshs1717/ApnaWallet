/**
 * AdjustLendModal.jsx
 * Prompt 05 — Milestone 5: Editing Lending Records & Adjustments
 *
 * Manually adjusts remaining outstanding balance (debt forgiveness, settlement, correction).
 * IMPORTANT: Manual adjustments update receivables without creating fake cash in Cash/Bank!
 */
import React, { useState, useRef } from 'react';
import { X, Sliders, Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { adjustLending } from '../../api/client';

export default function AdjustLendModal({ lending, onSuccess, onClose }) {
  const currentOutstanding = parseFloat(lending.outstanding_amount || 0);
  const original = parseFloat(lending.original_amount || 0);

  const [newAmount, setNewAmount] = useState(String(currentOutstanding));
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [serverError, setServerError] = useState('');
  const submitting = useRef(false);

  function validate() {
    const e = {};
    const amt = parseFloat(newAmount);
    if (newAmount === '' || isNaN(amt) || amt < 0) {
      e.newAmount = 'Enter a valid non-negative amount.';
    } else if (amt > original) {
      e.newAmount = `Cannot exceed original loan of ₹${original.toFixed(2)}.`;
    } else if (amt === currentOutstanding) {
      e.newAmount = 'New amount is identical to current outstanding. Change the amount to adjust.';
    }

    if (!reason || reason.trim().length < 3) {
      e.reason = 'A valid reason (minimum 3 characters) is required.';
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
      const result = await adjustLending(lending.id, {
        new_outstanding_amount: newAmount,
        reason: reason.trim(),
      });
      setStatus('success');
      onSuccess(result.lending, result.adjustment);
    } catch (err) {
      setStatus('error');
      setServerError(err.message || 'Failed to adjust balance.');
    } finally {
      submitting.current = false;
    }
  }

  const delta = (parseFloat(newAmount) || 0) - currentOutstanding;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#331B24]/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md bg-[#FAF6F0] rounded-t-[36px] sm:rounded-[36px] shadow-[0_20px_60px_rgba(51,27,36,0.25)] border border-[#331B24]/10 overflow-hidden animate-in slide-in-from-bottom-6 duration-300 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#331B24]/5 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF902B]/15 flex items-center justify-center text-[#FF902B]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#331B24] tracking-tight">Adjust Receivable</h2>
              <p className="text-xs text-[#331B24]/60 font-medium">For {lending.borrower_name}</p>
            </div>
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
            <h3 className="text-xl font-extrabold text-[#331B24]">Receivable Adjusted!</h3>
            <p className="text-sm text-[#331B24]/70 max-w-xs mx-auto leading-relaxed">
              Outstanding due updated to ₹{parseFloat(newAmount).toFixed(2)}. Audit log preserved.
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

            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#FF902B]/10 border border-[#FF902B]/20 text-[11px] text-[#331B24] font-medium leading-relaxed">
              <Info className="w-4 h-4 text-[#FF902B] shrink-0 mt-0.5" />
              <span>
                Manual adjustment changes the amount owed (e.g. debt forgiveness, settlement discount). It does <strong>NOT</strong> add money to Cash or Bank because no actual cash was received.
              </span>
            </div>

            {/* Current vs New */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#331B24]/5 text-xs">
              <div>
                <span className="text-[#331B24]/50 font-bold block mb-0.5">Current Due</span>
                <span className="text-sm font-extrabold text-[#331B24]">₹{currentOutstanding.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[#331B24]/50 font-bold block mb-0.5">Adjustment Delta</span>
                <span className={`text-sm font-extrabold ${delta < 0 ? 'text-rose-600' : delta > 0 ? 'text-[#075743]' : 'text-[#331B24]/50'}`}>
                  {delta > 0 ? `+₹${delta.toFixed(2)}` : delta < 0 ? `-₹${Math.abs(delta).toFixed(2)}` : '₹0.00'}
                </span>
              </div>
            </div>

            {/* New Outstanding Amount */}
            <div>
              <label className="block text-xs font-bold text-[#331B24]/80 mb-1.5">
                New Outstanding Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#331B24]/40 font-bold text-base">₹</span>
                <input
                  type="number"
                  min="0.00"
                  max={original}
                  step="0.01"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className={`w-full pl-9 pr-4 py-3 rounded-2xl border text-base font-extrabold text-[#331B24] bg-[#FAF6F0] focus:outline-none focus:ring-2 focus:ring-[#331B24]/20 focus:bg-white transition ${errors.newAmount ? 'border-rose-400' : 'border-[#331B24]/10'}`}
                />
              </div>
              {errors.newAmount && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.newAmount}</p>}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-[#331B24]/80 mb-1.5">
                Reason for Adjustment <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Forgiveness ₹50, Settlement agreement..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={`w-full px-4 py-3 rounded-2xl border text-xs font-semibold text-[#331B24] bg-[#FAF6F0] focus:outline-none focus:ring-2 focus:ring-[#331B24]/20 focus:bg-white transition ${errors.reason ? 'border-rose-400' : 'border-[#331B24]/10'}`}
              />
              {errors.reason && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.reason}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-4 rounded-full bg-[#331B24] hover:bg-[#41232E] text-white text-sm font-extrabold tracking-wide shadow-md transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {status === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin text-[#C5F52A]" /> Saving Adjustment…</>
              ) : (
                <><Sliders className="w-4 h-4 text-[#C5F52A]" /> Save Financial Adjustment</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
