import { Bell, Search, User } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export function AdminTopbar() {
  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-sm"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
          <Bell className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-medium">
          A
        </div>
      </div>
    </header>
  );
}