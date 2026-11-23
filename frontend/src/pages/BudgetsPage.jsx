import React, { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, Check, Edit3, Pause, Play, Trash2, WalletCards, Plus, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  cancelRecurringExpense, createBudget, createRecurringExpense, deleteBudget,
  getBudgets, getCategories, getRecurringExpenses, recordRecurringExpense,
  updateBudget, updateRecurringExpense,
} from '../api/client';

const today = new Date().toISOString().slice(0, 10);
const currentMonth = today.slice(0, 7);
const inputClass = 'w-full rounded-2xl border border-stone-200 bg-[#FAF6F0] px-3.5 py-3 text-xs sm:text-sm text-[#24151B] focus:border-[#FF902B] focus:bg-white focus:outline-none transition-all';
const money = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value || 0));
const budgetDefaults = { amount: '', category: '' };
const recurringDefaults = {
  name: '', amount: '', category: '', balance_type: 'BANK', frequency: 'MONTHLY',
  start_date: today, next_due_date: today, end_date: '', note: '',
};

function Field({ label, ...props }) {
  return (
    <label className="space-y-1.5 text-xs font-bold text-stone-600 block">
      <span>{label}</span>
      <input className={inputClass} {...props} />
    </label>
  );
}

function CategorySelect({ categories, value, onChange, label = 'Category (optional)' }) {
  return (
    <label className="space-y-1.5 text-xs font-bold text-stone-600 block">
      <span>{label}</span>
      <select className={inputClass} value={value || ''} onChange={onChange}>
        <option value="">Overall / None</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>{category.name}</option>
        ))}
      </select>
    </label>
  );
}

export default function BudgetsPage() {
  const { isAuthenticated, selectedAccount, refreshUserData, setAuthView } = useAuth();
  const [month, setMonth] = useState(currentMonth);
  const [budgets, setBudgets] = useState(null);
  const [recurring, setRecurring] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgetForm, setBudgetForm] = useState(budgetDefaults);
  const [recurringForm, setRecurringForm] = useState(recurringDefaults);
  const [editingBudget, setEditingBudget] = useState(null);
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    if (!isAuthenticated || !selectedAccount?.id) return;
    try {
      const [budgetData, recurringData, categoryData] = await Promise.all([
        getBudgets({ account_id: selectedAccount.id, month }),
        getRecurringExpenses({ account_id: selectedAccount.id }),
        getCategories(),
      ]);
      setBudgets(budgetData);
      setRecurring(recurringData.results || []);
      setCategories(categoryData || []);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => { load(); }, [isAuthenticated, selectedAccount?.id, month]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (operation, successMessage = '') => {
    setError('');
    setNotice('');
    try {
      await operation();
      await Promise.all([load(), refreshUserData({ preserveUser: true, onlyAccounts: true })]);
      if (successMessage) setNotice(successMessage);
    } catch (operationError) {
      setError(operationError.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-[32px] bg-white p-8 sm:p-12 text-center border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] max-w-md mx-auto my-8 space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#FFF0E2] text-[#FF902B] mx-auto flex items-center justify-center">
          <WalletCards className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-[#24151B]">Sign in to manage budgets</h2>
        <p className="text-xs text-stone-400">
          Set monthly spending caps and monitor recurring bills and subscriptions.
        </p>
        <button
          type="button"
          onClick={() => setAuthView('login')}
          className="mt-4 w-full rounded-full bg-[#FF902B] py-3 text-xs font-extrabold text-white hover:bg-[#E0791B] active:scale-95 transition-all shadow-md cursor-pointer"
        >
          Sign In
        </button>
      </div>
    );
  }

  const submitBudget = (event) => {
    event.preventDefault();
    const payload = { account_id: selectedAccount.id, month: `${month}-01`, amount: budgetForm.amount, category: budgetForm.category || null };
    run(() => editingBudget ? updateBudget(editingBudget.id, { amount: budgetForm.amount, category: budgetForm.category || null }) : createBudget(payload), 'Budget saved.');
    setBudgetForm(budgetDefaults);
    setEditingBudget(null);
  };

  const submitRecurring = (event) => {
    event.preventDefault();
    const payload = { ...recurringForm, account_id: selectedAccount.id, category: recurringForm.category || null, end_date: recurringForm.end_date || null };
    run(() => editingRecurring ? updateRecurringExpense(editingRecurring.id, payload) : createRecurringExpense(payload), 'Recurring expense saved.');
    setRecurringForm(recurringDefaults);
    setEditingRecurring(null);
  };

  const editBudget = (budget) => {
    setEditingBudget(budget);
    setBudgetForm({ amount: budget.amount, category: budget.category || '' });
  };

  const editRecurring = (item) => {
    setEditingRecurring(item);
    setRecurringForm({
      name: item.name, amount: item.amount, category: item.category || '', balance_type: item.balance_type,
      frequency: item.frequency, start_date: item.start_date, next_due_date: item.next_due_date,
      end_date: item.end_date || '', note: item.note,
    });
  };

  const usage = budgets?.overall;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#24151B]">
          Budgets &amp; Subscriptions
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-stone-400">
          Plan optional spending limits and record scheduled payments automatically.
        </p>
      </div>

      {error && <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 font-semibold">{error}</div>}
      {notice && <div className="rounded-2xl bg-[#E4F5EE] border border-[#075743]/20 p-3.5 text-xs text-[#075743] font-semibold">{notice}</div>}

      {/* Monthly Budget Section */}
      <section className="rounded-[32px] bg-white p-6 sm:p-8 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base sm:text-lg font-extrabold text-[#24151B]">
              <WalletCards className="h-5 w-5 text-[#FF902B]" />
              <span>Monthly Budget</span>
            </h2>
            <p className="text-xs text-stone-400">Account: {selectedAccount?.name || 'Personal'}</p>
          </div>
          <div className="max-w-[200px]">
            <Field label="Calendar Month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </div>
        </div>

        {!usage && !(budgets?.budgets || []).length ? (
          <div className="rounded-2xl bg-[#FAF6F0] p-5 text-xs sm:text-sm text-stone-500 font-medium">
            No budget configured for this month. Spending continues normally without cap warnings.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overall Budget Hero Progress Card */}
            {usage && (
              <div className={`rounded-[28px] border p-5 sm:p-6 transition-all ${usage.warning ? 'border-rose-300 bg-rose-50/70' : 'border-[#462532] bg-[#331B24] text-white shadow-md'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${usage.warning ? 'text-rose-600' : 'text-[#D2B4ED]'}`}>
                      Overall Spending Cap
                    </p>
                    <p className="mt-1 text-2xl sm:text-3xl font-extrabold">
                      ₹{money(usage.spent)}{' '}
                      <span className={`text-sm font-normal ${usage.warning ? 'text-rose-500' : 'text-stone-300'}`}>
                        / ₹{money(usage.amount)}
                      </span>
                    </p>
                  </div>
                  {usage.warning && <AlertTriangle className="h-8 w-8 text-rose-600 animate-bounce" />}
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/20 p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${usage.warning ? 'bg-rose-500' : 'bg-[#C5F52A]'}`}
                    style={{ width: `${Math.min(Number(usage.usage_percentage), 100)}%` }}
                  />
                </div>

                <p className={`mt-2.5 text-xs font-bold ${usage.warning ? 'text-rose-700' : 'text-[#D2B4ED]'}`}>
                  {usage.warning
                    ? `${usage.usage_percentage}% used — ₹${money(Math.abs(Number(usage.remaining)))} over budget!`
                    : `₹${money(usage.remaining)} remaining safe to spend (${usage.usage_percentage}% used)`}
                </p>
              </div>
            )}

            {/* Category Budgets Grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              {(budgets?.budgets || []).filter((item) => item.category).map((budget) => (
                <div
                  key={budget.id}
                  className={`rounded-2xl border p-4 transition-all ${budget.warning ? 'border-rose-300 bg-rose-50' : 'border-stone-200/60 bg-[#FAF6F0]'}`}
                >
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs sm:text-sm font-extrabold text-[#24151B]">{budget.category_name}</span>
                    <span className="text-xs text-stone-500 font-semibold">₹{money(budget.spent)} / ₹{money(budget.amount)}</span>
                  </div>
                  <div className="mt-2.5 h-2 rounded-full bg-stone-200/70 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${budget.warning ? 'bg-rose-500' : 'bg-[#C5F52A]'}`}
                      style={{ width: `${Math.min(Number(budget.usage_percentage), 100)}%` }}
                    />
                  </div>
                  <div className="mt-2.5 flex justify-between items-center text-xs">
                    <span className={budget.warning ? 'font-extrabold text-rose-700' : 'text-stone-500 font-semibold'}>
                      {budget.warning ? 'Budget Exceeded' : `₹${money(budget.remaining)} left`}
                    </span>
                    <button
                      type="button"
                      onClick={() => editBudget(budget)}
                      className="font-extrabold text-[#FF902B] hover:text-[#E0791B] flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="h-3 w-3" /> Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form: Add or Edit Budget */}
        <form className="grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-3" onSubmit={submitBudget}>
          <Field
            label={`${editingBudget ? 'Edit' : 'Add'} Amount (₹)`}
            required
            type="number"
            min="0.01"
            step="any"
            placeholder="0.00"
            value={budgetForm.amount}
            onChange={(event) => setBudgetForm({ ...budgetForm, amount: event.target.value })}
          />
          <CategorySelect
            categories={categories}
            value={budgetForm.category}
            onChange={(event) => setBudgetForm({ ...budgetForm, category: event.target.value })}
          />
          <button
            type="submit"
            className="mt-6 rounded-full bg-[#C5F52A] px-5 py-3 text-xs font-extrabold text-[#1C1014] hover:bg-[#B4E81E] active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            {editingBudget ? 'Update Budget' : '+ Add Spending Cap'}
          </button>
        </form>

        {/* Existing Budgets Management List */}
        {(budgets?.budgets || []).map((budget) => (
          <div key={`manage-${budget.id}`} className="flex items-center justify-between border-t border-stone-100 pt-3 text-xs text-stone-500">
            <span className="font-semibold">{budget.category_name || 'Overall'} • ₹{money(budget.amount)}</span>
            <button
              type="button"
              onClick={() => run(() => deleteBudget(budget.id), 'Budget deleted.')}
              className="font-extrabold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        ))}
      </section>

      {/* Recurring Expenses & Subscriptions */}
      <section className="rounded-[32px] bg-white p-6 sm:p-8 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-base sm:text-lg font-extrabold text-[#24151B]">
            <CalendarClock className="h-5 w-5 text-[#FF902B]" />
            <span>Recurring Bills &amp; Subscriptions</span>
          </h2>
          <p className="text-xs text-stone-400">Netflix, Rent, SIPs, Gym &amp; Internet</p>
        </div>

        {/* Recurring List */}
        {!recurring.length ? (
          <div className="rounded-2xl bg-[#FAF6F0] p-5 text-xs sm:text-sm text-stone-400">
            No recurring expenses registered. Add recurring payments below to get automated tracking.
          </div>
        ) : (
          <div className="space-y-2.5">
            {recurring.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${item.is_active ? 'bg-[#FAF6F0] border-stone-200/60' : 'bg-stone-50 border-stone-100 opacity-60'
                  }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-[#24151B]">{item.name}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white text-stone-500 border border-stone-200">
                      {item.frequency}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Next due: {item.next_due_date} • From {item.balance_type}
                  </p>
                </div>

                <div className="flex items-center gap-3 justify-between sm:justify-end">
                  <span className="text-base font-extrabold text-[#24151B]">₹{money(item.amount)}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => run(() => recordRecurringExpense(item.id, item.next_due_date), 'Expense recorded.')}
                      className="px-3 py-1.5 rounded-full bg-[#C5F52A] text-[#1C1014] text-xs font-extrabold hover:bg-[#B4E81E] active:scale-95 transition cursor-pointer"
                      title="Record payment now"
                    >
                      Record Now
                    </button>
                    <button
                      type="button"
                      onClick={() => editRecurring(item)}
                      className="p-1.5 rounded-full bg-white text-stone-400 hover:text-stone-700 border border-stone-200 cursor-pointer"
                      title="Edit recurring rule"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => run(() => cancelRecurringExpense(item.id), 'Recurring expense removed.')}
                      className="p-1.5 rounded-full bg-white text-rose-500 hover:text-rose-700 border border-stone-200 cursor-pointer"
                      title="Delete rule"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recurring Form */}
        <form className="grid gap-3 border-t border-stone-100 pt-5 sm:grid-cols-3" onSubmit={submitRecurring}>
          <Field
            label="Name / Service"
            required
            placeholder="e.g. Netflix, Wi-Fi"
            value={recurringForm.name}
            onChange={(e) => setRecurringForm({ ...recurringForm, name: e.target.value })}
          />
          <Field
            label="Amount (₹)"
            required
            type="number"
            min="0.01"
            step="any"
            placeholder="0.00"
            value={recurringForm.amount}
            onChange={(e) => setRecurringForm({ ...recurringForm, amount: e.target.value })}
          />
          <CategorySelect
            categories={categories}
            value={recurringForm.category}
            onChange={(e) => setRecurringForm({ ...recurringForm, category: e.target.value })}
          />
          <label className="space-y-1.5 text-xs font-bold text-stone-600 block">
            <span>Payment Method</span>
            <select
              className={inputClass}
              value={recurringForm.balance_type}
              onChange={(e) => setRecurringForm({ ...recurringForm, balance_type: e.target.value })}
            >
              <option value="BANK">Bank</option>
              <option value="CASH">Cash</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-bold text-stone-600 block">
            <span>Frequency</span>
            <select
              className={inputClass}
              value={recurringForm.frequency}
              onChange={(e) => setRecurringForm({ ...recurringForm, frequency: e.target.value })}
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </label>
          <Field
            label="Next Due Date"
            type="date"
            value={recurringForm.next_due_date}
            onChange={(e) => setRecurringForm({ ...recurringForm, next_due_date: e.target.value })}
          />
          <button
            type="submit"
            className="sm:col-span-3 rounded-full bg-[#FF902B] py-3.5 text-xs font-extrabold text-white hover:bg-[#E0791B] active:scale-95 transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>{editingRecurring ? 'Update Subscription Rule' : 'Save Recurring Rule'}</span>
          </button>
        </form>
      </section>
    </div>
  );
}
