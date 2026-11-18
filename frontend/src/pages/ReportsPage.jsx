import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, FileSpreadsheet, Landmark, Loader2, PiggyBank, WalletCards } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { downloadReportCsv, downloadReportPdf, getCategories, getReportCategories, getReportSummary, getReportTrends } from '../api/client';

const money = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value || 0));

export default function ReportsPage() {
  const { isAuthenticated, selectedAccount, setAuthView } = useAuth();
  const [period, setPeriod] = useState('monthly');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      const params = {
        period,
        account_id: selectedAccount?.id,
        date_from: dateFrom,
        date_to: dateTo,
        category,
      };
      try {
        const [summaryData, trendData, categoryResult] = await Promise.all([
          getReportSummary(params),
          getReportTrends(params),
          getReportCategories(params),
        ]);
        if (!active) return;
        setSummary(summaryData);
        setTrends(trendData);
        setCategoryData(categoryResult.categories || []);
      } catch (err) {
        if (active) setError(err.message || 'Unable to load financial reports.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [isAuthenticated, selectedAccount?.id, period, dateFrom, dateTo, category]);

  const maxTrend = useMemo(() => {
    const values = (trends?.points || []).flatMap((point) => [Number(point.income || 0), Number(point.expenses || 0)]);
    return Math.max(...values, 1);
  }, [trends]);

  if (!isAuthenticated) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-black text-slate-900">Sign in to view reports</h2>
        <p className="mt-2 text-sm text-slate-500">Reports are generated only from your authenticated financial records.</p>
        <button onClick={() => setAuthView('login')} className="mt-4 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white">Sign In</button>
      </div>
    );
  }

  const cards = summary ? [
    ['Money received', summary.income, 'text-emerald-700'],
    ['Ordinary expenses', summary.expenses, 'text-rose-700'],
    ['Net income minus expenses', summary.net_income_minus_expenses, 'text-slate-900'],
    ['Available balance', summary.available_balance, 'text-orange-700'],
  ] : [];

  const exportParams = { period, account_id: selectedAccount?.id, date_from: dateFrom, date_to: dateTo, category };

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Financial Reports</h1>
          <p className="mt-1 text-sm text-slate-500">{summary ? `${summary.date_from} to ${summary.date_to}` : 'Authoritative ledger reports'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadReportCsv(exportParams).catch((err) => setError(err.message))} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> CSV
          </button>
          <button onClick={() => downloadReportPdf(exportParams).catch((err) => setError(err.message))} className="flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-3 text-xs font-bold text-white">
            <Download className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-xs font-bold text-slate-600">
            <span>Period</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm">
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-bold text-slate-600">
            <span>From</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
          </label>
          <label className="space-y-1 text-xs font-bold text-slate-600">
            <span>To</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
          </label>
          <label className="space-y-1 text-xs font-bold text-slate-600">
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm">
              <option value="">All categories</option>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        </div>
      </section>

      {loading && <div className="flex items-center gap-2 rounded-2xl bg-white p-4 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading report...</div>}
      {error && <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertCircle className="h-4 w-4" /> {error}</div>}

      {!loading && summary && (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map(([label, value, color]) => (
              <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
                <p className={`mt-2 text-xl font-black ${color}`}>₹{money(value)}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="font-black text-slate-900">Income vs Expense</h2>
              <div className="mt-4 flex h-44 items-end gap-2 overflow-hidden rounded-2xl bg-slate-50 px-3 pb-3" role="img" aria-label="Income and expense trend chart">
                {(trends?.points || []).map((point, index) => (
                  <div key={`${point.label}-${index}`} className="flex h-full min-w-3 flex-1 items-end justify-center gap-1">
                    <div title={`Income ₹${money(point.income)}`} className="w-2 rounded-t-full bg-emerald-500" style={{ height: `${Math.max(2, (Number(point.income) / maxTrend) * 100)}%` }} />
                    <div title={`Expense ₹${money(point.expenses)}`} className="w-2 rounded-t-full bg-orange-500" style={{ height: `${Math.max(2, (Number(point.expenses) / maxTrend) * 100)}%` }} />
                  </div>
                ))}
              </div>
              {(trends?.points || []).length === 0 && <p className="mt-3 text-sm text-slate-400">No chart activity for this period.</p>}
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="font-black text-slate-900">Expense by category</h2>
              <div className="mt-4 space-y-3">
                {categoryData.length ? categoryData.map((item) => {
                  const max = Math.max(...categoryData.map((row) => Number(row.amount)), 1);
                  return (
                    <div key={item.category_id || item.name}>
                      <div className="mb-1 flex justify-between text-xs"><span className="font-bold text-slate-600">{item.name}</span><span className="text-slate-500">₹{money(item.amount)}</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-500" style={{ width: `${(Number(item.amount) / max) * 100}%` }} /></div>
                    </div>
                  );
                }) : <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No expense categories in this period.</p>}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl bg-slate-900 p-4 text-white"><WalletCards className="h-5 w-5 text-amber-400" /><p className="mt-3 text-xs text-slate-300">Cash</p><p className="font-black">₹{money(summary.cash_balance)}</p></div>
            <div className="rounded-2xl bg-amber-50 p-4"><Landmark className="h-5 w-5 text-amber-700" /><p className="mt-3 text-xs text-slate-500">Bank</p><p className="font-black text-slate-900">₹{money(summary.bank_balance)}</p></div>
            <div className="rounded-2xl bg-emerald-50 p-4"><PiggyBank className="h-5 w-5 text-emerald-700" /><p className="mt-3 text-xs text-slate-500">Saved Wallet</p><p className="font-black text-slate-900">₹{money(summary.saved_wallet)}</p></div>
            <div className="rounded-2xl bg-blue-50 p-4"><WalletCards className="h-5 w-5 text-blue-700" /><p className="mt-3 text-xs text-slate-500">Investment cost basis</p><p className="font-black text-slate-900">₹{money(summary.investment_cost_basis)}</p></div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-xs text-slate-500">Money lent outstanding</p><p className="mt-1 font-black">₹{money(summary.lending_outstanding)}</p></div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-xs text-slate-500">Credit outstanding</p><p className="mt-1 font-black">₹{money(summary.credit_outstanding)}</p></div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-xs text-slate-500">Realized gain/loss</p><p className={`mt-1 font-black ${Number(summary.realized_gain_loss) < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>₹{money(summary.realized_gain_loss)}</p></div>
          </section>

          {(summary.budgets || []).length > 0 && (
            <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="font-black text-slate-900">Budget vs Actual</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {summary.budgets.map((budget) => (
                  <div key={budget.scope} className="rounded-2xl bg-slate-50 p-3">
                    <div className="flex justify-between text-xs"><span className="font-bold">{budget.scope}</span><span>₹{money(budget.spent)} / ₹{money(budget.amount)}</span></div>
                    <div className="mt-2 h-2 rounded-full bg-white"><div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(Number(budget.usage_percentage), 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
