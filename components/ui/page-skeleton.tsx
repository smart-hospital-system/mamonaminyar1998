import { Skeleton, SkeletonCards, SkeletonTable } from "./primitives";

export function PageSkeleton({
  cards = 4,
  table = true,
  chart = false,
}: {
  cards?: number;
  table?: boolean;
  chart?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
      {cards > 0 && <SkeletonCards count={cards} />}
      {chart && (
        <div className="card p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-56 w-full" />
        </div>
      )}
      {table && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-7 w-24" />
          </div>
          <SkeletonTable rows={7} cols={5} />
        </div>
      )}
    </div>
  );
}
