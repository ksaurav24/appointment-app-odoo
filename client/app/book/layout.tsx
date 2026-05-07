export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 font-sans flex items-start justify-center">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {/* Placeholder for Dynamic Header based on Organization Info */}
        <div className="h-4 bg-indigo-600 w-full" />
        <div className="p-6 sm:p-8">
           {children}
        </div>
      </div>
    </div>
  );
}