export default function PointsLoading() {
  return (
    <main className="mx-auto min-h-[calc(100vh-6rem)] max-w-6xl space-y-8 bg-slate-50 px-4 py-12 sm:px-6">
      <section className="h-40 animate-pulse rounded-[32px] border border-slate-100 bg-white shadow-[0_18px_60px_rgb(15,23,42,0.06)]" />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-[28px] border border-slate-100 bg-white shadow-[0_14px_40px_rgb(15,23,42,0.05)]"
          />
        ))}
      </section>
      <section className="space-y-4 rounded-[32px] border border-slate-100 bg-white p-6 shadow-[0_18px_60px_rgb(15,23,42,0.06)] sm:p-8">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-[28px] border border-slate-100 bg-slate-50"
          />
        ))}
      </section>
    </main>
  );
}
