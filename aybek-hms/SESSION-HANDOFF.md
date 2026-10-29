# یادداشت تحویل — Aybek Ten-Bed Specialy Surgical Hospital

*Handoff note for a fresh conversation. Everything below is already built, tested
and committed on this branch.*

---

## ۱. وضعیت فعلی (چه چیزی ساخته شده)

### لایه داده و منطق — `lib/hms/`
| فایل | کار |
|------|-----|
| `db.ts` | ساختار کامل جدول‌های `hms_*`، کمک‌کننده‌های `hAll/hGet/hRun`، تنظیمات هفت بخشی، ثبت سابقه (audit) |
| `seed.ts` | داده نمایشی ثابت و تکرارپذیر: ۹ کارمند، ۲۶ مریض، ۱۰ بستر، ۳۲ دوا، ۱۰ نسخه، ۱۴ لابراتوار، ۱۰ اکسری، ۸ عملیات، ۵ بستری، ۶۴ صورت‌حساب، ۵۳۹ وقت ملاقات (۸ هفته گذشته + ۲ هفته آینده) |
| `auth.ts` | ورود/خروج، کوکی `aybek_session` (۱۴ روز)، نقش‌ها، `requireHmsPage`, `requireHmsApi` |
| `license.ts` | سریال خودتأیید `AYBK-XXXX-XXXX-XXXX-CCCC` (چک‌سام SHA-256)، آزمایشی ۱۴ روزه، فعال‌سازی، ثبت سریال‌ها |
| `templates.ts` | ۱۰ قالب نسخه، ۴ قالب سند، ۱۰ تم رابط، `templateById`, `themeById` |
| `ai.ts` | کنترول ۱۵ تداخل دوا، تشخیص آلرژی، تکرار درمان، حداکثر مقدار، تریاژ NEWS2، پیشنهاد مقدار، نوشتن یادداشت، تحلیل نتیجه لابراتوار، پیش‌بینی مریضان، ریسک نیامدن مریض |
| `alerts.ts` | ۱۳ قاعده بررسی، `scan`, `syncAlerts`, `autoHeal`, `escalateExpired` (۴۸ ساعت)، `healthSummary` |
| `guide.ts` | ۱۰ فصل راهنما + ۸ پاسخ سریع |
| `queries.ts` | همه کوئری‌های خواندن با تایپ کامل |
| `format.ts` | توابع قالب‌بندی مشترک سرور/کلاینت (پول، تاریخ، زمان، سن) |

### API — `app/api/hms/`
`auth/login`, `auth/logout`, `patients` (+`[id]`), `appointments` (+`[id]`),
`encounters`, `prescriptions` (+`[id]` با sign/dispense/void), `medicines` (+`[id]`),
`lab` (+`[id]`: collect/result/verify), `imaging` (+`[id]`: accept/report),
`beds` (admit/transfer/discharge/clean), `surgery` (book/start/complete/cancel),
`invoices` (create/pay), `settings`, `license` (activate/generate/validate),
`alerts` (scan/heal/heal-all/acknowledge/resolve/escalate), `ai` (screen/triage/
doses/note/template/lab/insights/forecast/followups/noshow/load), `dashboard`.

### صفحات — `app/hms/`
| مسیر | محتوا |
|------|-------|
| `/hms/login` | ورود با فهرست حساب‌های نمایشی |
| `/hms` | مرکز فرمان: ۶ کارت آماری، نمودار درآمد، صف امروز، مانیتور سلامت، بار دیپارتمنت‌ها، پیش‌بینی، بینش‌های دستیار، تخته بستر، لیست عملیات، پول، سابقه |
| `/hms/opd` | صف + اتاق مشوره (علائم حیاتی، تریاژ، نسخه، کنترول ایمنی، چاپ) |
| `/hms/patients`, `/hms/patients/[id]` | ثبت مریض، جدول، چارت کامل مریض |
| `/hms/prescriptions` | دفتر نسخه‌ها، امضا، تحویل، چاپ |
| `/hms/lab` | لیست کار لابراتوار با تحلیل خودکار نتیجه |
| `/hms/radiology` | درخواست‌ها و گزارش‌دهی با قالب آماده |
| `/hms/inpatients` | تخته ده بستر با admit/transfer/discharge/clean |
| `/hms/surgery` | ثبت و پیشبرد عملیات |
| `/hms/pharmacy` | صف تحویل، موجودی، انقضا، دریافت |
| `/hms/billing` | صورت‌حساب، پرداخت، چاپ رسید |
| `/hms/analytics` | درآمد ۳۰ روزه، ترکیب، تشخیص‌ها، پیش‌بینی، کیفیت |
| `/hms/alerts` | همه هشدارها + سابقه تعمیر + توضیح ۴۸ ساعت |
| `/hms/settings` | ۷ بخش تنظیمات + راهنمای درون‌صفحه |
| `/hms/team` | کارمندان: افزودن، نقش، تعلیق دسترسی، بازنشانی رمز، تغییر رمز خود |
| `/hms/guide` | ۱۰ فصل با تیک پیشرفت |
| `/hms/activate` | فعال‌سازی، تولید سریال، دفتر سریال‌ها |
| `/hms/print` | استودیو چاپ: ۱۰ قالب نسخه + ۴ قالب سند با رندر واقعی |
| `/hms/rx/[id]` | برگه A4 واقعی، انتخاب قالب، چاپ/PDF |

### اجزای رابط — `components/hms/`
`shell.tsx` (نوار کناری، هدر، زنگ هشدار با صدا، جستجوی ⌘K)، `ui.tsx`
(Panel/Stat/Pill/Status/Btn/Field/Empty/Meter/Ring/Person)، `charts.tsx`
(Spark/Bars/AreaLine/Donut/LoadBar)، `alert-list.tsx`، `rx-sheet.tsx`
(موتور چاپ نسخه)، `doc-sheet.tsx` (چهار سند).

### بسته تحویل — `aybek-hms/`
`README.md`, `START-HERE.bat`, `ONE-CLICK-START.bat`, `docs/` (۶ سند انگلیسی +
راهنمای فارسی), `scripts/install/01…10` + `_common.ps1`,
`scripts/wizards/` (admin, opd, pharmacy, laboratory, radiology, inpatients,
surgery, reception) و اسکریپت‌های کمکی در ریشه پروژه:
`scripts/verify-hms.ts`, `scripts/status.ts`, `scripts/generate-serials.ts`,
`scripts/settings-export.ts`, `scripts/settings-import.ts`, `scripts/reset-db.mjs`.

---

## ۲. چه چیزی تست شده

* `npx tsc --noEmit` — پاک.
* همه ۱۷ صفحه `/hms/*` با کوکی ورود — کد ۲۰۰.
* با curl تست شد: ثبت مریض، وقت ملاقات، نسخه (امضا/تحویل)، لابراتوار
  (collect/result/verify با تحلیل مقدار)، بستر (admit)، صورت‌حساب (create/pay)،
  تنظیمات، تولید سریال و فعال‌سازی (شامل رد سریال جعلی)، اسکن هشدارها،
  ثبت عملیات، گزارش اکسری.
* `npx tsx scripts/verify-hms.ts` — همه جدول‌ها پر.

---

## ۳. قدم‌های بعدی (اگر کار ادامه یافت)

1. **تست چشمی در مرورگر** — هیچ ابزار اسکرین‌شات در این محیط نبود؛ طرح‌ها با
   CSS دقیق نوشته شده‌اند اما بازبینی چشمی ارزش دارد (به‌خصوص `/hms/print` و
   `/hms/rx/[id]` روی A4).
2. **تغییر رمز پیش‌فرض** — همه حساب‌های نمایشی `mamonaminyar` دارند؛ صفحه
   `/hms/team` تغییر رمز و مدیریت کارمندان را انجام می‌دهد (تست شده).
3. **مدیریت کاربران** — انجام شد؛ فقط «بازیابی رمز فراموش‌شده بدون ورود» باقی است.
4. **چاپ صورت‌حساب با موتور یکسان** — الان رسید در `billing/board.tsx` با
   `window.open` ساخته می‌شود؛ می‌شود آن را به `DocumentSheet` (layout: statement)
   منتقل کرد.
5. **PDF سمت سرور** — فعلاً «Save as PDF» مرورگر استفاده می‌شود (کافی و آفلاین).
6. **گزارش‌های وزارت صحت** — خروجی CSV آماده است؛ قالب رسمی چاپی لازم است.
7. **پشتیبان‌گیری خودکار روزانه** — یک Scheduled Task با `07-backup.ps1`.

---

## ۴. نکات فنی مهم برای ادامه‌دهنده

* Next 15 + React 19 + Tailwind v4؛ دیتابیس `node:sqlite` در همان
  `data/slotly.db` که اپ Slotly استفاده می‌کند (جدول‌های `hms_*`).
* `middleware.ts` حالا `/hms` را هم پوشش می‌دهد (CSP برای iframe پیش‌نمایش).
* هر صفحه سرور ابتدا `requireHmsPage([roles])` و هر API `requireHmsApi([roles])`
  صدا می‌زند.
* `lib/hms/format.ts` برای توابع خالص است — **هرگز** فانکشن از ماژول
  `"use client"` به سرور یا بالعکس پاس ندهید (خطای RSC می‌دهد). نمودارها
  `format="money"` می‌گیرند، نه تابع.
* تغییر مقدار `ALL` کلیدهای identity در `db.ts` (`name_local`, `license_no`,
  `footer_note`) — نام‌ها با کدهای صفحه باید یکی بمانند.
* بعد از `npm run build` باید سرور dev را دوباره راه‌اندازی کرد (وگرنه
  watchdog حافظه پروسه را ری‌استارت می‌کند و نوشتن‌های نیمه‌کاره از دست می‌روند).
* `npx tsx scripts/verify-hms.ts` سریع‌ترین راه بررسی سالم بودن داده است.

---

## ۵. مشخصات کلیدی

* نام: **Aybek Ten-Bed Specialy Surgical Hospital** — شفاخانه ده بستر جراحی ایبک
* مالک/مدیر: داکتر مامون امینیار — `doctor@aybek.hospital` / `mamonaminyar`
* شماره جواز: `MOPH-AYB-2026-0148` · TIN 900-482-771
* سکرت سریال: `aybek-hms::2026::ten-bed-surgical` (در `.env.local` قابل تغییر)
* مسیر مرجع کاربر: `E:\Mamonaminyar-HMS-Print-Design-v4`

---

## ۱۲) گزارش آخرین بازبینی (این دور)

همه موارد زیر روی دیتابیس تازه (reset + seed) و بیلد تولیدی تست شد، نه روی
سرور توسعه.

| مورد | نتیجه |
|------|--------|
| `npm run build` | موفق — ۲۸ مسیر، بدون خطای تایپ |
| بازنشانی + seed + `hms:verify` | ۱۶ جدول، ۹ کاربر، ۲۶ مریض، ۵۳۹ وقت، ۶۴ بل |
| ورود همه ۹ حساب | همه ۲۰۰ |
| همه صفحه‌ها (۵ دیپارتمنت + مرکز + تنظیمات + چاپ + تیم) | همه ۲۰۰ |
| کنترل نقش‌ها | دواخانه به settings/team دسترسی ندارد؛ `/api/hms/users` برای او ۴۰۳ |
| بستر: admit → transfer → discharge | ۲۰۱ / ۲۰۰ / ۲۰۰ |
| نتیجه لابراتوار با مقدار خطرناک | ۲۰۰ + هشدار خودکار |
| گزارش اکسری | ۲۰۰ |
| تحویل نسخه بدون امضا | رد می‌شود (۴۰۹) |
| امضا → تحویل | ۲۰۰ / ۲۰۰ |
| پرداخت بل + چاپ رسید A4 | ۲۰۰ / ۲۰۰ |
| ذخیره تنظیمات، ساخت کارمند، اسکن مانیتور | ۲۰۰ / ۲۰۱ / ۲۰۰ |
| لایسنس: تولید → بررسی → فعال‌سازی → لغو | همه ۲۰۰؛ سریال جعلی رد می‌شود |
| تعمیر خودکار هشدار | واقعاً بچ منقضی را قرنطینه کرد و در audit نوشت |

### تغییرهای این دور
1. صفحه `/hms/team` — افزودن کارمند، تغییر نقش، تعلیق/بازگردانی، بازنشانی رمز،
   تغییر رمز خود. آخرین مدیر فعال قابل حذف نیست؛ تعلیق، نشست‌های باز را می‌بندد.
2. `/hms/receipt/[id]` — بل به‌جای پنجرهٔ pop-up روی سربرگ بیمارستان و قالب
   «Ledger Statement» چاپ می‌شود.
3. ریشهٔ سایت `/` به `/hms` هدایت می‌شود (ورک‌اسپیس سالن دست‌نخورده در `/login`).
4. تحویل نسخه بدون امضای داکتر مسدود شد (قابل خاموش‌کردن در تنظیمات → قواعد کلینیکی).
5. آنالایزر نتایج لابراتوار از ۱۱ به ۱۷ شاخص رسید (Hb، Platelets، Na، Glucose،
   Albumin، Bilirubin، Amylase، Calcium) و دو نقطه‌نقطه/واحد را هم می‌خواند.
6. لغو سریال (revoke) هم در API و هم با دکمه در `/hms/activate` — لغو سریالِ
   فعال، همان لحظه نسخه را قفل می‌کند.
7. نشست‌های بازِ «تیم» فقط برای مدیر؛ لیست کارمندان از API هم بسته شد.
8. `07-backup.ps1 -Schedule -At 20:00` پشتیبان‌گیری شبانه را در Task Scheduler
   ویندوز ثبت می‌کند.
9. ایمیل‌های نمایشی در همهٔ اسناد و ویزاردها با seed یکی شد:
   `pharmacy@`، `lab@`، `laila@`، `nurse@`، `reception@` (رمز همه `mamonaminyar`).

### آنچه اینجا قابل تست نبود
- ۱۰ اسکریپت PowerShell (روی این ماشین ویندوز/PowerShell نیست) — باید روی
  ویندوز یک‌بار اجرا و بازبینی شود.
- چاپ فیزیکی A4 — قبل از تحویل، `/hms/print` و یک نسخه را روی پرینتر امتحان کنید.

