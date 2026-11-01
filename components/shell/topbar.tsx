"use client";

import { Avatar, Badge } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn, relativeTime } from "@/lib/utils";
import type { SessionUser } from "@/lib/types";
import {
  Bell, CheckCheck, ChevronDown, Command, LogOut, Menu, Plus, Search, Settings, Sparkles, User as UserIcon, Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ALL_NAV, titleFor } from "./nav";
import { CommandPalette } from "./command-palette";

type Notice = { id: string; type: string; title: string; body: string | null; link: string | null; read: number; created_at: string };

export function Topbar({
  user,
  unread,
  onOpenMenu,
}: {
  user: SessionUser;
  unread: number;
  onOpenMenu: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { title, subtitle } = titleFor(pathname);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notice[]>([]);
  const [unreadCount, setUnreadCount] = useState(unread);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    setNotifOpen(false);
    setUserOpen(false);
  }, [pathname]);

  async function loadNotifications() {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data.items ?? []);
      setUnreadCount(data.unread ?? 0);
    } catch {
      /* ignore */
    }
  }

  async function markAll() {
    setUnreadCount(0);
    setNotifications((n) => n.map((x) => ({ ...x, read: 1 })));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-bg/85 px-3 backdrop-blur-md sm:px-5">
      <button onClick={onOpenMenu} className="rounded-lg p-1.5 text-muted hover:bg-surface-3 hover:text-ink lg:hidden">
        <Menu size={18} />
      </button>

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[0.9rem] font-semibold leading-tight tracking-[-0.01em]">{title}</h2>
        <p className="hidden truncate text-[0.68rem] leading-tight text-faint sm:block">{subtitle}</p>
      </div>

      <button
        onClick={() => setPaletteOpen(true)}
        className="group flex h-8 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-[0.72rem] text-faint transition hover:border-brand/30 hover:text-muted md:w-56"
      >
        <Search size={13} />
        <span className="hidden flex-1 text-left md:block">Search anything…</span>
        <span className="hidden items-center gap-0.5 rounded border border-line bg-surface-2 px-1 py-0.5 text-[0.6rem] font-medium md:flex">
          <Command size={9} />K
        </span>
      </button>

      <Link
        href="/dashboard/bookings?new=1"
        className="btn btn-primary h-8 px-2.5 text-[0.72rem]"
      >
        <Plus size={14} />
        <span className="hidden sm:inline">New booking</span>
      </Link>

      <ThemeToggle className="hidden sm:inline-flex" />

      {/* notifications */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => {
            setNotifOpen((o) => !o);
            if (!notifOpen) loadNotifications();
          }}
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:bg-surface-3 hover:text-ink"
          aria-label="Notifications"
        >
          <Bell size={15} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.55rem] font-bold text-white ring-2 ring-bg">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="anim-pop absolute right-0 top-10 z-50 w-[21rem] overflow-hidden rounded-xl border border-line bg-surface shadow-xl sm:w-[23rem]">
            <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
              <p className="text-[0.78rem] font-semibold">Notifications</p>
              <button onClick={markAll} className="flex items-center gap-1 text-[0.66rem] font-medium text-brand hover:underline">
                <CheckCheck size={12} /> Mark all read
              </button>
            </div>
            <div className="max-h-[19rem] overflow-y-auto">
              {notifications.length === 0 && (
                <p className="px-3 py-8 text-center text-[0.72rem] text-faint">You&apos;re all caught up.</p>
              )}
              {notifications.slice(0, 8).map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "/dashboard/notifications"}
                  onClick={() => {
                    setNotifOpen(false);
                    if (!n.read) {
                      setUnreadCount((c) => Math.max(0, c - 1));
                      fetch("/api/notifications", {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ id: n.id }),
                      });
                    }
                  }}
                  className={cn("flex gap-2.5 border-b border-line/60 px-3 py-2.5 transition hover:bg-surface-2", !n.read && "bg-brand-soft/40")}
                >
                  <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg", n.read ? "bg-surface-3 text-faint" : "bg-brand-soft text-brand")}>
                    <Sparkles size={12} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[0.74rem] font-medium">{n.title}</span>
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
                    </span>
                    {n.body && <span className="mt-0.5 line-clamp-2 block text-[0.68rem] leading-snug text-muted">{n.body}</span>}
                    <span className="mt-1 block text-[0.6rem] text-faint">{relativeTime(n.created_at)}</span>
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/dashboard/notifications"
              onClick={() => setNotifOpen(false)}
              className="block border-t border-line px-3 py-2 text-center text-[0.7rem] font-medium text-brand hover:bg-surface-2"
            >
              View all notifications
            </Link>
          </div>
        )}
      </div>

      {/* user menu */}
      <div className="relative" ref={userRef}>
        <button
          onClick={() => setUserOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-lg p-0.5 transition hover:bg-surface-3"
          aria-label="Account menu"
        >
          <Avatar name={user.name} size={28} color="#7c6bff" />
          <ChevronDown size={12} className="hidden text-faint sm:block" />
        </button>

        {userOpen && (
          <div className="anim-pop absolute right-0 top-10 z-50 w-56 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
            <div className="flex items-center gap-2.5 border-b border-line px-3 py-3">
              <Avatar name={user.name} size={34} color="#7c6bff" />
              <div className="min-w-0">
                <p className="truncate text-[0.78rem] font-semibold leading-tight">{user.name}</p>
                <p className="truncate text-[0.65rem] text-faint">{user.email}</p>
              </div>
            </div>
            <div className="px-3 py-2">
              <Badge tone={user.role} className="capitalize">
                {user.role} access
              </Badge>
            </div>
            <div className="border-t border-line p-1">
              <Link href="/dashboard/settings" className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[0.75rem] text-muted transition hover:bg-surface-2 hover:text-ink">
                <UserIcon size={13} /> My profile
              </Link>
              <Link href="/dashboard/settings" className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[0.75rem] text-muted transition hover:bg-surface-2 hover:text-ink">
                <Settings size={13} /> Business settings
              </Link>
              <Link href="/book" className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[0.75rem] text-muted transition hover:bg-surface-2 hover:text-ink">
                <Sparkles size={13} /> View booking page
              </Link>
              <Link href="/hms" className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[0.75rem] font-medium text-teal-700 transition hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-500/10">
                <Stethoscope size={13} /> Aybek Hospital workspace
              </Link>
              <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[0.75rem] text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10">
                <LogOut size={13} /> Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}

export { ALL_NAV };
