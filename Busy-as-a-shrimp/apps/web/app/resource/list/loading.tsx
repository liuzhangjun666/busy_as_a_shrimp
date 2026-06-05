function SkeletonPill() {
  return <div className="h-9 w-24 animate-pulse rounded-full bg-slate-200/80" />;
}

export default function ResourceListLoading() {
  return (
    <div className="space-y-6 px-4 py-6 md:px-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-8 w-40 animate-pulse rounded-xl bg-slate-200/80" />
        <div className="mt-3 h-4 w-72 animate-pulse rounded bg-slate-100" />
        <div className="mt-8 space-y-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 6 }).map((__, optionIndex) => (
                  <SkeletonPill key={optionIndex} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200/80" />
            <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-slate-100" />
            <div className="mt-4 flex gap-2">
              <SkeletonPill />
              <SkeletonPill />
              <SkeletonPill />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
