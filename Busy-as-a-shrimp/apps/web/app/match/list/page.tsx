import { Suspense } from "react";

import { MatchListFeature } from "@/features/match-list/match-list-feature";
import { MatchListSkeletonGrid } from "@/features/match-list/match-list-skeleton";

export default function MatchListPage() {
  return (
    <section className="min-h-[calc(100vh-4rem)] bg-slate-50 p-6">
      <div className="space-y-6">
        <Suspense fallback={<MatchListSkeletonGrid count={4} />}>
          <MatchListFeature />
        </Suspense>
      </div>
    </section>
  );
}
