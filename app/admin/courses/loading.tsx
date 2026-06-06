function Sk({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}
export default function Loading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Sk className="h-7 w-28 mb-2" /><Sk className="h-4 w-20 mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
            <div className="h-36 bg-slate-200" />
            <div className="p-5 space-y-2.5">
              <Sk className="h-4 w-3/4" /><Sk className="h-3 w-1/2" /><Sk className="h-3 w-1/3" />
              <div className="flex gap-2 mt-4"><Sk className="h-8 flex-1 rounded-lg" /><Sk className="h-8 w-10 rounded-lg" /></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
