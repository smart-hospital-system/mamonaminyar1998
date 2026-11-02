"use client";

import type { SessionUser } from "@/lib/types";
import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({
  user,
  counts,
  children,
}: {
  user: SessionUser;
  counts: { pending: number; waitlist: number; unread: number };
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        user={user}
        counts={counts}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} unread={counts.unread} onOpenMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[92rem] flex-1 px-3 py-4 sm:px-5 sm:py-6">{children}</main>
        <footer className="border-t border-line px-5 py-3 text-[0.65rem] text-faint">
          Slotly · AI booking & business management · Demo workspace seeded with realistic data
        </footer>
      </div>
    </div>
  );
}
