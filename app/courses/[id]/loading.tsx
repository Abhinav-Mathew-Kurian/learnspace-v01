export default function CourseDetailLoading() {
  return (
    <div className="min-h-screen bg-slate-50 animate-pulse">
      {/* Navbar */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4">
        <div className="h-6 w-32 bg-slate-200 rounded-lg" />
        <div className="flex-1" />
        <div className="h-8 w-20 bg-slate-100 rounded-lg" />
        <div className="h-8 w-24 bg-indigo-100 rounded-lg" />
      </div>

      {/* Hero banner */}
      <div className="h-64 bg-slate-300 w-full" />

      <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left — course info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="h-8 w-3/4 bg-slate-200 rounded-lg" />
          <div className="flex gap-3">
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-4 w-20 bg-slate-200 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-slate-100 rounded" />
            <div className="h-3 w-full bg-slate-100 rounded" />
            <div className="h-3 w-2/3 bg-slate-100 rounded" />
          </div>

          {/* Video list */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="h-5 w-32 bg-slate-200 rounded" />
            </div>
            <div className="divide-y divide-slate-100">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-2/3 bg-slate-200 rounded" />
                    <div className="h-3 w-1/4 bg-slate-100 rounded" />
                  </div>
                  <div className="h-4 w-12 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — sticky CTA card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 sticky top-6">
            <div className="h-6 w-24 bg-indigo-100 rounded-lg" />
            <div className="h-10 w-full bg-indigo-200 rounded-xl" />
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-3 w-full bg-slate-100 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
