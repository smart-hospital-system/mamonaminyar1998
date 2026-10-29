"use client";

import { CustomerModal } from "@/components/dashboard/customer-modal";
import { Avatar, Badge, Button, Card, EmptyState, Pager, Skeleton } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api, fetcher } from "@/lib/fetcher";
import type { Customer } from "@/lib/types";
import { cn, fmtDate, money, parseJson } from "@/lib/utils";
import {
  ChevronRight, Crown, Mail, Phone, Plus, Search, Sparkles, Trash2, UserPlus, Users, X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";

type Resp = { items: Customer[]; total: number };
const TAGS = ["all", "VIP", "Loyal", "New", "At-risk"];

export function CustomersClient({ initial, canDelete }: { initial: Resp; canDelete: boolean }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState("spent");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [confirm, setConfirm] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const key = `/api/customers?q=${encodeURIComponent(q)}&tag=${tag}&sort=${sort}&limit=200`;
  const { data, isLoading, mutate } = useSWR<Resp>(key, fetcher, {
    fallbackData: !q && tag === "all" && sort === "spent" ? initial : undefined,
    keepPreviousData: true,
  });

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const paged = rows.slice((page - 1) * pageSize, page * pageSize);
  // any filter change should drop the reader back to the first page
  const filterKey = `${q}|${tag}|${sort}`;
  const [seenFilter, setSeenFilter] = useState(filterKey);
  if (filterKey !== seenFilter) {
    setSeenFilter(filterKey);
    setPage(1);
  }

  async function remove() {
    if (!confirm) return;
    setDeleting(true);
    try {
      await api(`/api/customers/${confirm.id}`, "DELETE");
      toast.success("Customer removed", `${confirm.name} and their history were deleted.`);
      setConfirm(null);
      mutate();
    } catch (e) {
      toast.error("Couldn't delete", e instanceof Error ? e.message : undefined);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total customers", value: total, icon: <Users size={13} />, hint: "in your book" },
          { label: "VIP clients", value: rows.filter((c) => c.vip).length, icon: <Crown size={13} />, hint: "priority service" },
          {
            label: "Lifetime value",
            value: money(rows.reduce((a, c) => a + c.total_spent, 0), true),
            icon: <Sparkles size={13} />,
            hint: "across all clients",
          },
          {
            label: "Avg. visits",
            value: rows.length ? (rows.reduce((a, c) => a + c.visits, 0) / rows.length).toFixed(1) : 0,
            icon: <Users size={13} />,
            hint: "per customer",
          },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-3 p-3.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">{s.icon}</span>
            <div>
              <p className="text-[0.65rem] uppercase tracking-wide text-faint">{s.label}</p>
              <p className="text-[1.05rem] font-semibold leading-tight">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} className="input h-9 pl-9" placeholder="Search name, email or phone…" />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-faint hover:text-ink">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            {TAGS.map((t) => (
              <button
                key={t}
                onClick={() => setTag(t)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-[0.72rem] font-medium transition",
                  tag === t ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-surface-3 hover:text-ink"
                )}
              >
                {t === "all" ? "All clients" : t}
              </button>
            ))}
          </div>
          <select className="input h-9 w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="spent">Top spenders</option>
            <option value="recent">Most recent visit</option>
            <option value="visits">Most visits</option>
            <option value="newest">Newest clients</option>
            <option value="name">Name A–Z</option>
          </select>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            icon={<UserPlus size={13} />}
          >
            Add customer
          </Button>
        </div>
      </Card>

      {isLoading && !data ? (
        <Card className="divide-y divide-line">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-2.5 w-48" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users size={20} />}
            title={q ? "No matching customers" : "Your book is empty"}
            description={q ? "Try another name, email or phone number." : "Add your first client to start taking bookings and tracking loyalty."}
            action={
              <Button variant="primary" size="sm" onClick={() => setModalOpen(true)} icon={<Plus size={13} />}>
                Add customer
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-[0.62rem] uppercase tracking-[0.06em] text-faint">
                  <th className="px-4 py-2 font-semibold">Customer</th>
                  <th className="hidden px-3 py-2 font-semibold sm:table-cell">Contact</th>
                  <th className="px-3 py-2 text-center font-semibold">Visits</th>
                  <th className="px-3 py-2 text-right font-semibold">Lifetime</th>
                  <th className="hidden px-3 py-2 font-semibold lg:table-cell">Last visit</th>
                  <th className="hidden px-3 py-2 font-semibold lg:table-cell">Tags</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {paged.map((c) => {
                  const tags = parseJson<string[]>(c.tags, []);
                  return (
                    <tr key={c.id} className="table-row-hover border-b border-line/70 transition">
                      <td className="px-4 py-2.5">
                        <Link href={`/dashboard/customers/${c.id}`} className="flex items-center gap-2.5">
                          <Avatar name={c.name} size={30} />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate text-[0.8rem] font-medium">
                              {c.name}
                              {c.vip ? <Crown size={11} className="text-amber-500" /> : null}
                            </p>
                            <p className="truncate text-[0.64rem] text-faint">
                              {c.loyalty_points} pts · joined {fmtDate(c.created_at)}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="hidden px-3 py-2.5 sm:table-cell">
                        <p className="flex items-center gap-1 truncate text-[0.7rem] text-muted">
                          <Mail size={10} /> {c.email ?? "—"}
                        </p>
                        <p className="flex items-center gap-1 truncate text-[0.66rem] text-faint">
                          <Phone size={10} /> {c.phone ?? "—"}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-center text-[0.76rem] tabular-nums">{c.visits}</td>
                      <td className="px-3 py-2.5 text-right text-[0.76rem] font-semibold tabular-nums">{money(c.total_spent)}</td>
                      <td className="hidden px-3 py-2.5 text-[0.7rem] text-muted lg:table-cell">{c.last_visit_at ? fmtDate(c.last_visit_at) : "Never"}</td>
                      <td className="hidden px-3 py-2.5 lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {tags.slice(0, 2).map((t) => (
                            <Badge key={t} tone={t}>
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(c);
                              setModalOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          {canDelete && (
                            <button
                              onClick={() => setConfirm(c)}
                              className="rounded-lg p-1.5 text-faint transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                              aria-label="Delete customer"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                          <Link href={`/dashboard/customers/${c.id}`} className="rounded-lg p-1.5 text-faint transition hover:bg-surface-3 hover:text-ink">
                            <ChevronRight size={13} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager page={page} pageSize={pageSize} total={rows.length} onChange={setPage} />
        </Card>
      )}

      <CustomerModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        customer={editing}
        onSaved={() => mutate()}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        loading={deleting}
        danger
        title="Delete this customer?"
        confirmLabel="Delete customer"
        description={`${confirm?.name} and their bookings, payments and reviews will be permanently removed. This cannot be undone.`}
      />
    </div>
  );
}
