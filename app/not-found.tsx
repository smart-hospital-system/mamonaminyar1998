import { LinkButton } from "@/components/ui/primitives";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface text-brand shadow-sm">
        <Compass size={24} />
      </div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-faint">404</p>
      <h1 className="mt-2 text-[1.5rem] font-semibold tracking-[-0.02em]">We couldn&apos;t find that page</h1>
      <p className="mt-2 max-w-sm text-[0.82rem] leading-relaxed text-muted">
        The link may be broken, or the record was removed. Head back to your dashboard and try again.
      </p>
      <div className="mt-5 flex gap-2">
        <LinkButton href="/dashboard" variant="primary">
          Back to dashboard
        </LinkButton>
        <LinkButton href="/book">Public booking page</LinkButton>
      </div>
    </div>
  );
}
