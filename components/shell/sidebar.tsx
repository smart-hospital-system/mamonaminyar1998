"use client";

import { Avatar } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { Role, SessionUser } from "@/lib/types";
import { ChevronsLeft, LogOut, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { navForRole } from "./nav";

type Counts = { pending: number; waitlist: number; unread: number };

export function Sidebar({
  user,
  counts,
  mobileOpen,
  onCloseMobile,
}: {
  user: SessionUser;
  counts: Counts;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("slotly-sidebar") === "collapsed");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    onCloseMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("slotly-sidebar", next ? "collapsed" : "expanded");
    } catch {
      /* ignore */
    }
  }

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const sections = navForRole(user.role as Role);

  const badgeValue = (key?: "pending" | "waitlist" | "unread") => {
    if (!key) return 0;
    return counts[key] ?? 0;
  };

  return (
    <>
      {mobileOpen && (
        <div className="anim-fade fixed inset-0 z-40 bg-[#0a0912]/50 backdrop-blur-[2px] lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-line bg-surface transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          collapsed ? "lg:w-[4.5rem]" : "lg:w-[15.5rem]",
          "w-[16.5rem]",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* brand */}
        <div className={cn("flex h-14 items-center gap-2.5 border-b border-line px-4", collapsed && "lg:justify-center lg:px-0")}>
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.6rem] bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
              <Sparkles size={15} />
            </span>
            <span className={cn("min-w-0", collapsed && "lg:hidden")}>
              <span className="block text-[0.84rem] font-semibold leading-tight tracking-tight">Slotly</span>
              <span className="block truncate text-[0.62rem] leading-tight text-faint">Lumière Studio</span>
            </span>
          </Link>
          <button onClick={onCloseMobile} className="ml-auto rounded-lg p-1 text-faint hover:bg-surface-3 hover:text-ink lg:hidden">
            <X size={16} />
          </button>
        </div>

        {/* nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3">
          {sections.map((section, si) => (
            <div key={section.title} className={cn(si > 0 && "mt-4")}>
              <p className={cn("mb-1 px-2 text-[0.6rem] font-semibold uppercase tracking-[0.09em] text-faint", collapsed && "lg:hidden")}>
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  const badge = badgeValue(item.badge);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-active={active}
                      title={collapsed ? item.label : undefined}
                      className={cn("nav-item group relative", collapsed && "lg:justify-center lg:px-0")}
                    >
                      <Icon size={16} className="shrink-0" />
                      <span className={cn("flex-1 truncate", collapsed && "lg:hidden")}>{item.label}</span>
                      {item.hint && !collapsed && (
                        <span className="rounded bg-emerald-50 px-1 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                          {item.hint}
                        </span>
                      )}
                      {badge > 0 && (
                        <span
                          className={cn(
                            "flex h-[1.05rem] min-w-[1.05rem] items-center justify-center rounded-full bg-brand px-1 text-[0.6rem] font-semibold text-white",
                            collapsed && "lg:absolute lg:right-1.5 lg:top-1 lg:h-1.5 lg:min-w-1.5 lg:p-0 lg:text-transparent"
                          )}
                        >
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* footer */}
        <div className="border-t border-line p-2.5">
          <div className={cn("mb-1.5 rounded-xl border border-line bg-surface-2 p-2.5", collapsed && "lg:hidden")}>
            <div className="flex items-center gap-2">
              <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Sparkles size={12} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[0.7rem] font-semibold">AI credits</p>
                <p className="text-[0.6rem] text-faint">Unlimited on Premium</p>
              </div>
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-3">
              <div className="h-full w-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
            </div>
          </div>

          <div className={cn("flex items-center gap-2 rounded-xl p-1.5 hover:bg-surface-2", collapsed && "lg:justify-center")}>
            <Avatar name={user.name} size={30} color="#7c6bff" />
            <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
              <p className="truncate text-[0.75rem] font-medium leading-tight">{user.name}</p>
              <p className="truncate text-[0.62rem] capitalize leading-tight text-faint">{user.role}</p>
            </div>
            <button
              onClick={signOut}
              title="Sign out"
              className={cn("rounded-lg p-1.5 text-faint transition hover:bg-surface-3 hover:text-ink", collapsed && "lg:hidden")}
            >
              <LogOut size={14} className={signingOut ? "animate-pulse" : ""} />
            </button>
          </div>

          <button
            onClick={toggleCollapsed}
            className="mt-1 hidden w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[0.68rem] font-medium text-faint transition hover:bg-surface-3 hover:text-ink lg:flex"
          >
            <ChevronsLeft size={14} className={cn("transition-transform", collapsed && "rotate-180")} />
            <span className={cn(collapsed && "hidden")}>Collapse</span>
          </button>
        </div>
      </aside>
    </>
  );
}
