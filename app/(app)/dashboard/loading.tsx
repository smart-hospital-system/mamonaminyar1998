import { Skeleton, SkeletonCards } from "@/components/ui/primitives";

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-3.5 w-72" />
      </div>
      <SkeletonCards count={4} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-5 h-56 w-full" />
        </div>
        <div className="card p-5">
          <Skeleton className="h-4 w-28" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
