import React, { useEffect, useState } from 'react';
import { Bell, CalendarClock, ChevronRight, CreditCard, X } from 'lucide-react';
import { dismissNotification, getNotifications, markNotificationRead, respondToDailyReminder } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function NotificationCenter({ onNavigate, onOpenExpense }) {
  const { isAuthenticated, loading } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [dailyReminder, setDailyReminder] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    if (!isAuthenticated || loading) return;
    try {
      const data = await getNotifications();
      setNotifications(data.results || []);
      setUnreadCount(data.unread_count || 0);
      setDailyReminder((data.results || []).find((item) => item.kind === 'DAILY_EXPENSE' && !item.is_read) || null);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Unable to load notifications.');
    }
  };

  useEffect(() => {
    load();
    if (!isAuthenticated || loading) return undefined;
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [isAuthenticated, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = async (item) => {
    try {
      await dismissNotification(item.id);
      await load();
    } catch (dismissError) {
      setError(dismissError.message);
    }
  };

  const navigate = async (item) => {
    try {
      await markNotificationRead(item.id);
      await load();
    } catch (readError) {
      setError(readError.message);
    }
    setOpen(false);
    if (item.kind === 'DAILY_EXPENSE') onOpenExpense();
    else onNavigate(item.related_screen);
  };

  const respondDaily = async (response) => {
    try {
      await respondToDailyReminder(response);
      setDailyReminder(null);
      await load();
      if (response === 'updated') onOpenExpense();
    } catch (responseError) {
      setError(responseError.message);
    }
  };

  if (!isAuthenticated || loading) return null;
  const grouped = {
    CREDIT_PAYMENT: notifications.filter((item) => item.kind === 'CREDIT_PAYMENT'),
    RECURRING_EXPENSE: notifications.filter((item) => item.kind === 'RECURRING_EXPENSE'),
  };

  return <>
    <div className="relative">
      <button onClick={() => setOpen((value) => !value)} className="relative flex min-h-11 min-w-11 items-center justify-center rounded-xl p-2 text-slate-500 hover:bg-amber-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" aria-label="Notifications" aria-expanded={open}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-4 text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {open && <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-4"><div><h3 className="text-sm font-bold">Notifications</h3><p className="text-[11px] text-slate-400">{unreadCount} unread</p></div><button onClick={() => setOpen(false)} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1 text-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" aria-label="Close notifications"><X className="h-4 w-4" /></button></div>
        {error && <p className="bg-rose-50 px-4 py-2 text-xs text-rose-700">{error}</p>}
        <div className="max-h-[min(28rem,70vh)] overflow-y-auto p-2">
          {!notifications.length && !error && <div className="p-8 text-center text-sm text-slate-500">You're all caught up!</div>}
          {Object.entries(grouped).map(([kind, items]) => items.length > 0 && <div key={kind} className="mb-2"><p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{kind === 'CREDIT_PAYMENT' ? 'Credit payments' : 'Recurring expenses'}</p>{items.map((item) => <NotificationItem key={item.id} item={item} onNavigate={navigate} onDismiss={dismiss} />)}</div>)}
        </div>
      </div>}
    </div>
    {dailyReminder && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="daily-reminder-title" className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl sm:p-6"><div className="mb-4 flex items-center justify-between"><span className="rounded-xl bg-orange-50 p-2 text-orange-600"><Bell className="h-5 w-5" /></span><button onClick={() => respondDaily('close')} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1 text-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" aria-label="Close daily reminder"><X className="h-5 w-5" /></button></div><h2 id="daily-reminder-title" className="text-xl font-black text-slate-900">Today's expense update, please!</h2><p className="mt-2 text-sm text-slate-500">Keep your ledger current, or dismiss this reminder for today.</p><div className="mt-6 grid gap-2"><button onClick={() => respondDaily('updated')} className="min-h-11 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2">Updated</button><button onClick={() => respondDaily('no_change')} className="min-h-11 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2">No change</button></div></div></div>}
  </>;
}

function NotificationItem({ item, onNavigate, onDismiss }) {
  const Icon = item.kind === 'CREDIT_PAYMENT' ? CreditCard : CalendarClock;
  return <div className={`mb-1 rounded-xl p-3 ${item.is_read ? 'bg-slate-50' : 'bg-orange-50/70'}`}><div className="flex gap-2"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" /><div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-800">{item.title}</p><p className="mt-0.5 text-xs text-slate-600">{item.message}</p><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className={`text-[10px] font-bold ${item.status === 'OVERDUE' ? 'text-rose-600' : 'text-slate-400'}`}>{item.status.replace('_', ' ')}</span><div className="flex gap-1"><button onClick={() => onDismiss(item)} className="min-h-11 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Dismiss</button><button onClick={() => onNavigate(item)} className="min-h-11 rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Open <ChevronRight className="inline h-3 w-3" /></button></div></div></div></div></div>;
}
