function Sk({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}
export default function Loading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
      <Sk className="h-4 w-28 mb-6" />
      <div className="flex items-center gap-4 mb-8">
        <Sk className="h-14 w-14 rounded-full flex-shrink-0" />
        <div><Sk className="h-6 w-48 mb-2" /><Sk className="h-4 w-32" /></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 animate-pulse">
            <Sk className="h-4 w-32 mb-4" />
            {[...Array(4)].map((_, j) => <div key={j} className="flex justify-between"><Sk className="h-3 w-24" /><Sk className="h-3 w-32" /></div>)}
          </div>
        ))}
      </div>
    </div>
  );
}
