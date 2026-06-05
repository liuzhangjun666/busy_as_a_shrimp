export default function AiMoneyPassLoading() {
  return (
    <div className="relative min-h-[calc(100vh-11rem)] rounded-[2rem] bg-slate-50 p-6 before:pointer-events-none before:absolute before:inset-0 before:opacity-50 before:[background-size:16px_16px] before:bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] md:p-8">
      <div className="relative z-10 space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="h-6 w-28 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-4 h-10 w-64 animate-pulse rounded-xl bg-slate-100" />
          <div className="mt-3 h-5 w-full max-w-3xl animate-pulse rounded-xl bg-slate-100" />
          <div className="mt-8 grid gap-4 xl:grid-cols-2">
            <div className="h-64 animate-pulse rounded-[1.5rem] bg-slate-100" />
            <div className="h-64 animate-pulse rounded-[1.5rem] bg-slate-100" />
          </div>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="h-8 w-48 animate-pulse rounded-xl bg-slate-100" />
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="h-44 animate-pulse rounded-[1.5rem] bg-slate-100" />
            <div className="h-44 animate-pulse rounded-[1.5rem] bg-slate-100" />
            <div className="h-44 animate-pulse rounded-[1.5rem] bg-slate-100" />
            <div className="h-44 animate-pulse rounded-[1.5rem] bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
