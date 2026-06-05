export default function ContentLoading() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div className="h-8 w-36 animate-pulse rounded-md bg-slate-200" />
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-2/3 animate-pulse rounded-md bg-slate-200" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
              <div className="flex gap-2 pt-1">
                <div className="h-5 w-14 animate-pulse rounded-full bg-slate-200" />
                <div className="h-5 w-10 animate-pulse rounded-full bg-slate-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
