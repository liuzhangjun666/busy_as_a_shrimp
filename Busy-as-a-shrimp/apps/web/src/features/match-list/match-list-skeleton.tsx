import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function MatchSkeletonCard() {
  return (
    <Card className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-4 p-6 pb-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32 bg-slate-200" />
          <Skeleton className="h-5 w-16 rounded-full bg-slate-200" />
        </div>
        <Skeleton className="h-4 w-48 bg-slate-200" />
      </CardHeader>
      <CardContent className="space-y-6 p-6 pt-0">
        <div className="space-y-3">
          <Skeleton className="h-3 w-20 bg-slate-200" />
          <div className="h-2.5 w-full rounded-full bg-slate-100" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <Skeleton className="h-3 w-16 bg-slate-200" />
            <div className="flex gap-1.5">
              <Skeleton className="h-6 w-14 rounded-lg bg-slate-200" />
              <Skeleton className="h-6 w-14 rounded-lg bg-slate-200" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-3 w-16 bg-slate-200" />
            <div className="flex gap-1.5">
              <Skeleton className="h-6 w-14 rounded-lg bg-slate-200" />
              <Skeleton className="h-6 w-14 rounded-lg bg-slate-200" />
            </div>
          </div>
        </div>
        <div className="h-20 w-full rounded-2xl border border-slate-100 bg-slate-50" />
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <Skeleton className="h-12 w-36 rounded-xl bg-slate-200" />
      </CardFooter>
    </Card>
  );
}

export function MatchListSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <MatchSkeletonCard key={`match-list-skeleton-${index}`} />
      ))}
    </div>
  );
}
