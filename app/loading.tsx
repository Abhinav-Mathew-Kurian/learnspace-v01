export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-slate-950 animate-pulse">
      {/* Navbar skeleton */}
      <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-6 gap-4">
        <div className="h-6 w-32 bg-slate-700 rounded-lg" />
        <div className="flex-1" />
        <div className="h-8 w-20 bg-slate-700 rounded-lg" />
        <div className="h-8 w-24 bg-indigo-800 rounded-lg" />
      </div>

      {/* Hero skeleton */}
      <div className="px-6 py-20 max-w-5xl mx-auto text-center space-y-6">
        <div className="h-5 w-40 bg-slate-700 rounded-full mx-auto" />
        <div className="h-12 w-3/4 bg-slate-700 rounded-xl mx-auto" />
        <div className="h-12 w-1/2 bg-slate-800 rounded-xl mx-auto" />
        <div className="h-5 w-2/3 bg-slate-800 rounded mx-auto" />
        <div className="flex gap-4 justify-center pt-2">
          <div className="h-12 w-36 bg-indigo-700 rounded-xl" />
          <div className="h-12 w-36 bg-slate-700 rounded-xl" />
        </div>
      </div>

      {/* Category ticker */}
      <div className="h-12 bg-slate-900 border-y border-slate-800" />

      {/* Course grid skeleton */}
      <div className="bg-slate-50 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 w-48 bg-slate-200 rounded-lg mb-8 mx-auto" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                <div className="h-40 bg-slate-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 bg-slate-200 rounded" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded" />
                  <div className="h-6 w-20 bg-indigo-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features grid skeleton */}
      <div className="bg-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 w-56 bg-slate-200 rounded-lg mb-8 mx-auto" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-36 bg-slate-100 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
