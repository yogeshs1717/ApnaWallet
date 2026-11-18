/**
 * ExpenseModal.jsx
 * Prompt 04 — Milestone 5: Expense entry and editing
 *
 * Records a spend from Cash or Bank.
 * When `editTransaction` prop is supplied, the form operates in edit mode.
 *
 * Key concept: editing a ₹200 expense to ₹300 triggers a differential
 * balance recalculation in the backend (+₹100 deducted), not a full ₹300.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  X, ArrowDownRight, Wallet, Landmark, Loader2, CheckCircle, AlertCircle,
  Plus, Trash2,
} from 'lucide-react';
import { createExpense, updateExpense, getCategories, createCategory } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function ExpenseModal({ accountId, onSuccess, onClose, editTransaction = null, cashBalance, bankBalance }) {
  const isEdit = !!editTransaction;
  const { selectedAccount } = useAuth();
  const cash = parseFloat(cashBalance ?? selectedAccount?.cash_balance ?? 0);
  const bank = parseFloat(bankBalance ?? selectedAccount?.bank_balance ?? 0);

  const defaultSource = isEdit
    ? (editTransaction.balance_type || 'CASH')
    : ((cash <= 0 && bank > 0) ? 'BANK' : 'CASH');

  const [form, setForm] = useState({
    amount: isEdit ? String(editTransaction.amount) : '',
    note: isEdit ? (editTransaction.note || '') : '',
    balance_type: defaultSource,
    date: isEdit ? (editTransaction.transaction_date || today()) : today(),
    category_id: isEdit ? (editTransaction.category?.id || '') : '',
  });
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [serverError, setServerError] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const submitting = useRef(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  // ── Load categories from API ────────────────────────────────────────────────
  useEffect(() => {
    getCategories()
      .then((data) => {
        setCategories(data);
        // Auto-select first category on new expense if none chosen
        if (!isEdit && !form.category_id && data.length > 0) {
          setForm((f) => ({ ...f, category_id: data[0].id }));
        }
      })
      .catch(() => setCategories([]))
      .finally(() => setCatLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Add custom category ─────────────────────────────────────────────────────
  async function handleAddCategory() {
    if (!newCatName.trim() || newCatName.trim().length < 2) return;
    setAddingCat(true);
    try {
      const cat = await createCategory(newCatName.trim());
      setCategories((prev) => [...prev, cat]);
      setForm((f) => ({ ...f, category_id: cat.id }));
      setNewCatName('');
    } catch {
      // silently ignore; user can retry
    } finally {
      setAddingCat(false);
    }
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate() {
    const e = {};
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) e.amount = 'Enter a valid positive amount.';
    if (!form.note || form.note.trim().length < 3) e.note = 'Note must be at least 3 characters.';
    if (!form.category_id) e.category_id = 'Please select a category.';
    if (!form.date) e.date = 'Date is required.';
    return e;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
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
      let result;
      if (isEdit) {
        // PATCH — backend calculates differential: (newAmt - oldAmt) is the balance change
        result = await updateExpense(editTransaction.id, {
          amount: form.amount,
          balance_type: form.balance_type,
          note: form.note.trim(),
          date: form.date,
          category_id: form.category_id,
        });
      } else {
        result = await createExpense({
          account_id: accountId,
          amount: form.amount,
          balance_type: form.balance_type,
          note: form.note.trim(),
          date: form.date,
          category_id: form.category_id,
        });
      }
      setStatus('success');
      onSuccess(result.account, result.transaction);
    } catch (err) {
      setStatus('error');
      setServerError(err.message || 'Failed to record expense. Please try again.');
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-rose-500/10 to-red-500/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-red-500 flex items-center justify-center shadow-sm">
              <ArrowDownRight className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{isEdit ? 'Edit Expense' : 'Add Expense'}</h2>
              <p className="text-xs text-slate-500">{isEdit ? 'Adjust transaction details' : 'Deduct from Cash or Bank'}</p>
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
            <h3 className="text-lg font-bold text-slate-900">{isEdit ? 'Expense Updated!' : 'Expense Recorded!'}</h3>
            <p className="text-sm text-slate-500">Balance has been adjusted.</p>
            <button onClick={onClose} className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 text-white text-sm font-bold shadow cursor-pointer">
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

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Amount (₹) <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number" min="0.01" step="any" placeholder="0.00"
                  value={form.amount} onChange={set('amount')}
                  className={`w-full pl-7 pr-4 py-3 rounded-xl border text-sm font-semibold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition ${errors.amount ? 'border-red-400' : 'border-slate-200'}`}
                />
              </div>
              {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
              {parseFloat(form.amount || 0) > cash && bank >= parseFloat(form.amount || 0) && form.balance_type === 'CASH' && !isEdit && (
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
              {isEdit && (
                <p className="mt-1 text-[10px] text-slate-400">
                  Original: ₹{editTransaction.amount}. Only the difference will be applied to your balance.
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category <span className="text-red-500">*</span></label>
              {catLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading categories…</div>
              ) : (
                <select
                  value={form.category_id} onChange={set('category_id')}
                  className={`w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition ${errors.category_id ? 'border-red-400' : 'border-slate-200'}`}
                >
                  <option value="">— Select category —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
              {errors.category_id && <p className="mt-1 text-xs text-red-600">{errors.category_id}</p>}

              {/* Quick add custom category */}
              <div className="flex gap-2 mt-2">
                <input
                  type="text" placeholder="+ New category…"
                  value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); }}}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-rose-300"
                />
                <button
                  type="button" onClick={handleAddCategory} disabled={addingCat}
                  className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition disabled:opacity-50 cursor-pointer"
                >
                  {addingCat ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Note <span className="text-red-500">*</span></label>
              <input
                type="text" placeholder="Min 3 characters…"
                value={form.note} onChange={set('note')}
                className={`w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition ${errors.note ? 'border-red-400' : 'border-slate-200'}`}
              />
              {errors.note && <p className="mt-1 text-xs text-red-600">{errors.note}</p>}
            </div>

            {/* Payment Source */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">Pay from</label>
                <span className="text-[11px] text-slate-400">Total: ₹{(cash + bank).toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'CASH', label: 'Cash', available: cash, Icon: Wallet },
                  { value: 'BANK', label: 'Bank', available: bank, Icon: Landmark },
                ].map(({ value, label, available, Icon }) => {
                  const isSelected = form.balance_type === value;
                  const entered = parseFloat(form.amount || 0);
                  const isInsufficient = entered > available && entered > 0;
                  return (
                    <button
                      key={value} type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, balance_type: value }));
                        setErrors((e) => ({ ...e, amount: undefined }));
                      }}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border-2 transition cursor-pointer text-left ${isSelected ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${isSelected ? 'text-rose-600' : 'text-slate-400'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected ? 'text-rose-700' : 'text-slate-700'}`}>{label}</span>
                          <span className={`text-[11px] font-bold ${available > 0 ? (isSelected ? 'text-rose-800' : 'text-slate-700') : 'text-slate-400'}`}>
                            ₹{available.toFixed(2)}
                          </span>
                        </div>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
              <input
                type="date" value={form.date} max={today()} onChange={set('date')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition"
              />
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={status === 'loading'}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 text-white text-sm font-bold shadow hover:from-rose-600 hover:to-red-600 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {status === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {isEdit ? 'Saving…' : 'Recording…'}</>
              ) : (
                <><ArrowDownRight className="w-4 h-4" /> {isEdit ? 'Save Changes' : 'Record Expense'}</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
