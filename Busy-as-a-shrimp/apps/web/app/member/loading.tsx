export default function MemberLoading() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <div className="space-y-2 text-center">
        <div className="mx-auto h-8 w-48 animate-pulse rounded-md bg-slate-200" />
        <div className="mx-auto h-4 w-72 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-4 h-10 w-28 animate-pulse rounded-md bg-slate-200" />
            <div className="mt-2 h-4 w-20 animate-pulse rounded bg-slate-200" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                </div>
              ))}
            </div>
            <div className="mt-6 h-10 w-full animate-pulse rounded-full bg-slate-200" />
          </div>
        ))}
      </div>
    </main>
  );
}
