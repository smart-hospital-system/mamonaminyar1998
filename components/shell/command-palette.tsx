"use client";

import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { ArrowRight, CalendarDays, CornerDownLeft, Search, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ALL_NAV } from "./nav";

type Customer = { id: string; name: string; email: string | null; phone: string | null; total_spent: number; visits: number };
type Booking = { id: string; customer_name: string; service_name: string; start_at: string; status: string };

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    (async () => {
      try {
        const [c, b] = await Promise.all([
          fetch("/api/customers?limit=50").then((r) => r.json()),
          fetch("/api/bookings?limit=20&sort=upcoming").then((r) => r.json()),
        ]);
        setCustomers(c.items ?? []);
        setBookings(b.items ?? []);
      } catch {
        /* ignore */
      }
    })();
  }, [open]);

  const results = useMemo(() => {
    const term = q.toLowerCase().trim();
    const navMatches = ALL_NAV.filter((n) => n.label.toLowerCase().includes(term)).slice(0, term ? 5 : 8);
    const customerMatches = term
      ? customers.filter((c) => c.name.toLowerCase().includes(term) || (c.email ?? "").toLowerCase().includes(term) || (c.phone ?? "").includes(term)).slice(0, 5)
      : customers.slice(0, 3);
    const bookingMatches = term
      ? bookings.filter((b) => b.customer_name.toLowerCase().includes(term) || b.service_name.toLowerCase().includes(term)).slice(0, 4)
      : [];
    return { navMatches, customerMatches, bookingMatches };
  }, [q, customers, bookings]);

  const flat = [
    ...results.navMatches.map((n) => ({ kind: "nav" as const, href: n.href, label: n.label })),
    ...results.customerMatches.map((c) => ({ kind: "customer" as const, href: `/dashboard/customers/${c.id}`, label: c.name })),
    ...results.bookingMatches.map((b) => ({ kind: "booking" as const, href: `/dashboard/bookings?q=${encodeURIComponent(b.customer_name)}`, label: b.customer_name })),
  ];

  function go(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <Modal open={open} onClose={onClose} size="md" className="!p-0">
      <div className="-mx-5 -my-4">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Search size={15} className="text-faint" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, flat.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              }
              if (e.key === "Enter" && flat[active]) go(flat[active].href);
            }}
            placeholder="Search pages, customers, bookings…"
            className="flex-1 bg-transparent text-[0.85rem] outline-none placeholder:text-faint"
          />
          <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[0.6rem] text-faint">esc</kbd>
        </div>

        <div className="max-h-[22rem] overflow-y-auto p-2">
          {flat.length === 0 && <p className="px-3 py-8 text-center text-[0.75rem] text-faint">No matches for “{q}”.</p>}

          {results.navMatches.length > 0 && (
            <p className="px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-wider text-faint">Navigate</p>
          )}
          {results.navMatches.map((n, i) => {
            const Icon = n.icon;
            return (
              <button
                key={n.href}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(n.href)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.78rem] transition",
                  active === i ? "bg-brand-soft text-brand-ink" : "hover:bg-surface-2"
                )}
              >
                <Icon size={14} className="text-muted" />
                <span className="flex-1">{n.label}</span>
                <ArrowRight size={12} className="text-faint" />
              </button>
            );
          })}

          {results.customerMatches.length > 0 && (
            <p className="mt-2 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-wider text-faint">Customers</p>
          )}
          {results.customerMatches.map((c, i) => {
            const idx = results.navMatches.length + i;
            return (
              <button
                key={c.id}
                onMouseEnter={() => setActive(idx)}
                onClick={() => go(`/dashboard/customers/${c.id}`)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.78rem] transition",
                  active === idx ? "bg-brand-soft text-brand-ink" : "hover:bg-surface-2"
                )}
              >
                <User size={14} className="text-muted" />
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-[0.65rem] text-faint">{c.visits} visits</span>
              </button>
            );
          })}

          {results.bookingMatches.length > 0 && (
            <p className="mt-2 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-wider text-faint">Bookings</p>
          )}
          {results.bookingMatches.map((b, i) => {
            const idx = results.navMatches.length + results.customerMatches.length + i;
            return (
              <button
                key={b.id}
                onMouseEnter={() => setActive(idx)}
                onClick={() => go(`/dashboard/bookings?q=${encodeURIComponent(b.customer_name)}`)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.78rem] transition",
                  active === idx ? "bg-brand-soft text-brand-ink" : "hover:bg-surface-2"
                )}
              >
                <CalendarDays size={14} className="text-muted" />
                <span className="flex-1 truncate">{b.customer_name}</span>
                <span className="text-[0.65rem] text-faint">{b.service_name}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-line px-3 py-2 text-[0.6rem] text-faint">
          <span className="flex items-center gap-1">
            <CornerDownLeft size={10} /> to open
          </span>
          <span>↑ ↓ to navigate</span>
        </div>
      </div>
    </Modal>
  );
}
