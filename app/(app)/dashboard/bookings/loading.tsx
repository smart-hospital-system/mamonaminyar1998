import { Skeleton, SkeletonTable } from "@/components/ui/primitives";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="card overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <Skeleton className="h-3 w-32" />
        </div>
        <SkeletonTable rows={8} cols={6} />
      </div>
    </div>
  );
}
