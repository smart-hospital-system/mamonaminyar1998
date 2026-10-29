"use client";

import { ArrowLeft, Printer } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Bar({
  no,
  subtitle,
  template,
  templates,
}: {
  no: string;
  subtitle: string;
  template?: number;
  templates?: { id: number; name: string }[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  return (
    <div className="no-print mx-auto mb-3 flex w-[210mm] max-w-[96vw] flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-[0.72rem] font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft size={13} /> Back
      </button>
      <div className="min-w-0">
        <p className="truncate text-[0.74rem] font-semibold text-slate-800">{no}</p>
        <p className="truncate text-[0.62rem] text-slate-500">{subtitle}</p>
      </div>
      {templates && templates.length > 0 && (
        <select
          className="ml-auto h-8 rounded-md border border-slate-300 bg-white px-2 text-[0.72rem] text-slate-700"
          value={template}
          onChange={(e) => {
            const next = new URLSearchParams(sp.toString());
            next.set("template", e.target.value);
            router.replace(`?${next.toString()}`);
          }}
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.id}. {t.name}
            </option>
          ))}
        </select>
      )}
      <button
        onClick={() => window.print()}
        className={`${templates && templates.length > 0 ? "" : "ml-auto "}flex h-8 items-center gap-1.5 rounded-md bg-slate-900 px-3 text-[0.72rem] font-semibold text-white hover:bg-slate-800`}
      >
        <Printer size={12} /> Print / save PDF
      </button>
    </div>
  );
}

export function PrintBar(props: { no: string; subtitle: string; template?: number; templates?: { id: number; name: string }[] }) {
  return (
    <Suspense fallback={<div className="h-12" />}>
      <Bar {...props} />
    </Suspense>
  );
}
