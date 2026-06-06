function Sk({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}
export default function Loading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 flex flex-col sm:flex-row items-start gap-6 animate-pulse">
        <Sk className="h-20 w-20 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <Sk className="h-7 w-48" /><Sk className="h-4 w-36" /><Sk className="h-4 w-56" />
          <div className="flex gap-2 pt-2"><Sk className="h-8 w-28 rounded-lg" /><Sk className="h-8 w-28 rounded-lg" /></div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse space-y-3">
              <Sk className="h-5 w-36 mb-4" />
              {[...Array(4)].map((_, j) => <div key={j} className="flex justify-between"><Sk className="h-3 w-28" /><Sk className="h-3 w-40" /></div>)}
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse space-y-3">
            <Sk className="h-5 w-32 mb-4" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-lg border border-slate-100 p-3"><Sk className="h-4 w-3/4 mb-1" /><Sk className="h-2 w-full rounded-full" /></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
