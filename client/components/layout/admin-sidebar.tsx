import Link from 'next/link';
import { Home, Calendar, Users, Settings, Briefcase } from 'lucide-react';

export function AdminSidebar() {
  return (
    <aside className="hidden lg:flex w-64 flex-col bg-forest h-screen sticky top-0">
      <div className="flex h-[60px] items-center px-6">
        <h1 className="font-heading text-lg text-white">Appointly</h1>
      </div>
      <nav className="flex-1 p-4 space-y-0.5">
        <Link href="/admin/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/12 text-white/65 hover:text-white transition-colors text-[13px]">
          <Home className="w-4 h-4" /> Dashboard
        </Link>
        <Link href="/admin/appointments" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/12 text-white/65 hover:text-white transition-colors text-[13px]">
          <Calendar className="w-4 h-4" /> Appointments
        </Link>
        <Link href="/admin/organizations" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/12 text-white/65 hover:text-white transition-colors text-[13px]">
          <Briefcase className="w-4 h-4" /> Organizations
        </Link>
        <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/12 text-white/65 hover:text-white transition-colors text-[13px]">
          <Users className="w-4 h-4" /> Users
        </Link>
        <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/12 text-white/65 hover:text-white transition-colors text-[13px]">
          <Settings className="w-4 h-4" /> Settings
        </Link>
      </nav>
    </aside>
  );
}