export default function TeacherCoursesLoading() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-32 bg-slate-200 animate-pulse rounded-lg mb-2" />
          <div className="h-4 w-48 bg-slate-100 animate-pulse rounded" />
        </div>
        <div className="h-10 w-36 bg-slate-200 animate-pulse rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden animate-pulse">
            <div className="h-40 bg-slate-200" />
            <div className="p-5 space-y-3">
              <div className="h-5 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
              <div className="flex gap-2 pt-2">
                <div className="h-8 flex-1 bg-slate-100 rounded-lg" />
                <div className="h-8 flex-1 bg-slate-200 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
