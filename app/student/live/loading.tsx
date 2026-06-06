function Sk({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}
export default function Loading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <Sk className="h-7 w-36 mb-2" /><Sk className="h-4 w-48 mb-6" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 animate-pulse">
            <Sk className="h-10 w-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2"><Sk className="h-4 w-1/2" /><Sk className="h-3 w-1/3" /></div>
            <div className="text-right space-y-1.5"><Sk className="h-6 w-20 rounded-full" /><Sk className="h-3 w-24" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
