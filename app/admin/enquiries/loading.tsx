export default function AdminEnquiriesLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-slate-200" />
        <div>
          <div className="h-5 w-28 bg-slate-200 rounded mb-1.5" />
          <div className="h-3 w-36 bg-slate-100 rounded" />
        </div>
      </div>
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-slate-200 mt-2 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex gap-3">
                  <div className="h-3.5 w-28 bg-slate-200 rounded" />
                  <div className="h-3.5 w-40 bg-slate-100 rounded" />
                </div>
                <div className="h-3.5 w-1/2 bg-slate-200 rounded" />
                <div className="h-3 w-32 bg-slate-100 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
