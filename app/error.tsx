"use client";

import { Button } from "@/components/ui/primitives";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10">
        <AlertTriangle size={22} />
      </div>
      <h1 className="text-[1.2rem] font-semibold tracking-[-0.01em]">Something went sideways</h1>
      <p className="mt-1.5 max-w-sm text-[0.8rem] leading-relaxed text-muted">
        {error.message || "An unexpected error occurred while loading this view."}
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <Button variant="outline" onClick={() => window.location.assign("/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
