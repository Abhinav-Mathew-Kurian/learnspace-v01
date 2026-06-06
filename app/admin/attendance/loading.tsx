function Sk({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}
export default function Loading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <Sk className="h-7 w-40 mb-2" /><Sk className="h-4 w-64 mb-6" />
      <div className="flex flex-wrap gap-3 mb-6">
        {[...Array(3)].map((_, i) => <Sk key={i} className="h-9 w-40 rounded-lg" />)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse"><Sk className="h-7 w-12 mb-1" /><Sk className="h-3 w-24" /></div>)}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
              <Sk className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5"><Sk className="h-4 w-40" /><Sk className="h-3 w-28" /></div>
              <Sk className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
