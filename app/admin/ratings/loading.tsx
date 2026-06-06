export default function AdminRatingsLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-slate-200" />
        <div>
          <div className="h-5 w-24 bg-slate-200 rounded mb-1.5" />
          <div className="h-3 w-36 bg-slate-100 rounded" />
        </div>
      </div>
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-28 bg-slate-200 rounded" />
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, s) => (
                      <div key={s} className="w-3 h-3 bg-slate-200 rounded-sm" />
                    ))}
                  </div>
                </div>
                <div className="h-3 w-3/4 bg-slate-100 rounded" />
                <div className="h-3 w-1/2 bg-slate-100 rounded" />
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <div className="h-7 w-20 bg-slate-100 rounded-lg" />
                <div className="h-7 w-7 bg-slate-100 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
