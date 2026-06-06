export default function CourseDetailLoading() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="h-4 w-32 bg-slate-200 animate-pulse rounded mb-6" />
      <div className="h-56 bg-slate-200 animate-pulse rounded-2xl mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="h-7 w-3/4 bg-slate-200 animate-pulse rounded" />
          <div className="h-4 w-full bg-slate-100 animate-pulse rounded" />
          <div className="h-4 w-5/6 bg-slate-100 animate-pulse rounded" />
          <div className="h-4 w-4/6 bg-slate-100 animate-pulse rounded" />
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
