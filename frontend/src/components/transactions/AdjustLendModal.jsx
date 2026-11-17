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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Adjust Receivable</h2>
              <p className="text-xs text-slate-500">For {lending.borrower_name}</p>
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
            <h3 className="text-lg font-bold text-slate-900">Receivable Adjusted!</h3>
            <p className="text-sm text-slate-500">
              Outstanding due updated to ₹{parseFloat(newAmount).toFixed(2)}. Audit log preserved.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow cursor-pointer"
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

            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Manual adjustment changes the amount owed (e.g. debt forgiveness, settlement discount). It does <strong>NOT</strong> add money to Cash or Bank because no actual cash was received.
              </span>
            </div>

            {/* Current vs New */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block">Current Due</span>
                <span className="text-sm font-bold text-slate-800">₹{currentOutstanding.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Adjustment Delta</span>
                <span className={`text-sm font-bold ${delta < 0 ? 'text-rose-600' : delta > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {delta > 0 ? `+₹${delta.toFixed(2)}` : delta < 0 ? `-₹${Math.abs(delta).toFixed(2)}` : '₹0.00'}
                </span>
              </div>
            </div>

            {/* New Outstanding Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                New Outstanding Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  min="0.00"
                  max={original}
                  step="0.01"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className={`w-full pl-7 pr-4 py-3 rounded-xl border text-sm font-semibold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition ${errors.newAmount ? 'border-red-400' : 'border-slate-200'}`}
                />
              </div>
              {errors.newAmount && <p className="mt-1 text-xs text-red-600">{errors.newAmount}</p>}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reason for Adjustment <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Forgiveness ₹50, Settlement agreement..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition ${errors.reason ? 'border-red-400' : 'border-slate-200'}`}
              />
              {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow hover:from-amber-600 hover:to-orange-600 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {status === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving Adjustment…</>
              ) : (
                <><Sliders className="w-4 h-4" /> Save Financial Adjustment</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
