export default function CoursesLoading() {
  return (
    <div className="min-h-screen bg-slate-50 animate-pulse">
      {/* Navbar */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4">
        <div className="h-6 w-32 bg-slate-200 rounded-lg" />
        <div className="flex-1" />
        <div className="h-8 w-20 bg-slate-100 rounded-lg" />
        <div className="h-8 w-24 bg-indigo-100 rounded-lg" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Back link + heading */}
        <div className="h-4 w-24 bg-slate-200 rounded mb-6" />
        <div className="h-8 w-52 bg-slate-200 rounded-lg mb-2" />
        <div className="h-4 w-72 bg-slate-100 rounded mb-10" />

        {/* Course grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <div className="h-44 bg-slate-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 bg-slate-200 rounded" />
                <div className="h-3 w-1/2 bg-slate-100 rounded" />
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 bg-slate-200 rounded-full" />
                  <div className="h-3 w-24 bg-slate-100 rounded" />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="h-6 w-20 bg-indigo-100 rounded-full" />
                  <div className="h-8 w-24 bg-slate-100 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
