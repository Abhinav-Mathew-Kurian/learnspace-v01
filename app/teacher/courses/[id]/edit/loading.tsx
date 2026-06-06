function Sk({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}
export default function Loading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      <Sk className="h-4 w-28 mb-6" />
      <Sk className="h-7 w-48 mb-6" />
      <div className="space-y-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <Sk className="h-3 w-24 mb-2" />
            <Sk className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <Sk className="h-32 w-full rounded-lg" />
        <div className="flex gap-3 pt-2">
          <Sk className="h-10 w-28 rounded-lg" />
          <Sk className="h-10 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
