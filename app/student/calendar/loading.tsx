function Sk({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}
export default function Loading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <Sk className="h-7 w-32 mb-2" /><Sk className="h-4 w-56 mb-6" />
      <div className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
        <div className="flex justify-between items-center mb-4">
          <Sk className="h-6 w-32" />
          <div className="flex gap-2">{[...Array(3)].map((_, i) => <Sk key={i} className="h-8 w-20 rounded-lg" />)}</div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {[...Array(7)].map((_, i) => <Sk key={i} className="h-4" />)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {[...Array(35)].map((_, i) => <Sk key={i} className="h-20 rounded" />)}
        </div>
      </div>
    </div>
  );
}
