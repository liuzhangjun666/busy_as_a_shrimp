export default function SopLibraryLoading() {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <div className="h-6 w-32 animate-pulse rounded-full bg-slate-100" />
      <div className="mt-4 h-10 w-72 animate-pulse rounded-xl bg-slate-100" />
      <div className="mt-3 h-5 w-full animate-pulse rounded-lg bg-slate-100" />
      <div className="mt-2 h-5 w-4/5 animate-pulse rounded-lg bg-slate-100" />
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[2rem] border border-slate-200 p-5">
            <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-4 h-7 w-4/5 animate-pulse rounded-lg bg-slate-100" />
            <div className="mt-3 h-4 w-full animate-pulse rounded-lg bg-slate-100" />
            <div className="mt-2 h-4 w-3/4 animate-pulse rounded-lg bg-slate-100" />
            <div className="mt-4 h-24 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
