function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}

export default function StudentDashboardLoading() {
  return (
    <div className="p-8">
      <Skeleton className="h-8 w-56 mb-2" />
      <Skeleton className="h-4 w-40 mb-8" />

      {/* stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl p-5 bg-slate-100 animate-pulse">
            <div className="h-7 w-10 bg-slate-200 rounded mb-2" />
            <div className="h-3 w-24 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      {/* section heading */}
      <Skeleton className="h-5 w-40 mb-4" />

      {/* course cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden animate-pulse">
            <div className="h-36 bg-slate-200" />
            <div className="p-4 space-y-2.5">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
              <div className="h-2 bg-slate-100 rounded-full mt-3" />
              <div className="flex justify-between mt-1">
                <div className="h-3 w-16 bg-slate-100 rounded" />
                <div className="h-3 w-12 bg-slate-100 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* upcoming live */}
      <Skeleton className="h-5 w-48 mb-4" />
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 flex gap-4 animate-pulse">
            <div className="h-10 w-10 bg-slate-200 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
