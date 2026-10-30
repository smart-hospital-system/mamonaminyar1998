import Link from "next/link";
import { Compass, Home, Stethoscope } from "lucide-react";

/**
 * The page nobody plans to see. It belongs to the hospital, not to the booking
 * demo that shares this repository: from here a member of staff can only go back
 * to the command centre or to the patient register.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border" style={{ borderColor: "var(--hms-border)", background: "var(--hms-surface)", color: "var(--hms-brand)" }}>
        <Compass size={24} />
      </div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--hms-faint)" }}>
        404
      </p>
      <h1 className="mt-2 text-[1.4rem] font-semibold tracking-[-0.02em]">
        This page is not here
      </h1>
      <p className="mt-1 text-[0.95rem] font-medium" lang="fa" dir="rtl">
        این صفحه پیدا نشد
      </p>
      <p className="mt-2 max-w-md text-[0.82rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>
        The link may be broken, or the record was removed from this installation. Nothing was
        deleted by opening it.
      </p>
      <p className="mt-1 max-w-md text-[0.78rem] leading-relaxed" style={{ color: "var(--hms-muted)" }} lang="fa" dir="rtl">
        ممکن است لینک شکسته باشد یا آن رکورد از این نسخه حذف شده باشد. با باز کردن این صفحه هیچ چیزی
        حذف نمی‌شود.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link href="/hms" className="hms-btn hms-btn-primary">
          <Home size={12} /> Command centre / مرکز فرمان
        </Link>
        <Link href="/hms/patients" className="hms-btn">
          <Stethoscope size={12} /> Patients / مریضان
        </Link>
      </div>
    </div>
  );
}
