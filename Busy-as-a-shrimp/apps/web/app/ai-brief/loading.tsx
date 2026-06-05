export default function AiBriefLoading() {
  return (
    <div className="px-4 py-6 md:px-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="h-6 w-28 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-4 h-8 w-40 animate-pulse rounded-xl bg-slate-200/80" />
        <div className="mt-3 h-4 w-72 animate-pulse rounded bg-slate-100" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="h-5 w-24 animate-pulse rounded-full bg-slate-100" />
                <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="mt-4 h-5 w-4/5 animate-pulse rounded bg-slate-200/80" />
              <div className="mt-2 h-4 w-full animate-pulse rounded bg-slate-100" />
              <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
