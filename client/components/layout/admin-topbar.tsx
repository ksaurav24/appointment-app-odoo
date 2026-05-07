import { Bell, Search, User } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export function AdminTopbar() {
  return (
    <header className="h-16 border-b border-cream2 bg-white dark:bg-card flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-light" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-pale dark:bg-muted border-[1.5px] border-cream2 dark:border-border rounded-[10px] focus:outline-none focus:border-forest text-sm font-sans transition-colors"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <button className="p-2 text-muted-foreground hover:bg-forest-pale dark:hover:bg-muted rounded-[10px] transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 bg-forest-pale text-forest rounded-full flex items-center justify-center font-medium text-sm">
          A
        </div>
      </div>
    </header>
  );
}