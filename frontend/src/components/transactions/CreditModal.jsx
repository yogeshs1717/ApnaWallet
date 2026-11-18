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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Record Credit / Debt</h2>
              <p className="text-xs text-slate-500">Track liabilities you owe to others</p>
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
            <h3 className="text-lg font-bold text-slate-900">Credit Recorded!</h3>
            <p className="text-sm text-slate-500">
              {form.receive_funds
                ? 'Borrowed money added to your balance, and liability recorded in Credit Outstanding.'
                : 'Existing debt recorded in your Credit Outstanding liabilities.'}
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-bold shadow cursor-pointer"
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

            {/* Distinction Choice: Existing Debt vs Cash Received */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Credit Type / Flow <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, receive_funds: false }))}
                  className={`p-3 rounded-xl border-2 text-left transition cursor-pointer ${
                    !form.receive_funds
                      ? 'border-blue-500 bg-blue-50/60'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className={`text-xs font-bold ${!form.receive_funds ? 'text-blue-700' : 'text-slate-800'}`}>
                    Existing Debt
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Store tab, unpaid bill (balance unchanged)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, receive_funds: true }))}
                  className={`p-3 rounded-xl border-2 text-left transition cursor-pointer ${
                    form.receive_funds
                      ? 'border-blue-500 bg-blue-50/60'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className={`text-xs font-bold ${form.receive_funds ? 'text-blue-700' : 'text-slate-800'}`}>
                    Borrowed Funds
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Cash received now into Cash or Bank
                  </p>
                </button>
              </div>
            </div>

            {/* Creditor Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Creditor / Lender Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC, Sharma Ji, Deepak..."
                value={form.creditor_name}
                onChange={set('creditor_name')}
                className={`w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition ${errors.creditor_name ? 'border-red-400' : 'border-slate-200'}`}
              />
              {errors.creditor_name && <p className="mt-1 text-xs text-red-600">{errors.creditor_name}</p>}

              {/* Quick suggestion chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {COMMON_CREDITORS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, creditor_name: name }))}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
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
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={set('amount')}
                  className={`w-full pl-7 pr-4 py-3 rounded-xl border text-sm font-semibold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition ${errors.amount ? 'border-red-400' : 'border-slate-200'}`}
                />
              </div>
              {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
            </div>

            {/* If Receive Funds: Choose Destination Balance */}
            {form.receive_funds && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Deposit borrowed money into</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'CASH', label: 'Cash Balance', Icon: Wallet },
                    { value: 'BANK', label: 'Bank Balance', Icon: Landmark },
                  ].map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, destination_balance_type: value }))}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition cursor-pointer ${
                        form.destination_balance_type === value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${form.destination_balance_type === value ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className={`text-xs font-bold ${form.destination_balance_type === value ? 'text-blue-700' : 'text-slate-700'}`}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dates: Credit Date & Optional Pay By Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date Borrowed</label>
                <input
                  type="date"
                  value={form.credit_date}
                  max={today()}
                  onChange={set('credit_date')}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pay By Date <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={form.pay_by_date}
                  min={today()}
                  max="2099-12-31"
                  onChange={set('pay_by_date')}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Month end store tab, Bike repair loan..."
                value={form.description}
                onChange={set('description')}
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
                <><Loader2 className="w-4 h-4 animate-spin" /> Recording Debt…</>
              ) : (
                <><CreditCard className="w-4 h-4" /> Record Credit</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
