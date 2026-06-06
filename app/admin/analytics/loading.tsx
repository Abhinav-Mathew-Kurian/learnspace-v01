export default function AnalyticsLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="h-7 w-32 bg-slate-200 animate-pulse rounded-lg mb-2" />
      <div className="h-4 w-72 bg-slate-100 animate-pulse rounded mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-xl p-5 bg-slate-100 animate-pulse h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="h-4 w-48 bg-slate-200 animate-pulse rounded" />
            </div>
            <div className="divide-y divide-slate-100">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="px-6 py-4 space-y-2 animate-pulse">
                  <div className="flex justify-between">
                    <div className="h-4 w-40 bg-slate-200 rounded" />
                    <div className="h-4 w-10 bg-slate-100 rounded" />
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-48 animate-pulse" />
    </div>
  );
}
