function Sk({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}
export default function Loading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div><Sk className="h-7 w-36 mb-2" /><Sk className="h-4 w-48" /></div>
        <Sk className="h-9 w-36 rounded-lg" />
      </div>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 animate-pulse">
            <Sk className="h-10 w-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2"><Sk className="h-4 w-1/2" /><Sk className="h-3 w-1/3" /></div>
            <Sk className="h-6 w-20 rounded-full" />
            <div className="flex gap-2"><Sk className="h-8 w-20 rounded-lg" /><Sk className="h-8 w-20 rounded-lg" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
