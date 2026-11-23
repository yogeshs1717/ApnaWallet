import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, FileSpreadsheet, Landmark, Loader2, PiggyBank, WalletCards, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { downloadReportCsv, downloadReportPdf, getCategories, getReportSummary, getReportTrends } from '../api/client';

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
        const [summaryData, trendData] = await Promise.all([
          getReportSummary(params),
          getReportTrends(params),
        ]);
        if (!active) return;
        setSummary(summaryData);
        setTrends(trendData);
        setCategoryData(summaryData.categories || []);
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
      <div className="rounded-[32px] bg-white p-8 sm:p-12 text-center border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] max-w-md mx-auto my-8 space-y-4">
        <h2 className="text-xl font-extrabold text-[#24151B]">Sign in to view reports</h2>
        <p className="text-xs text-stone-400">Reports are generated authoritatively from your Neon PostgreSQL ledger.</p>
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

  const exportParams = { period, account_id: selectedAccount?.id, date_from: dateFrom, date_to: dateTo, category };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Title & Export Pills */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#24151B]">Financial Reports</h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-400">
            {summary ? `${summary.date_from} to ${summary.date_to}` : 'Authoritative ledger analytics'}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => downloadReportCsv(exportParams).catch((err) => setError(err.message))} 
            className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-xs font-extrabold text-[#24151B] shadow-2xs hover:bg-[#FAF6F0] active:scale-95 transition cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-[#075743]" /> 
            <span>CSV</span>
          </button>
          <button 
            type="button"
            onClick={() => downloadReportPdf(exportParams).catch((err) => setError(err.message))} 
            className="flex items-center gap-1.5 rounded-full bg-[#331B24] text-white px-5 py-2.5 text-xs font-extrabold shadow-md hover:bg-black active:scale-95 transition cursor-pointer"
          >
            <Download className="h-4 w-4 text-[#C5F52A]" /> 
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {error && <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 font-semibold">{error}</div>}

      {/* Filter Parameters */}
      <section className="rounded-[28px] border border-stone-200/60 bg-white p-5 shadow-[0_8px_30px_rgba(51,27,36,0.04)]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-xs font-bold text-stone-600">
            <span>Period Type</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-[#FAF6F0] px-3.5 py-2.5 text-xs text-[#24151B] focus:bg-white focus:outline-none"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </label>

          <label className="space-y-1 text-xs font-bold text-stone-600">
            <span>Category Filter</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-[#FAF6F0] px-3.5 py-2.5 text-xs text-[#24151B] focus:bg-white focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-bold text-stone-600">
            <span>From Date</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-[#FAF6F0] px-3.5 py-2 text-xs text-[#24151B] focus:bg-white focus:outline-none"
            />
          </label>

          <label className="space-y-1 text-xs font-bold text-stone-600">
            <span>To Date</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-[#FAF6F0] px-3.5 py-2 text-xs text-[#24151B] focus:bg-white focus:outline-none"
            />
          </label>
        </div>
      </section>

      {/* Loading */}
      {loading && (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-stone-400">
          <Loader2 className="w-7 h-7 animate-spin text-[#FF902B]" />
          <p className="text-xs font-medium">Generating reports…</p>
        </div>
      )}

      {/* Summary Bento Cards */}
      {!loading && summary && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[28px] bg-white p-5 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Money Received</span>
            <div className="mt-2 text-2xl font-extrabold text-[#075743]">₹{money(summary.income)}</div>
          </div>

          <div className="rounded-[28px] bg-white p-5 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Ordinary Expenses</span>
            <div className="mt-2 text-2xl font-extrabold text-[#E11D48]">₹{money(summary.expenses)}</div>
          </div>

          <div className="rounded-[28px] bg-[#331B24] text-white p-5 shadow-[0_12px_30px_rgba(51,27,36,0.15)] border border-[#462532]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D2B4ED]">Net Income Surplus</span>
            <div className="mt-2 text-2xl font-extrabold text-[#FAF6F0]">
              ₹{money(summary.net_income_minus_expenses)}
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-5 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Available Balance</span>
            <div className="mt-2 text-2xl font-extrabold text-[#FF902B]">₹{money(summary.available_balance)}</div>
          </div>
        </section>
      )}

      {/* Cash Flow Visual Chart */}
      {!loading && trends && trends.points && trends.points.length > 0 && (
        <section className="rounded-[32px] bg-white p-6 sm:p-8 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-extrabold text-[#24151B]">Cash Flow Trend</h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 font-bold text-[#075743]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#075743]" /> Income
              </span>
              <span className="flex items-center gap-1 font-bold text-[#E11D48]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48]" /> Expenses
              </span>
            </div>
          </div>

          <div className="grid gap-2 pt-4">
            {trends.points.map((pt, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-stone-500">
                  <span>{pt.label || pt.date}</span>
                  <span>+₹{money(pt.income)} / -₹{money(pt.expenses)}</span>
                </div>
                <div className="h-3 rounded-full bg-[#FAF6F0] overflow-hidden flex gap-1 p-0.5">
                  <div
                    className="h-full rounded-full bg-[#C5F52A] transition-all duration-500"
                    style={{ width: `${Math.min(100, (Number(pt.income) / maxTrend) * 100)}%` }}
                    title={`Income: ₹${money(pt.income)}`}
                  />
                  <div
                    className="h-full rounded-full bg-[#331B24] transition-all duration-500"
                    style={{ width: `${Math.min(100, (Number(pt.expenses) / maxTrend) * 100)}%` }}
                    title={`Expenses: ₹${money(pt.expenses)}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Spending Breakdown by Category */}
      {!loading && categoryData && categoryData.length > 0 && (
        <section className="rounded-[32px] bg-white p-6 sm:p-8 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] space-y-4">
          <h2 className="text-base sm:text-lg font-extrabold text-[#24151B]">Category Breakdown</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {categoryData.map((cat, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-[#FAF6F0] space-y-2">
                <div className="flex justify-between text-xs font-bold text-[#24151B]">
                  <span>{cat.category_name || 'Uncategorized'}</span>
                  <span>₹{money(cat.total_amount)}</span>
                </div>
                <div className="h-2 rounded-full bg-stone-200/70 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#FF902B]"
                    style={{ width: `${Math.min(100, Number(cat.percentage || 0))}%` }}
                  />
                </div>
                <div className="text-[10px] text-stone-400 text-right">
                  {cat.percentage}% of total expenses
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
