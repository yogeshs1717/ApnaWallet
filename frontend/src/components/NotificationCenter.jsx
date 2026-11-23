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

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-stone-600 hover:text-[#FF902B] border border-stone-200/80 shadow-2xs hover:border-[#FF902B]/40 active:scale-95 transition-all cursor-pointer"
          aria-label="Notifications"
          aria-expanded={open}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 min-w-4.5 h-4.5 rounded-full bg-[#FF902B] px-1 text-[10px] font-extrabold leading-4.5 text-white text-center shadow-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[28px] border border-stone-100 bg-white shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-[#24151B]">Notifications</h3>
                  <p className="text-[11px] text-stone-400">{unreadCount} unread alerts</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-50 hover:text-stone-600 transition"
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {error && <p className="mt-2 rounded-xl bg-rose-50 p-2 text-xs text-rose-600">{error}</p>}

              <div className="mt-3 max-h-[min(26rem,65vh)] overflow-y-auto space-y-2">
                {!notifications.length && !error && (
                  <div className="py-8 text-center text-xs text-stone-400">You're all caught up!</div>
                )}
                {Object.entries(grouped).map(([kind, items]) => items.length > 0 && (
                  <div key={kind} className="space-y-1.5">
                    <p className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                      {kind === 'CREDIT_PAYMENT' ? 'Credit payments' : 'Recurring expenses'}
                    </p>
                    {items.map((item) => (
                      <NotificationItem key={item.id} item={item} onNavigate={navigate} onDismiss={dismiss} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {dailyReminder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="daily-reminder-title" className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF0E2] text-[#FF902B]">
              <Bell className="h-7 w-7" />
            </div>
            <div>
              <h2 id="daily-reminder-title" className="text-lg font-extrabold text-[#24151B]">
                Daily Expense Check-in
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                Did you have any expenses today? Keep your ledger current with one tap.
              </p>
            </div>
            <div className="grid gap-2 pt-2">
              <button
                type="button"
                onClick={() => respondDaily('updated')}
                className="w-full rounded-full bg-[#C5F52A] py-3 text-xs font-extrabold text-[#1C1014] hover:bg-[#B4E81E] active:scale-95 transition shadow-sm cursor-pointer"
              >
                + Record Today's Expenses
              </button>
              <button
                type="button"
                onClick={() => respondDaily('no_change')}
                className="w-full rounded-full border border-stone-200 py-3 text-xs font-bold text-stone-600 hover:bg-stone-50 active:scale-95 transition cursor-pointer"
              >
                No Expenses Today
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NotificationItem({ item, onNavigate, onDismiss }) {
  const Icon = item.kind === 'CREDIT_PAYMENT' ? CreditCard : CalendarClock;
  return (
    <div className={`rounded-2xl p-3 border transition ${item.is_read ? 'bg-[#FAF6F0] border-stone-100' : 'bg-white border-[#FF902B]/30 shadow-2xs'}`}>
      <div className="flex gap-2.5">
        <div className="w-7 h-7 rounded-full bg-[#FFF0E2] text-[#FF902B] flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-[#24151B]">{item.title}</p>
          <p className="mt-0.5 text-[11px] text-stone-500">{item.message}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${item.status === 'OVERDUE' ? 'bg-rose-100 text-rose-700' : 'bg-stone-100 text-stone-500'}`}>
              {item.status.replace('_', ' ')}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => onDismiss(item)}
                className="rounded-full px-2.5 py-1 text-[10px] font-bold text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => onNavigate(item)}
                className="rounded-full bg-[#24151B] px-3 py-1 text-[10px] font-bold text-white hover:bg-black transition flex items-center gap-1"
              >
                Open <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
