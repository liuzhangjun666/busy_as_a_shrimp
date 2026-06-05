function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-5 w-32 animate-pulse rounded-md bg-slate-200" />
      <div className="mt-3 h-4 w-24 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-14 animate-pulse rounded-full bg-slate-200" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

export default function MatchListLoading() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div className="h-8 w-32 animate-pulse rounded-md bg-slate-200" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
