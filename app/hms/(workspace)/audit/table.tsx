"use client";

import { Download, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useLang } from "@/components/hms/lang-provider";

export type AuditItem = {
  id: string;
  user_name: string;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: string | null;
  created_at: string;
};

const ENTITY: Record<string, [string, string]> = {
  patient: ["Patient", "بیمار"],
  prescription: ["Prescription", "نسخه"],
  lab: ["Laboratory", "لابراتوار"],
  imaging: ["Imaging", "اکسری"],
  bed: ["Bed", "بستر"],
  surgery: ["Surgery", "عملیات"],
  invoice: ["Invoice", "بل"],
  medicine: ["Medicine", "دوا"],
  settings: ["Settings", "تنظیمات"],
  license: ["Licence", "لایسنس"],
  user: ["Staff", "کارمند"],
  system: ["System", "سیستم"],
};

export function AuditTable({ items }: { items: AuditItem[] }) {
  const { tx, lang } = useLang();
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("all");

  const entities = useMemo(() => Array.from(new Set(items.map((i) => i.entity))), [items]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((i) => {
      if (entity !== "all" && i.entity !== entity) return false;
      if (!term) return true;
      return `${i.user_name} ${i.action} ${i.detail ?? ""} ${i.entity}`.toLowerCase().includes(term);
    });
  }, [items, q, entity]);

  function exportCsv() {
    const head = ["time", "user", "action", "entity", "entity_id", "detail"];
    const esc = (v: string | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = shown.map((i) => [i.created_at, i.user_name, i.action, i.entity, i.entity_id, i.detail].map(esc).join(","));
    const blob = new Blob([[head.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aybek-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex min-w-[12rem] flex-1 items-center gap-1.5 rounded-lg border px-2" style={{ borderColor: "var(--hms-border)" }}>
          <Search size={12} style={{ color: "var(--hms-faint)" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tx("Search the trail — name, action, patient…", "جستجو در ثبت وقایع — نام، اقدام، بیمار…")}
            className="h-8 w-full bg-transparent text-[0.72rem] outline-none"
          />
        </div>
        <select className="hms-input !h-8 max-w-[10rem] !text-[0.7rem]" value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="all">{tx("All record types", "همهٔ انواع")}</option>
          {entities.map((x) => (
            <option key={x} value={x}>{ENTITY[x] ? tx(ENTITY[x][0], ENTITY[x][1]) : x}</option>
          ))}
        </select>
        <button className="hms-btn hms-btn-sm" onClick={exportCsv} disabled={!shown.length}>
          <Download size={11} /> {tx("Export CSV", "خروجی CSV")}
        </button>
        <span className="text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>{shown.length} {tx("entries", "سطر")}</span>
      </div>

      <div className="mt-2 max-h-[32rem] overflow-auto rounded-lg border" style={{ borderColor: "var(--hms-border)" }}>
        <table className="w-full">
          <thead>
            <tr>
              <th className="hms-th">{tx("When", "زمان")}</th>
              <th className="hms-th">{tx("Who", "چه کسی")}</th>
              <th className="hms-th">{tx("Action", "اقدام")}</th>
              <th className="hms-th">{tx("Record", "سابقه")}</th>
              <th className="hms-th">{tx("Detail", "تفصیل")}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((i) => (
              <tr key={i.id} className="hms-row">
                <td className="hms-td whitespace-nowrap" data-num style={{ color: "var(--hms-muted)" }}>
                  {new Date(i.created_at).toLocaleString(lang === "fa" ? "fa-AF" : "en-GB", { dateStyle: "short", timeStyle: "short" })}
                </td>
                <td className="hms-td whitespace-nowrap font-medium">{i.user_name}</td>
                <td className="hms-td">
                  <span className="rounded px-1.5 py-0.5 text-[0.62rem] font-semibold" style={{ background: "var(--hms-brand-soft)", color: "var(--hms-brand-ink)" }}>
                    {i.action}
                  </span>
                </td>
                <td className="hms-td whitespace-nowrap" style={{ color: "var(--hms-muted)" }}>
                  {ENTITY[i.entity] ? tx(ENTITY[i.entity][0], ENTITY[i.entity][1]) : i.entity}
                </td>
                <td className="hms-td" style={{ color: "var(--hms-muted)" }}>{i.detail ?? "—"}</td>
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td className="hms-td text-center" colSpan={5} style={{ color: "var(--hms-faint)", padding: "1.5rem" }}>
                  {tx("Nothing matches this filter.", "چیزی با این فلتر نمی‌خواند.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
