export default function VideoPageLoading() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left */}
      <div className="flex-1 min-w-0 overflow-y-auto p-5">
        <div className="h-4 w-28 bg-slate-200 animate-pulse rounded mb-4" />
        {/* video player placeholder */}
        <div className="w-full aspect-video bg-slate-900 rounded-xl animate-pulse flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
        {/* title + description card */}
        <div className="mt-2 bg-white rounded-xl border border-slate-200 p-5 space-y-2 animate-pulse">
          <div className="h-5 bg-slate-200 rounded w-2/3" />
          <div className="h-3 bg-slate-100 rounded w-full" />
          <div className="h-3 bg-slate-100 rounded w-4/5" />
        </div>
      </div>
      {/* Right sidebar */}
      <div className="w-[300px] flex-shrink-0 border-l border-slate-200 bg-white flex flex-col h-screen">
        <div className="px-4 py-3.5 border-b border-slate-100">
          <div className="h-3 w-16 bg-slate-200 animate-pulse rounded mb-1" />
          <div className="h-4 w-40 bg-slate-200 animate-pulse rounded" />
        </div>
        <div className="flex-1 divide-y divide-slate-100">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="px-4 py-3 flex gap-3 animate-pulse">
              <div className="h-4 w-4 bg-slate-200 rounded-full flex-shrink-0 mt-0.5" />
              <div className="h-4 bg-slate-200 rounded flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
