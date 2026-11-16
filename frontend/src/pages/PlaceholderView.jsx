import React from 'react';
import { ArrowLeftRight, BarChart3, Briefcase, MoreHorizontal, Construction } from 'lucide-react';

export default function PlaceholderView({ section }) {
  const configs = {
    activity: {
      title: 'Activity & Transaction History',
      description: 'Search, filter, and review your historical transactions across Personal and secondary accounts.',
      icon: ArrowLeftRight,
      color: 'text-orange-600 bg-orange-50',
    },
    reports: {
      title: 'Financial Reports & Analytics',
      description: 'Monthly spending breakdowns, cash flow graphs, and exportable PDF/CSV financial summaries.',
      icon: BarChart3,
      color: 'text-amber-600 bg-amber-50',
    },
    portfolio: {
      title: 'Portfolio & Saved Wallet',
      description: 'Manage active savings goals, investments, and funds set aside in your Saved Wallet.',
      icon: Briefcase,
      color: 'text-emerald-600 bg-emerald-50',
    },
    more: {
      title: 'Settings & Account Preferences',
      description: 'Configure reminders, email alerts via Brevo, security settings, and data export options.',
      icon: MoreHorizontal,
      color: 'text-blue-600 bg-blue-50',
    },
  };

  const item = configs[section] || {
    title: 'Section Under Construction',
    description: 'This feature will be connected in upcoming development milestones.',
    icon: Construction,
    color: 'text-slate-600 bg-slate-50',
  };

  const Icon = item.icon;

  return (
    <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-sm text-center max-w-xl mx-auto my-8 space-y-4">
      <div className={`w-16 h-16 rounded-3xl ${item.color} mx-auto flex items-center justify-center shadow-xs`}>
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-slate-800">{item.title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
      
      <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-amber-700 bg-amber-50/50 py-2.5 px-4 rounded-xl">
        <Construction className="w-4 h-4 shrink-0" />
        <span>Scheduled for implementation in later ApnaWallet prompts.</span>
      </div>
    </div>
  );
}
