export default function AdminDashboardLoading() {
  return (
    <div className="p-8">
      <div className="h-8 w-40 bg-slate-200 animate-pulse rounded-lg mb-2" />
      <div className="h-4 w-52 bg-slate-100 animate-pulse rounded mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl p-5 bg-slate-100 animate-pulse h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="h-4 w-36 bg-slate-200 animate-pulse rounded" />
            </div>
            <div className="divide-y divide-slate-100">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="px-6 py-4 flex justify-between animate-pulse">
                  <div className="h-4 w-40 bg-slate-200 rounded" />
                  <div className="h-4 w-16 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
