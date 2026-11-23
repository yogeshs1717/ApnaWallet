/**
 * CreditModal.jsx
 * Prompt 05 — Milestone 6: Credit and Payable Debt Management
 *
 * Distinctly supports:
 *   Mode A: Record existing debt/credit liability (no Cash/Bank change).
 *   Mode B: Borrowed money received into Cash or Bank (increases balance + records liability).
 * Crucial accounting rule: Borrowed money is NOT earned income!
 */
import React, { useState, useRef } from 'react';
import { X, CreditCard, Wallet, Landmark, Loader2, CheckCircle, AlertCircle, Info, Calendar } from 'lucide-react';
import { createCredit } from '../../api/client';

function today() {
  return new Date().toISOString().split('T')[0];
}

const COMMON_CREDITORS = ['HDFC Bank', 'SBI', 'Sharma Ji Store', 'Friend', 'Family', 'Credit Card'];

export default function CreditModal({ accountId, onSuccess, onClose }) {
  const [form, setForm] = useState({
    creditor_name: '',
    amount: '',
    receive_funds: false, // false = existing debt, true = received cash/bank
    destination_balance_type: 'CASH',
    credit_date: today(),
    pay_by_date: '',
    description: '',
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [serverError, setServerError] = useState('');
  const submitting = useRef(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function validate() {
    const e = {};
    if (!form.creditor_name || !form.creditor_name.trim()) {
      e.creditor_name = 'Creditor name is mandatory.';
    }
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) {
      e.amount = 'Enter a valid positive amount.';
    }
    if (!form.credit_date) e.credit_date = 'Date is required.';
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
      const result = await createCredit({
        account_id: accountId,
        creditor_name: form.creditor_name.trim(),
        amount: form.amount,
        credit_date: form.credit_date,
        pay_by_date: form.pay_by_date || null,
        description: form.description.trim(),
        receive_funds: form.receive_funds,
        destination_balance_type: form.receive_funds ? form.destination_balance_type : null,
      });
      setStatus('success');
      onSuccess(result.account, result.credit);
    } catch (err) {
      setStatus('error');
      setServerError(err.message || 'Failed to record credit. Please try again.');
    } finally {
      submitting.current = false;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#331B24]/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md bg-[#FAF6F0] rounded-t-[36px] sm:rounded-[36px] shadow-[0_20px_60px_rgba(51,27,36,0.25)] border border-[#331B24]/10 overflow-hidden animate-in slide-in-from-bottom-6 duration-300 max-h-[92vh] flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#331B24]/5 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D2B4ED]/30 flex items-center justify-center text-[#331B24]">
              <CreditCard className="w-5 h-5 text-[#331B24]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#331B24] tracking-tight">Record Credit / Debt</h2>
              <p className="text-xs text-[#331B24]/60 font-medium">Track liabilities you owe to others</p>
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
          <div className="p-8 text-center space-y-4 bg-white flex-1">
            <div className="w-16 h-16 rounded-full bg-[#C5F52A]/30 mx-auto flex items-center justify-center">
              <CheckCircle className="w-9 h-9 text-[#075743]" />
            </div>
            <h3 className="text-xl font-extrabold text-[#331B24]">Credit Recorded!</h3>
            <p className="text-sm text-[#331B24]/70 max-w-xs mx-auto leading-relaxed">
              {form.receive_funds
                ? 'Borrowed money added to your balance, and liability recorded in Credit Outstanding.'
                : 'Existing debt recorded in your Credit Outstanding liabilities.'}
            </p>
            <button
              onClick={onClose}
              className="mt-3 px-8 py-3.5 rounded-full bg-[#331B24] text-white text-sm font-bold shadow hover:bg-[#41232E] transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto bg-white flex-1">
            {serverError && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Distinction Choice: Existing Debt vs Borrowed Funds */}
            <div>
              <label className="block text-xs font-bold text-[#331B24]/80 mb-2">
                Credit Type / Flow <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, receive_funds: false }))}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    !form.receive_funds
                      ? 'border-[#331B24] bg-[#FAF6F0] shadow-sm'
                      : 'border-transparent bg-[#FAF6F0]/60 hover:bg-[#FAF6F0]'
                  }`}
                >
                  <p className={`text-xs font-extrabold ${!form.receive_funds ? 'text-[#331B24]' : 'text-[#331B24]/70'}`}>
                    Existing Debt
                  </p>
                  <p className="text-[10px] text-[#331B24]/60 font-medium mt-1 leading-snug">
                    Store tab, unpaid bill (balance unchanged)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, receive_funds: true }))}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    form.receive_funds
                      ? 'border-[#331B24] bg-[#FAF6F0] shadow-sm'
                      : 'border-transparent bg-[#FAF6F0]/60 hover:bg-[#FAF6F0]'
                  }`}
                >
                  <p className={`text-xs font-extrabold ${form.receive_funds ? 'text-[#331B24]' : 'text-[#331B24]/70'}`}>
                    Borrowed Funds
                  </p>
                  <p className="text-[10px] text-[#331B24]/60 font-medium mt-1 leading-snug">
                    Cash received now into Cash or Bank
                  </p>
                </button>
              </div>
            </div>

            {/* Creditor Name */}
            <div>
              <label className="block text-xs font-bold text-[#331B24]/80 mb-1.5">
                Creditor / Lender Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC, Sharma Ji, Deepak..."
                value={form.creditor_name}
                onChange={set('creditor_name')}
                className={`w-full px-4 py-3 rounded-2xl border text-sm font-semibold text-[#331B24] bg-[#FAF6F0] focus:outline-none focus:ring-2 focus:ring-[#331B24]/20 focus:bg-white transition ${errors.creditor_name ? 'border-rose-400' : 'border-[#331B24]/10'}`}
              />
              {errors.creditor_name && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.creditor_name}</p>}

              {/* Quick suggestion chips */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {COMMON_CREDITORS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, creditor_name: name }))}
                    className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#FAF6F0] text-[#331B24]/80 border border-[#331B24]/10 hover:border-[#331B24]/30 hover:bg-white transition cursor-pointer"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-[#331B24]/80 mb-1.5">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#331B24]/40 font-bold text-base">₹</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={set('amount')}
                  className={`w-full pl-9 pr-4 py-3 rounded-2xl border text-base font-extrabold text-[#331B24] bg-[#FAF6F0] focus:outline-none focus:ring-2 focus:ring-[#331B24]/20 focus:bg-white transition ${errors.amount ? 'border-rose-400' : 'border-[#331B24]/10'}`}
                />
              </div>
              {errors.amount && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.amount}</p>}
            </div>

            {/* If Receive Funds: Choose Destination Balance */}
            {form.receive_funds && (
              <div>
                <label className="block text-xs font-bold text-[#331B24]/80 mb-1.5">Deposit borrowed money into</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { value: 'CASH', label: 'Cash Balance', Icon: Wallet },
                    { value: 'BANK', label: 'Bank Balance', Icon: Landmark },
                  ].map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, destination_balance_type: value }))}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                        form.destination_balance_type === value
                          ? 'border-[#331B24] bg-[#FAF6F0]'
                          : 'border-transparent bg-[#FAF6F0]/60 hover:bg-[#FAF6F0]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${form.destination_balance_type === value ? 'text-[#331B24]' : 'text-[#331B24]/50'}`} />
                      <span className={`text-xs font-bold ${form.destination_balance_type === value ? 'text-[#331B24]' : 'text-[#331B24]/70'}`}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dates: Credit Date & Optional Pay By Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#331B24]/80 mb-1.5">Date Borrowed</label>
                <input
                  type="date"
                  value={form.credit_date}
                  max={today()}
                  onChange={set('credit_date')}
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#331B24]/10 text-xs font-semibold text-[#331B24] bg-[#FAF6F0] focus:outline-none focus:ring-2 focus:ring-[#331B24]/20 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#331B24]/80 mb-1.5">
                  Pay By Date <span className="text-[#331B24]/40 font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={form.pay_by_date}
                  min={today()}
                  max="2099-12-31"
                  onChange={set('pay_by_date')}
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#331B24]/10 text-xs font-semibold text-[#331B24] bg-[#FAF6F0] focus:outline-none focus:ring-2 focus:ring-[#331B24]/20 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-[#331B24]/80 mb-1.5">Description (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Month end store tab, Bike repair loan..."
                value={form.description}
                onChange={set('description')}
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
                <><Loader2 className="w-4 h-4 animate-spin text-[#C5F52A]" /> Recording Debt…</>
              ) : (
                <><CreditCard className="w-4 h-4 text-[#C5F52A]" /> Record Credit</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
