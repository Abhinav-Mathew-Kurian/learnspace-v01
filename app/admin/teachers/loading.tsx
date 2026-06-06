function Sk({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}
export default function Loading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-start mb-6">
        <div><Sk className="h-7 w-32 mb-2" /><Sk className="h-4 w-20" /></div>
        <Sk className="h-9 w-28 rounded-lg" />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 grid grid-cols-5 gap-4 px-4 py-3">
          {[...Array(5)].map((_, i) => <Sk key={i} className="h-3" />)}
        </div>
        <div className="divide-y divide-slate-100">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-4 px-4 py-3.5 animate-pulse">
              <Sk className="h-4" /><Sk className="h-4" /><Sk className="h-4 w-28" />
              <Sk className="h-5 w-16 rounded-full" /><Sk className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
