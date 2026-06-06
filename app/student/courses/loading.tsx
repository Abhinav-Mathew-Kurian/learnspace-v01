export default function CoursesLoading() {
  return (
    <div className="p-8">
      <div className="h-8 w-40 bg-slate-200 animate-pulse rounded-lg mb-2" />
      <div className="h-4 w-60 bg-slate-100 animate-pulse rounded mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden animate-pulse">
            <div className="h-40 bg-slate-200" />
            <div className="p-5 space-y-3">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
              <div className="h-3 bg-slate-100 rounded w-full mt-1" />
              <div className="h-2 bg-slate-100 rounded-full mt-2" />
              <div className="h-9 bg-slate-200 rounded-xl mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
