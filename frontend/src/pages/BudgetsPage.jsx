import React, { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, Check, Edit3, Pause, Play, Trash2, WalletCards } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  cancelRecurringExpense, createBudget, createRecurringExpense, deleteBudget,
  getBudgets, getCategories, getRecurringExpenses, recordRecurringExpense,
  updateBudget, updateRecurringExpense,
} from '../api/client';

const today = new Date().toISOString().slice(0, 10);
const currentMonth = today.slice(0, 7);
const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none';
const money = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value || 0));
const budgetDefaults = { amount: '', category: '' };
const recurringDefaults = {
  name: '', amount: '', category: '', balance_type: 'BANK', frequency: 'MONTHLY',
  start_date: today, next_due_date: today, end_date: '', note: '',
};

function Field({ label, ...props }) {
  return <label className="space-y-1 text-xs font-semibold text-slate-600"><span>{label}</span><input className={inputClass} {...props} /></label>;
}

function CategorySelect({ categories, value, onChange, label = 'Category (optional)' }) {
  return <label className="space-y-1 text-xs font-semibold text-slate-600"><span>{label}</span><select className={inputClass} value={value || ''} onChange={onChange}><option value="">Overall / none</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>;
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
      await load();
      await refreshUserData();
      if (successMessage) setNotice(successMessage);
    } catch (operationError) {
      setError(operationError.message);
    }
  };

  if (!isAuthenticated) {
    return <div className="rounded-3xl bg-white p-8 text-center shadow-sm"><h2 className="text-xl font-bold">Sign in to manage budgets</h2><button onClick={() => setAuthView('login')} className="mt-4 rounded-xl bg-orange-500 px-5 py-2 text-sm font-bold text-white">Sign In</button></div>;
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
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-black text-slate-900">Budgets & Recurring Expenses</h1><p className="mt-1 text-sm text-slate-500">Plan optional spending limits and record scheduled payments only when they happen.</p></div>
    {error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    {notice && <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}

    <section className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="flex items-center gap-2 font-bold"><WalletCards className="h-5 w-5 text-orange-500" />Monthly budget</h2><p className="text-xs text-slate-400">Account: {selectedAccount?.name}</p></div><Field label="Calendar month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></div>
      {!usage && !(budgets?.budgets || []).length ? <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">No budget configured for this month. Spending continues normally without warnings.</div> : <div className="space-y-4">
        {usage && <div className={`rounded-2xl border p-4 ${usage.warning ? 'border-rose-300 bg-rose-50' : 'border-slate-100 bg-slate-50'}`}><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase text-slate-500">Overall budget</p><p className="mt-1 text-lg font-black">₹{money(usage.spent)} <span className="text-sm font-normal text-slate-400">/ ₹{money(usage.amount)}</span></p></div>{usage.warning && <AlertTriangle className="h-7 w-7 text-rose-600" />}</div><div className="mt-3 h-3 overflow-hidden rounded-full bg-white"><div className={`h-full rounded-full ${usage.warning ? 'bg-rose-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(Number(usage.usage_percentage), 100)}%` }} /></div><p className={`mt-2 text-xs font-bold ${usage.warning ? 'text-rose-700' : 'text-slate-500'}`}>{usage.warning ? `${usage.usage_percentage}% used — ₹${money(Math.abs(Number(usage.remaining)))} over budget` : `₹${money(usage.remaining)} remaining (${usage.usage_percentage}% used)`}</p></div>}
        <div className="grid gap-3 sm:grid-cols-2">{(budgets?.budgets || []).filter((item) => item.category).map((budget) => <div key={budget.id} className={`rounded-2xl border p-4 ${budget.warning ? 'border-rose-300 bg-rose-50' : 'border-slate-100'}`}><div className="flex justify-between"><span className="text-sm font-bold">{budget.category_name}</span><span className="text-xs text-slate-500">₹{money(budget.spent)} / ₹{money(budget.amount)}</span></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className={`h-full rounded-full ${budget.warning ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(Number(budget.usage_percentage), 100)}%` }} /></div><div className="mt-2 flex justify-between text-xs"><span className={budget.warning ? 'font-bold text-rose-700' : 'text-slate-500'}>{budget.warning ? 'Budget reached' : `₹${money(budget.remaining)} left`}</span><button onClick={() => editBudget(budget)} className="font-bold text-orange-600"><Edit3 className="mr-1 inline h-3 w-3" />Edit</button></div></div>)}</div>
      </div>}
      <form className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3" onSubmit={submitBudget}><Field label={`${editingBudget ? 'Edit' : 'Add'} amount`} required type="number" min="0.01" value={budgetForm.amount} onChange={(event) => setBudgetForm({ ...budgetForm, amount: event.target.value })} /><CategorySelect categories={categories} value={budgetForm.category} onChange={(event) => setBudgetForm({ ...budgetForm, category: event.target.value })} /><button className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white">{editingBudget ? 'Update budget' : 'Add budget'}</button></form>
      {(budgets?.budgets || []).map((budget) => <div key={`manage-${budget.id}`} className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500"><span>{budget.category_name || 'Overall'} · ₹{money(budget.amount)}</span><button onClick={() => run(() => deleteBudget(budget.id), 'Budget deleted.')} className="font-bold text-rose-600"><Trash2 className="mr-1 inline h-3 w-3" />Delete</button></div>)}
    </section>

    <section className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100 space-y-4">
      <div><h2 className="flex items-center gap-2 font-bold"><CalendarClock className="h-5 w-5 text-orange-500" />Recurring expenses</h2><p className="text-xs text-slate-400">Nothing is deducted automatically. Record each scheduled occurrence when paid.</p></div>
      <div className="space-y-3">{recurring.length ? recurring.map((item) => <div key={item.id} className="rounded-2xl border border-slate-100 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold">{item.name}</p><p className="text-xs text-slate-500">₹{money(item.amount)} · {item.frequency} · {item.balance_type} · {item.category_name || 'Uncategorized'}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.status === 'OVERDUE' ? 'bg-rose-100 text-rose-700' : item.status === 'PAUSED' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'}`}>{item.status}</span></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs"><span>Next due: <strong>{item.next_due_date}</strong></span><div className="flex gap-2">{item.enabled && <button onClick={() => run(() => recordRecurringExpense(item.id, item.next_due_date), 'Expense recorded.')} className="rounded-lg bg-orange-500 px-3 py-2 font-bold text-white"><Check className="mr-1 inline h-3 w-3" />Record expense</button>}<button onClick={() => run(() => updateRecurringExpense(item.id, { enabled: !item.enabled }), item.enabled ? 'Recurring expense paused.' : 'Recurring expense resumed.')} className="rounded-lg border border-slate-200 px-3 py-2 font-bold">{item.enabled ? <><Pause className="mr-1 inline h-3 w-3" />Pause</> : <><Play className="mr-1 inline h-3 w-3" />Resume</>}</button><button onClick={() => editRecurring(item)} className="rounded-lg border border-slate-200 px-3 py-2 font-bold"><Edit3 className="h-3 w-3" /></button><button onClick={() => run(() => cancelRecurringExpense(item.id), 'Recurring expense cancelled.')} className="rounded-lg border border-rose-200 px-3 py-2 font-bold text-rose-600"><Trash2 className="h-3 w-3" /></button></div></div></div>) : <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No recurring expenses configured for this account.</div>}</div>
      <form className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2" onSubmit={submitRecurring}><Field label={`${editingRecurring ? 'Edit' : 'Create'} name`} required value={recurringForm.name} onChange={(event) => setRecurringForm({ ...recurringForm, name: event.target.value })} /><Field label="Amount" required type="number" min="0.01" value={recurringForm.amount} onChange={(event) => setRecurringForm({ ...recurringForm, amount: event.target.value })} /><CategorySelect categories={categories} value={recurringForm.category} onChange={(event) => setRecurringForm({ ...recurringForm, category: event.target.value })} /><label className="space-y-1 text-xs font-semibold text-slate-600"><span>Payment source</span><select className={inputClass} value={recurringForm.balance_type} onChange={(event) => setRecurringForm({ ...recurringForm, balance_type: event.target.value })}><option value="CASH">Cash</option><option value="BANK">Bank</option></select></label><label className="space-y-1 text-xs font-semibold text-slate-600"><span>Frequency</span><select className={inputClass} value={recurringForm.frequency} onChange={(event) => setRecurringForm({ ...recurringForm, frequency: event.target.value })}>{['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].map((value) => <option key={value}>{value}</option>)}</select></label><Field label="Start date" required type="date" value={recurringForm.start_date} onChange={(event) => setRecurringForm({ ...recurringForm, start_date: event.target.value })} /><Field label="Next due date" required type="date" value={recurringForm.next_due_date} onChange={(event) => setRecurringForm({ ...recurringForm, next_due_date: event.target.value })} /><Field label="End date (optional)" type="date" value={recurringForm.end_date} onChange={(event) => setRecurringForm({ ...recurringForm, end_date: event.target.value })} /><Field label="Note (min 3 chars)" required value={recurringForm.note} onChange={(event) => setRecurringForm({ ...recurringForm, note: event.target.value })} /><button className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white sm:col-span-2">{editingRecurring ? 'Update recurring expense' : 'Create recurring expense'}</button></form>
    </section>
  </div>;
}
