import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/primitives";
import { Sparkles, CalendarCheck, Wallet, BarChart3, ShieldCheck } from "lucide-react";

export const metadata = { title: "Sign in · Slotly" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* ------------------------------------------------ brand panel */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-[#14102b] p-10 text-white lg:flex xl:w-[48%]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-violet-600/35 blur-[100px]" />
          <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-fuchsia-500/25 blur-[120px]" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-500/25 blur-[110px]" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
        </div>

        <div className="relative z-10 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <Sparkles size={17} />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight">Slotly</p>
            <p className="text-[0.68rem] text-white/50">Booking OS for small business</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[0.7rem] font-medium text-white/70">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Live demo · seeded with 6 months of data
          </p>
          <h1 className="text-[2.35rem] font-semibold leading-[1.1] tracking-[-0.03em]">
            Your whole business,
            <br />
            <span className="bg-gradient-to-r from-violet-300 via-fuchsia-200 to-indigo-200 bg-clip-text text-transparent">
              beautifully booked.
            </span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            Reservations, staff rotas, payments and marketing — with an AI assistant that fills the
            gaps in your calendar while you sleep.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {[
              { icon: <CalendarCheck size={15} />, label: "Smart scheduling", value: "Real-time availability" },
              { icon: <Wallet size={15} />, label: "Payments & invoices", value: "Tap, card or PayNow" },
              { icon: <BarChart3 size={15} />, label: "Revenue analytics", value: "Live KPIs & forecasting" },
              { icon: <ShieldCheck size={15} />, label: "Role-based access", value: "Owner · Manager · Staff" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm">
                <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-violet-200">{f.icon}</div>
                <p className="text-[0.72rem] font-semibold text-white/90">{f.label}</p>
                <p className="mt-0.5 text-[0.66rem] text-white/45">{f.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* floating mini agenda mock */}
        <div className="relative z-10">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[0.7rem] font-semibold text-white/80">Today at Lumière Studio</p>
              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[0.62rem] font-medium text-emerald-300">87% booked</span>
            </div>
            <div className="space-y-2">
              {[
                { time: "09:00", name: "Aisha Rahman", service: "Balayage & Colour", color: "bg-violet-400" },
                { time: "11:30", name: "Daniel Wong", service: "Signature Haircut", color: "bg-sky-400" },
                { time: "14:00", name: "Grace Lee", service: "HydraGlow Facial", color: "bg-pink-400" },
              ].map((a) => (
                <div key={a.time} className="flex items-center gap-3 rounded-lg bg-white/[0.05] px-3 py-2">
                  <span className={`h-6 w-1 rounded-full ${a.color}`} />
                  <span className="w-10 text-[0.66rem] tabular-nums text-white/50">{a.time}</span>
                  <span className="flex-1 truncate text-[0.72rem] font-medium text-white/85">{a.name}</span>
                  <span className="hidden truncate text-[0.66rem] text-white/45 sm:block">{a.service}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 text-[0.66rem] text-white/35">
            Trusted by salons, clinics, studios and home-service teams in 14 countries.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------ form panel */}
      <div className="flex flex-1 items-center justify-center bg-bg px-5 py-10 sm:px-8">
        <div className="w-full max-w-[25rem]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
              <Sparkles size={17} />
            </span>
            <span className="text-sm font-semibold">Slotly</span>
          </div>
          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-8 w-52" />
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
