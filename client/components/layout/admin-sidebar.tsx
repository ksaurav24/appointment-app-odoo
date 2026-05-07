import Link from 'next/link';
import { Home, Calendar, Users, Settings, Briefcase } from 'lucide-react';

export function AdminSidebar() {
  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 bg-white dark:bg-slate-900 h-screen sticky top-0">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">BookingApp</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <Link href="/admin/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
          <Home className="w-5 h-5" /> Dashboard
        </Link>
        <Link href="/admin/appointments" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
          <Calendar className="w-5 h-5" /> Appointments
        </Link>
        <Link href="/admin/organizations" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
          <Briefcase className="w-5 h-5" /> Organizations
        </Link>
        <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
          <Users className="w-5 h-5" /> Users
        </Link>
        <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
          <Settings className="w-5 h-5" /> Settings
        </Link>
      </nav>
    </aside>
  );
}