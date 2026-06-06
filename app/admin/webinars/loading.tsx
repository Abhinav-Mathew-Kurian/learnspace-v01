export default function AdminWebinarsLoading() {
  return (
    <div className="p-4 sm:p-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-5 w-24 bg-slate-200 rounded mb-1.5" />
          <div className="h-3 w-44 bg-slate-100 rounded" />
        </div>
        <div className="h-9 w-36 bg-indigo-100 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="h-40 bg-slate-200" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-3/4 bg-slate-200 rounded" />
              <div className="h-3 w-1/2 bg-slate-100 rounded" />
              <div className="flex items-center justify-between pt-1">
                <div className="h-5 w-20 bg-slate-100 rounded-full" />
                <div className="flex gap-2">
                  <div className="h-7 w-7 bg-slate-100 rounded-lg" />
                  <div className="h-7 w-7 bg-slate-100 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
