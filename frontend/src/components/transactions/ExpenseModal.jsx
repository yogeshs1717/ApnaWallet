/**
 * ExpenseModal.jsx
 * Redesigned with Playful Modern Fintech UI inspired by Taxmate references
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  X, Minus, Wallet, Landmark, Loader2, CheckCircle2, AlertCircle,
  Plus
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

  useEffect(() => {
    getCategories()
      .then((data) => {
        setCategories(data);
        if (!isEdit && !form.category_id && data.length > 0) {
          setForm((f) => ({ ...f, category_id: data[0].id }));
        }
      })
      .catch(() => setCategories([]))
      .finally(() => setCatLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddCategory() {
    if (!newCatName.trim() || newCatName.trim().length < 2) return;
    setAddingCat(true);
    try {
      const cat = await createCategory(newCatName.trim());
      setCategories((prev) => [...prev, cat]);
      setForm((f) => ({ ...f, category_id: cat.id }));
      setNewCatName('');
    } catch {
      // silently ignore
    } finally {
      setAddingCat(false);
    }
  }

  function validate() {
    const e = {};
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) e.amount = 'Enter a valid positive amount.';
    if (!form.note || form.note.trim().length < 3) e.note = 'Note must be at least 3 characters.';
    if (!form.category_id) e.category_id = 'Please select a category.';
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
      let result;
      if (isEdit) {
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md bg-white sm:rounded-[36px] rounded-t-[36px] shadow-2xl overflow-hidden border border-stone-100 animate-in slide-in-from-bottom-4 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 bg-[#FAF6F0] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F2EAF9] text-[#7E45A8] flex items-center justify-center shadow-2xs">
              <Minus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#24151B]">{isEdit ? 'Edit Expense' : 'Record Expense'}</h2>
              <p className="text-[11px] text-stone-400">{isEdit ? 'Adjust transaction details' : 'Deduct from spendable balance'}</p>
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
              <h3 className="text-xl font-extrabold text-[#24151B]">{isEdit ? 'Expense Updated!' : 'Expense Recorded!'}</h3>
              <p className="text-xs text-stone-500 mt-1">Wallet balance adjusted in PostgreSQL.</p>
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

              {parseFloat(form.amount || 0) > cash && bank >= parseFloat(form.amount || 0) && form.balance_type === 'CASH' && !isEdit && (
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

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                Category <span className="text-rose-500">*</span>
              </label>
              {catLoading ? (
                <div className="flex items-center gap-2 text-xs text-stone-400 py-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading categories…</div>
              ) : (
                <select
                  value={form.category_id}
                  onChange={set('category_id')}
                  className={`w-full px-4 py-3 rounded-2xl border text-xs sm:text-sm bg-[#FAF6F0] text-[#24151B] focus:bg-white focus:outline-none focus:border-[#FF902B] transition-all ${errors.category_id ? 'border-rose-400' : 'border-stone-200'}`}
                >
                  <option value="">— Select Category —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
              {errors.category_id && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.category_id}</p>}

              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="+ Add custom category…"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); }}}
                  className="flex-1 px-3.5 py-2 rounded-full border border-stone-200 text-xs bg-[#FAF6F0] focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={addingCat}
                  className="px-3.5 py-2 rounded-full bg-[#F2EAF9] text-[#7E45A8] border border-purple-200 text-xs font-bold hover:bg-purple-100 transition disabled:opacity-50 cursor-pointer"
                >
                  {addingCat ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                Note / Payee <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Swiggy, Groceries, Movie…"
                value={form.note}
                onChange={set('note')}
                className={`w-full px-4 py-3 rounded-2xl border text-xs sm:text-sm bg-[#FAF6F0] text-[#24151B] focus:bg-white focus:outline-none focus:border-[#FF902B] transition-all ${errors.note ? 'border-rose-400' : 'border-stone-200'}`}
              />
              {errors.note && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.note}</p>}
            </div>

            {/* Payment Source */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">Pay From</label>
                <span className="text-[11px] text-stone-400">Total Spendable: ₹{(cash + bank).toFixed(2)}</span>
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
                      key={value}
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, balance_type: value }));
                        setErrors((e) => ({ ...e, amount: undefined }));
                      }}
                      className={`flex items-start gap-2.5 p-3 rounded-2xl border-2 transition cursor-pointer text-left ${isSelected ? 'border-[#331B24] bg-[#FAF6F0]' : 'border-stone-200 bg-white hover:border-stone-300'}`}
                    >
                      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${isSelected ? 'text-[#FF902B]' : 'text-stone-400'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected ? 'text-[#24151B]' : 'text-stone-600'}`}>{label}</span>
                          <span className={`text-[11px] font-bold ${available > 0 ? (isSelected ? 'text-[#075743]' : 'text-stone-700') : 'text-stone-400'}`}>
                            ₹{available.toFixed(2)}
                          </span>
                        </div>
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
              <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">Date</label>
              <input
                type="date"
                value={form.date}
                max={today()}
                onChange={set('date')}
                className="w-full px-4 py-2.5 rounded-2xl border border-stone-200 text-xs sm:text-sm bg-[#FAF6F0] text-[#24151B] focus:bg-white focus:outline-none focus:border-[#FF902B] transition"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3.5 rounded-full bg-[#331B24] text-white text-xs font-extrabold shadow-md hover:bg-black active:scale-95 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {status === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin text-[#C5F52A]" /> {isEdit ? 'Saving…' : 'Recording…'}</>
              ) : (
                <><Minus className="w-4 h-4 text-[#C5F52A]" /> {isEdit ? 'Save Changes' : 'Record Expense'}</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
