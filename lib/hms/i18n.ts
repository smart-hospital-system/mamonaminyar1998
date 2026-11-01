/**
 * Aybek Hospital — bilingual core.
 *
 * Every string that a person reads lives in this dictionary, once, in English
 * and Persian (Dari). Components call `t(lang, "key")`; nothing else needs to
 * know which language is running. The hospital is bilingual by design: a
 * surgeon may work in English while the ward clerk works in Dari, on the same
 * server, at the same time — the choice is a cookie, not an installation.
 *
 * This file is imported by both server and client components, so it must stay
 * pure: no next/headers, no cookies, no database.
 */

export type Lang = "en" | "fa";

export const LANGS: { id: Lang; label: string; short: string; dir: "ltr" | "rtl" }[] = [
  { id: "en", label: "English", short: "EN", dir: "ltr" },
  { id: "fa", label: "دری / فارسی", short: "دری", dir: "rtl" },
];

export const LANG_COOKIE = "aybek_lang";

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "fa";
}

export function dirOf(lang: Lang): "ltr" | "rtl" {
  return lang === "fa" ? "rtl" : "ltr";
}

/* ------------------------------------------------------------------ dictionary */

type Pair = [en: string, fa: string];

const D: Record<string, Pair> = {
  /* ---------------------------------------------------------- shell & nav */
  "nav.command": ["Command", "مرکز"],
  "nav.start": ["Start here", "از اینجا شروع کنید"],
  "nav.ask": ["Ask Aybek", "از ایبک بپرسید"],
  "nav.intelligence": ["Clinical toolkit", "جعبه‌ابزار کلینیکی"],
  "nav.diseases": ["Diseases A–Z", "امراض الفبا"],
  "title.diseases": ["Diseases A–Z", "امراض الفبا"],
  "title.diseases.sub": ["Signs, diagnosis and treatment for every condition in the catalogue — English and Dari", "اعراض، تشخیص و تداوی هر مرض در کاتالوگ — انگلیسی و دری"],
  "nav.audit": ["Audit trail", "ثبت وقایع"],
  "nav.clinical": ["Clinical", "کلینیکی"],
  "nav.operations": ["Operations", "عملیات"],
  "nav.system": ["System", "سیستم"],

  "nav.dashboard": ["Command centre", "مرکز فرمان"],
  "nav.opd": ["OPD & consults", "معاینات"],
  "nav.patients": ["Patients", "مریضان"],
  "nav.prescriptions": ["Prescriptions", "نسخه‌ها"],
  "nav.lab": ["Laboratory", "لابراتوار"],
  "nav.radiology": ["Radiology & imaging", "اکسری و تصویربرداری"],
  "nav.inpatients": ["Inpatient board", "تختهٔ بستر"],
  "nav.surgery": ["Theatre", "اتاق عملیات"],
  "nav.pharmacy": ["Pharmacy & stock", "دواخانه و موجودی"],
  "nav.billing": ["Billing & invoices", "حساب و بل"],
  "nav.analytics": ["Analytics", "تحلیل"],
  "nav.alerts": ["Health monitor", "مانیتور سلامت"],
  "nav.print": ["Print studio", "استودیو چاپ"],
  "nav.settings": ["Smart settings", "تنظیمات هوشمند"],
  "nav.team": ["Team & access", "تیم و دسترسی"],
  "nav.guide": ["Step-by-step guide", "راهنمای گام‌به‌گام"],
  "nav.activate": ["Licence", "لایسنس"],

  "shell.search": ["Search patients, drugs, pages…", "جستجوی مریض، دوا یا صفحه…"],
  "shell.trial": ["Trial · {days}d left", "آزمایشی · {days} روز"],
  "shell.expired": ["Trial expired — activate", "آزمایشی تمام شد — فعال کنید"],
  "shell.health": ["health", "سلامت"],
  "shell.system": ["System {score}%", "سیستم {score}٪"],
  "shell.critical": ["{critical} critical · {warning} warnings", "{critical} بحرانی · {warning} هشدار"],
  "shell.collapse": ["Collapse", "جمع کردن"],
  "shell.alerts": ["Alerts", "هشدارها"],
  "shell.monitor": ["Health monitor", "مانیتور سلامت"],
  "shell.scanNote": ["Scans every 30 min · 48h escalation", "هر ۳۰ دقیقه · تشدید پس از ۴۸ ساعت"],
  "shell.mute": ["Mute alarm sound", "بی‌صدا کردن زنگ"],
  "shell.unmute": ["Enable alarm sound", "روشن کردن زنگ"],
  "shell.scan": ["Scan", "اسکن"],
  "shell.noAlarms": ["No open alarms — the hospital is healthy.", "هیچ هشدار بازی نیست — شفاخانه سالم است."],
  "shell.openMonitor": ["Open health monitor", "باز کردن مانیتور سلامت"],
  "shell.guide": ["Guide", "راهنما"],
  "shell.settings": ["Settings", "تنظیمات"],
  "shell.salon": ["Salon workspace", "ورک‌اسپیس سالن"],
  "shell.signOut": ["Sign out", "خروج"],
  "shell.footer": ["All data stored locally", "همهٔ داده‌ها محلی ذخیره می‌شوند"],
  "shell.footerHealth": ["Health monitor", "مانیتور سلامت"],
  "shell.clear": ["clear", "پاک"],
  "shell.openCount": ["{count} open", "{count} باز"],
  "shell.language": ["Language", "زبان"],
  "shell.palettePages": ["Pages", "صفحه‌ها"],
  "shell.palettePatients": ["Patients", "مریضان"],
  "shell.paletteMedicines": ["Medicines", "دواها"],
  "shell.nothingMatched": ["Nothing matched “{q}”.", "چیزی برای «{q}» پیدا نشد."],
  "shell.typeTwo": ["Type at least two characters. Tip: press ⌘K anywhere in the hospital.", "دست‌کم دو حرف بنویسید. نکته: هر جای شفاخانه ⌘K را بزنید."],
  "shell.palettePlaceholder": ["Patient name, MRN, medicine or page…", "نام مریض، MRN، دوا یا صفحه…"],

  /* --------------------------------------------------------------- titles */
  "title.audit": ["Audit trail", "ثبت وقایع"],
  "title.audit.sub": ["Every change, who made it, and when", "هر تغییر، چه کسی و چه وقت"],
  "title.intelligence": ["Clinical toolkit", "جعبه‌ابزار کلینیکی"],
  "title.intelligence.sub": ["Early warning, interactions, dosing and laboratory interpretation — all offline", "هشدار زودهنگام، تداخل دوا، دوز و تفسیر لابراتوار — همه آفلاین"],
  "title.start": ["Start here", "از اینجا شروع کنید"],
  "title.start.sub": ["Where to go and what to press, in order", "کجا بروید و چه را بزنید، به ترتیب"],
  "title.ask": ["Ask Aybek", "از ایبک بپرسید"],
  "title.ask.sub": ["Questions answered from this hospital's own records — offline", "جواب سوال‌ها از سوابق خود این شفاخانه — آفلاین"],
  "title.dashboard": ["Command centre", "مرکز فرمان"],
  "title.dashboard.sub": ["Every department, one screen", "همهٔ دیپارتمنت‌ها، یک صفحه"],
  "title.opd": ["OPD & consults", "معاینات"],
  "title.opd.sub": ["Today's clinic, vitals and prescribing", "کلینیک امروز، علائم حیاتی و نسخه‌نویسی"],
  "title.patients": ["Patients", "مریضان"],
  "title.patients.sub": ["Records, history and charts", "سوابق، تاریخچه و پرونده"],
  "title.prescriptions": ["Prescriptions", "نسخه‌ها"],
  "title.prescriptions.sub": ["Sign, dispense and print", "امضا، تحویل و چاپ"],
  "title.lab": ["Laboratory", "لابراتوار"],
  "title.lab.sub": ["Worklist, results and verification", "فهرست کار، نتایج و تأیید"],
  "title.radiology": ["Radiology & imaging", "اکسری و تصویربرداری"],
  "title.radiology.sub": ["Requests, findings and reports", "درخواست، یافته و گزارش"],
  "title.inpatients": ["Inpatient board", "تختهٔ بستر"],
  "title.inpatients.sub": ["Ten beds, live status", "ده بستر، وضعیت زنده"],
  "title.surgery": ["Theatre", "اتاق عملیات"],
  "title.surgery.sub": ["Surgical lists and operation notes", "فهرست عملیات و یادداشت جراحی"],
  "title.pharmacy": ["Pharmacy & stock", "دواخانه و موجودی"],
  "title.pharmacy.sub": ["Dispensing queue and inventory", "صف تحویل و موجودی"],
  "title.billing": ["Billing & invoices", "حساب و بل"],
  "title.billing.sub": ["Collect, reconcile, print", "دریافت، تطبیق، چاپ"],
  "title.analytics": ["Analytics", "تحلیل"],
  "title.analytics.sub": ["Demand, revenue and quality", "تقاضا، درآمد و کیفیت"],
  "title.alerts": ["Health monitor", "مانیتور سلامت"],
  "title.alerts.sub": ["Automatic integrity scans and repairs", "اسکن و تعمیر خودکار یکپارچگی"],
  "title.print": ["Print studio", "استودیو چاپ"],
  "title.print.sub": ["Ten prescription designs", "ده طرح نسخه"],
  "title.settings": ["Smart settings", "تنظیمات هوشمند"],
  "title.settings.sub": ["Identity, themes and alarms", "هویت، تم‌ها و هشدارها"],
  "title.team": ["Team & access", "تیم و دسترسی"],
  "title.team.sub": ["People, roles and passwords", "کارمندان، نقش‌ها و رمزها"],
  "title.guide": ["Step-by-step guide", "راهنمای گام‌به‌گام"],
  "title.guide.sub": ["Exactly what to press, and where", "دقیقاً چه را کجا بزنید"],
  "title.activate": ["Licence & activation", "لایسنس و فعال‌سازی"],
  "title.activate.sub": ["Serials and edition management", "سریال‌ها و مدیریت نسخه"],

  /* --------------------------------------------------------------- common */
  "c.save": ["Save", "ذخیره"],
  "c.saving": ["Saving…", "در حال ذخیره…"],
  "c.cancel": ["Cancel", "لغو"],
  "c.close": ["Close", "بستن"],
  "c.confirm": ["Confirm", "تأیید"],
  "c.search": ["Search", "جستجو"],
  "c.all": ["All", "همه"],
  "c.today": ["Today", "امروز"],
  "c.patient": ["Patient", "مریض"],
  "c.doctor": ["Doctor", "داکتر"],
  "c.status": ["Status", "وضعیت"],
  "c.actions": ["Actions", "اقدام"],
  "c.total": ["Total", "مجموع"],
  "c.paid": ["Paid", "پرداخت‌شده"],
  "c.balance": ["Balance", "باقی"],
  "c.print": ["Print", "چاپ"],
  "c.back": ["Back", "برگشت"],
  "c.new": ["New", "جدید"],
  "c.add": ["Add", "افزودن"],
  "c.edit": ["Edit", "ویرایش"],
  "c.delete": ["Delete", "حذف"],
  "c.view": ["View", "دیدن"],
  "c.open": ["Open", "باز کردن"],
  "c.none": ["None", "هیچ"],
  "c.dash": ["—", "—"],
  "c.loading": ["Loading…", "در حال بارگذاری…"],
  "c.date": ["Date", "تاریخ"],
  "c.time": ["Time", "وقت"],
  "c.amount": ["Amount", "مبلغ"],
  "c.name": ["Name", "نام"],
  "c.phone": ["Phone", "تلفن"],
  "c.notes": ["Notes", "یادداشت"],
  "c.yes": ["Yes", "بله"],
  "c.no": ["No", "نه"],
  "c.required": ["Required", "الزامی"],
  "c.optional": ["Optional", "اختیاری"],
  "c.saved": ["Saved.", "ذخیره شد."],
  "c.couldNotSave": ["Could not save.", "ذخیره نشد."],
  "c.today2": ["today", "امروز"],
  "c.pieces": ["pcs", "عدد"],

  /* ---------------------------------------------------------------- login */
  "login.title": ["Sign in", "ورود"],
  "login.subtitle": ["Your shift starts here.", "شیفت شما از اینجا شروع می‌شود."],
  "login.email": ["Email", "ایمیل"],
  "login.password": ["Password", "رمز"],
  "login.submit": ["Sign in to the hospital", "ورود به شفاخانه"],
  "login.busy": ["Signing in…", "در حال ورود…"],
  "login.demo": ["Demonstration accounts", "حساب‌های نمایشی"],
  "login.demoHint": ["Password for every demo account", "رمز همهٔ حساب‌های نمایشی"],
  "login.trouble": ["Trouble signing in? Ask the administrator to reset your password on the Team page.", "مشکل در ورود؟ از مدیر بخواهید رمز شما را از صفحهٔ «تیم» بازنشانی کند."],
  "login.switchSalon": ["Salon booking workspace", "ورک‌اسپیس سالن"],
  "login.show": ["Show", "نشان بده"],
  "login.hide": ["Hide", "پنهان"],
  "login.language": ["Language", "زبان"],
  "login.edition": ["Hospital information system · offline-first", "سیستم اطلاعات شفاخانه · اول آفلاین"],
  "login.secure": ["Runs on this computer. No patient data leaves the hospital.", "روی همین کمپیوتر اجرا می‌شود. هیچ دادهٔ مریض از شفاخانه بیرون نمی‌رود."],
  "login.panelTitle": ["One system for ten beds", "یک سیستم برای ده بستر"],
  "login.panelPoint1": ["Five departments, one shared patient record", "پنج دیپارتمنت، یک پروندهٔ مشترک مریض"],
  "login.panelPoint2": ["Prescriptions that cannot be dispensed unsigned", "نسخه‌ای که بدون امضا تحویل نمی‌شود"],
  "login.panelPoint3": ["A monitor that finds problems before you do", "مانیتوری که مشکل را پیش از شما پیدا می‌کند"],
  "login.panelPoint4": ["Works offline, prints on A4, backs up nightly", "آفلاین کار می‌کند، A4 چاپ می‌کند، شبانه پشتیبان می‌گیرد"],
  "login.bad": ["Could not sign in.", "ورود انجام نشد."],
  "login.offline": ["The local server did not respond. Is the application still running?", "سرور محلی پاسخ نداد. برنامه هنوز در حال اجراست؟"],
  "login.licensed": ["Licensed installation", "نسخهٔ دارای لایسنس"],
  "login.trialLeft": ["Trial — {days} day(s) remaining", "آزمایشی — {days} روز باقی مانده"],
  "login.trialOver": ["Trial expired — activation required", "آزمایشی تمام شد — فعال‌سازی لازم است"],

  /* ------------------------------------------------------------ dashboard */
  "dash.greeting": ["Good morning, {name}", "صبح بخیر، {name}"],
  "dash.greetingPM": ["Good afternoon, {name}", "بعد از ظهر بخیر، {name}"],
  "dash.greetingEve": ["Good evening, {name}", "شب بخیر، {name}"],
  "dash.lead": ["{date} · {open} prescriptions to sign · {beds} of {total} beds occupied", "{date} · {open} نسخهٔ منتظر امضا · {beds} از {total} بستر پُر"],
  "dash.kpi.patients": ["Patients on file", "مریضان ثبت‌شده"],
  "dash.kpi.today": ["Today's consultations", "معاینات امروز"],
  "dash.kpi.rx": ["Prescriptions to sign", "نسخه‌های منتظر امضا"],
  "dash.kpi.lab": ["Laboratory backlog", "عقب‌ماندگی لابراتوار"],
  "dash.kpi.beds": ["Beds occupied", "بسترهای پُر"],
  "dash.kpi.collected": ["Collected today", "دریافتی امروز"],
  "dash.kpi.health": ["System health", "سلامت سیستم"],
  "dash.alarms": ["Alarms needing a person", "هشدارهای نیازمند اقدام"],
  "dash.activity": ["Recent activity", "فعالیت اخیر"],
  "dash.quick": ["Quick actions", "اقدام‌های سریع"],

  /* ------------------------------------------------------------ dashboard */
  "dash.healthPill": ["System health {score}%", "سلامت سیستم {score}٪"],
  "dash.licensed": ["Licensed", "دارای لایسنس"],
  "dash.trial": ["Trial · {days}d", "آزمایشی · {days} روز"],
  "dash.expired": ["Trial expired", "آزمایشی تمام شد"],
  "dash.summary": ["{tagline} — {waiting} patients still to be seen, {results} results awaiting review and {alarms} monitor alarms open.", "{tagline} — {waiting} مریض در انتظار، {results} نتیجهٔ بررسی‌نشده و {alarms} هشدار باز."],
  "dash.startConsult": ["Start a consult", "شروع معاینه"],
  "dash.register": ["Register patient", "ثبت مریض"],
  "dash.printStudio": ["Print studio", "استودیو چاپ"],
  "dash.kpiPatients": ["Patients on file", "مریضان ثبت‌شده"],
  "dash.kpiPatientsHint": ["{n} new this month", "{n} جدید در این ماه"],
  "dash.kpiClinic": ["Clinic today", "کلینیک امروز"],
  "dash.kpiClinicHint": ["{n} waiting or booked", "{n} منتظر یا وقت‌شده"],
  "dash.kpiRx": ["Rx to sign / dispense", "نسخهٔ منتظر امضا/تحویل"],
  "dash.kpiRxHint": ["Safety-screened first", "اول ایمنی‌سنجی"],
  "dash.kpiLab": ["Lab & imaging open", "لاب و اکسری باز"],
  "dash.kpiLabHint": ["{n} critical flag(s)", "{n} مقدار بحرانی"],
  "dash.kpiBeds": ["Beds occupied", "بسترهای پُر"],
  "dash.kpiBedsHint": ["{pct}% occupancy", "{pct}٪ اشغال"],
  "dash.kpiMoney": ["Collected today", "دریافتی امروز"],
  "dash.kpiMoneyHint": ["{amount} outstanding", "{amount} باقی‌مانده"],
  "dash.collections": ["Collections & demand", "دریافت و تقاضا"],
  "dash.collectionsSub": ["Paid invoices per day, last fortnight", "بل‌های پرداخت‌شده در روز، دو هفتهٔ اخیر"],
  "dash.in14": ["{amount} in 14 days", "{amount} در ۱۴ روز"],
  "dash.invoicesPerDay": ["Invoices per day", "بل در هر روز"],
  "dash.whereFrom": ["Where patients come from", "مریضان از کجا می‌آیند"],
  "dash.clinicSub": ["{n} appointments · {done} completed", "{n} وقت · {done} تکمیل‌شده"],
  "dash.openOpd": ["Open OPD →", "رفتن به معاینات →"],
  "dash.noClinic": ["No clinic today", "امروز کلینیکی نیست"],
  "dash.noClinicHint": ["Book an appointment from the OPD screen to fill this list.", "از صفحهٔ معاینات یک وقت ثبت کنید تا این فهرست پر شود."],
  "dash.monitorSub": ["30-minute scans · 48-hour auto-repair", "اسکن هر ۳۰ دقیقه · تعمیر خودکار ۴۸ ساعته"],
  "dash.score": ["score", "امتیاز"],
  "dash.deniedTitle": ["That screen belongs to another role.", "آن صفحه متعلق به نقش دیگری است."],
  "dash.deniedBody": ["Your account was sent back here so that nothing was changed. Ask the medical director if you need wider access — every attempt is written to the audit trail.", "حساب شما به این‌جا برگردانده شد تا هیچ چیزی تغییر نکند. برای دسترسی بیشتر از رئیس طبی بپرسید — هر تلاش در سابقهٔ حسابرسی ثبت می‌شود."],
  "dash.monitorTitle": ["Health monitor", "مانیتور سلامت"],
  "status.critical": ["Critical", "بحرانی"],
  "status.warning": ["Warning", "هشدار"],
  "status.open": ["Open", "باز"],
  "dash.allAlarms": ["All {n} alarm(s) & repair log →", "همهٔ {n} هشدار و سابقهٔ تعمیر →"],
  "dash.deptLoad": ["Department load", "بار دیپارتمنت‌ها"],
  "dash.deptLoadSub": ["Live backlog and next-seven-day bookings", "عقب‌ماندگی زنده و وقت‌های هفت روز آینده"],
  "dash.forecast": ["Forecast · next 14 days", "پیش‌بینی · ۱۴ روز آینده"],
  "dash.forecastText": ["Expect {avg} visits per clinic day — busiest on {day}.", "به‌طور میانگین {avg} مراجعه در هر روز — شلوغ‌ترین روز {day}."],
  "dash.forecastRising": [" Demand is rising versus last week.", " تقاضا نسبت به هفتهٔ گذشته بیشتر شده است."],
  "dash.forecastEasing": [" Demand is easing versus last week.", " تقاضا نسبت به هفتهٔ گذشته کمتر شده است."],
  "dash.insights": ["Assistant insights", "نکته‌های دستیار"],
  "dash.insightsSub": ["Generated from live hospital data", "برگرفته از دادهٔ زندهٔ شفاخانه"],
  "dash.bedBoard": ["Ten-bed inpatient board", "تختهٔ ده بستر"],
  "dash.bedBoardSub": ["{occ} occupied · {free} free · {clean} cleaning", "{occ} پُر · {free} خالی · {clean} در نظافت"],
  "dash.manage": ["Manage →", "مدیریت →"],
  "dash.housekeeping": ["Housekeeping", "در حال نظافت"],
  "dash.outOfService": ["Out of service", "از کار افتاده"],
  "dash.ready": ["Ready", "آماده"],
  "dash.theatre": ["Theatre & procedures", "اتاق عملیات و پروسیجرها"],
  "dash.theatreSub": ["{n} case(s) listed today · {up} upcoming", "{n} عملیات امروز · {up} در پیش"],
  "dash.theatreClear": ["Theatre list is clear", "فهرست عملیات خالی است"],
  "dash.theatreClearHint": ["Book a procedure to see it here.", "یک عملیات ثبت کنید تا اینجا دیده شود."],
  "dash.money": ["Money & paperwork", "پول و اسناد"],
  "dash.moneySub": ["Latest invoices and unsettled balances", "آخرین بل‌ها و باقی‌مانده‌ها"],
  "dash.outreach": ["Outreach drafts & attendance risk", "پیام‌های پیگیری و خطر نیامدن"],
  "dash.outreachSub": ["Follow-up messages the hospital can send today, ranked by risk of a missed visit", "پیام‌های پیگیری که امروز می‌توان فرستاد، به ترتیب خطر نیامدن"],
  "dash.suggestions": ["{n} suggestions", "{n} پیشنهاد"],
  "dash.followups": ["Follow-up messages", "پیام‌های پیگیری"],
  "dash.attendance": ["Attendance risk", "خطر نیامدن"],
  "dash.noFollowups": ["No follow-ups pending.", "هیچ پیگیری‌ای در انتظار نیست."],
  "dash.noRisk": ["No upcoming appointments to score.", "هیچ وقت آینده‌ای برای ارزیابی نیست."],
  "dash.audit": ["Audit trail", "سابقهٔ اقدامات"],
  "dash.auditSub": ["Every action is attributable and permanent", "هر اقدام قابل انتساب و ماندگار است"],
  "dash.diagnoses": ["Most frequent diagnoses", "تشخیص‌های شایع"],
  "dash.diagnosesSub": ["Clinical mix across all documented consults", "ترکیب کلینیکی همهٔ معاینات ثبت‌شده"],
  "dash.consults": ["consults", "مراجعه"],
  "dash.rxWaiting": ["Prescriptions waiting for you", "نسخه‌های منتظر شما"],
  "dash.rxWaitingSub": ["Safety screen runs before anything is signed", "پیش از امضا، ایمنی‌سنجی اجرا می‌شود"],
  "dash.allRx": ["All prescriptions →", "همهٔ نسخه‌ها →"],
  "dash.rxNo": ["Rx no.", "شمارهٔ نسخه"],
  "dash.items": ["Items", "اقلام"],
  "dash.footer": ["{n} active admission(s) · data stored locally on this machine", "{n} بستری فعال · داده‌ها روی همین کمپیوتر ذخیره می‌شوند"],

  /* --------------------------------------------------------------- alarms */
  "al.updated": ["Alarm updated.", "هشدار به‌روز شد."],
  "al.couldNot": ["Could not update the alarm.", "هشدار به‌روز نشد."],
  "al.network": ["Network error — the monitor did not respond.", "خطای شبکه — مانیتور پاسخ نداد."],
  "al.none": ["No open alarms", "هیچ هشدار بازی نیست"],
  "al.noneHint": ["The 30-minute scan found nothing that needs you.", "اسکن ۳۰ دقیقه‌ای چیزی نیازمند اقدام پیدا نکرد."],
  "al.autoFix": ["Auto-fix now", "تعمیر خودکار"],
  "al.ack": ["Acknowledge", "تأیید دریافت"],
  "al.resolve": ["Resolve", "حل شد"],
  "al.goTo": ["Go to department →", "رفتن به دیپارتمنت →"],

  /* ---------------------------------------------------------------- print */
  "rx.prescription": ["Prescription", "نسخه"],
  "rx.patient": ["Patient", "مریض"],
  "rx.age": ["Age", "سن"],
  "rx.sex": ["Sex", "جنس"],
  "rx.diagnosis": ["Diagnosis", "تشخیص"],
  "rx.medicines": ["Medicine", "دوا"],
  "rx.dose": ["Dose", "مقدار"],
  "rx.frequency": ["Frequency", "دفعات"],
  "rx.duration": ["Duration", "مدت"],
  "rx.instructions": ["Instructions", "دستور"],
  "rx.qty": ["Qty", "تعداد"],
  "rx.signature": ["Signature", "امضا"],
  "rx.date": ["Date", "تاریخ"],
  "rx.followUp": ["Follow-up", "مراجعهٔ بعدی"],
  "rx.allergies": ["Allergies", "حساسیت"],
  "rx.notes": ["Notes", "یادداشت"],
  "rx.doctor": ["Prescriber", "نسخه‌نویس"],
  "rx.mrn": ["MRN", "شمارهٔ پرونده"],
  "rx.licence": ["Licence", "لایسنس"],
  "rx.page": ["Page", "صفحه"],
  "doc.statement": ["Statement", "صورت‌حساب"],
  "doc.discharge": ["Discharge summary", "خلاصهٔ مرخصی"],
  "doc.letter": ["Referral letter", "مکتوب معرفی"],
  "doc.chart": ["Patient chart", "چارت مریض"],
  "doc.description": ["Description", "شرح"],
  "doc.qty": ["Qty", "تعداد"],
  "doc.unit": ["Unit", "واحد"],
  "doc.amount": ["Amount", "مبلغ"],
  "doc.dueOnReceipt": ["Due on receipt", "قابل پرداخت در همین وقت"],
  "doc.computerGenerated": ["Computer-generated document — valid with the electronic signature of the attending physician.", "سند تولیدشده توسط سیستم — با امضای الکترونیکی داکتر معالج معتبر است."],
};

/** Translate a key. Unknown keys fall back to the key itself, so a missing
 *  translation is visible in testing and never crashes a screen. */
export function t(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const entry = D[key];
  let text = entry ? (lang === "fa" ? entry[1] : entry[0]) : key;
  if (vars) {
    for (const k of Object.keys(vars)) {
      text = text.split(`{${k}}`).join(String(vars[k]));
    }
  }
  return text;
}

/** Inline bilingual text: `tx(lang, "Clinic today", "کلینیک امروز")`.
 *  Used inside pages where a single sentence has no reason to be shared; the
 *  English and the Persian stay side by side in the source, so a reviewer sees
 *  both at once. `{vars}` are substituted in whichever language is running. */
export function tx(
  lang: Lang,
  en: string,
  fa: string,
  vars?: Record<string, string | number>
): string {
  let text = lang === "fa" ? fa : en;
  if (vars) {
    for (const k of Object.keys(vars)) {
      text = text.split(`{${k}}`).join(String(vars[k]));
    }
  }
  return text;
}

export function hasKey(key: string): boolean {
  return Boolean(D[key]);
}

export function dictSize(): number {
  return Object.keys(D).length;
}

/* --------------------------------------------------------------- statuses */

const STATUS: Record<string, Pair> = {
  pending: ["pending", "در انتظار"],
  signed: ["signed", "امضاشده"],
  dispensed: ["dispensed", "تحویل‌شده"],
  void: ["void", "باطل"],
  ordered: ["ordered", "سفارش‌شده"],
  collected: ["collected", "نمونه گرفته‌شده"],
  in_progress: ["in progress", "در جریان"],
  verified: ["verified", "تأییدشده"],
  completed: ["completed", "تکمیل‌شده"],
  reported: ["reported", "گزارش‌شده"],
  requested: ["requested", "درخواست‌شده"],
  scheduled: ["scheduled", "زمان‌بندی‌شده"],
  cancelled: ["cancelled", "لغوشده"],
  no_show: ["no show", "نیامده"],
  waiting: ["waiting", "منتظر"],
  confirmed: ["confirmed", "تأیید‌شده"],
  occupied: ["occupied", "پُر"],
  available: ["available", "خالی"],
  cleaning: ["cleaning", "نظافت"],
  blocked: ["blocked", "مسدود"],
  admitted: ["admitted", "بستر"],
  discharged: ["discharged", "مرخص"],
  paid: ["paid", "پرداخت‌شده"],
  partial: ["partial", "نیمه‌پرداخت"],
  unpaid: ["unpaid", "پرداخت‌نشده"],
  active: ["active", "فعال"],
  expired: ["expired", "منقضی"],
  open: ["open", "باز"],
  acknowledged: ["acknowledged", "تأیید دریافت"],
  resolved: ["resolved", "حل‌شده"],
  critical: ["critical", "بحرانی"],
  warning: ["warning", "هشدار"],
  info: ["info", "اطلاع"],
  low: ["low", "کم"],
  high: ["high", "بلند"],
  normal: ["normal", "عادی"],
  issued: ["issued", "صادرشده"],
  revoked: ["revoked", "لغوشده"],
  trial: ["trial", "آزمایشی"],
  suspended: ["suspended", "تعلیق‌شده"],
  admin: ["administrator", "مدیر"],
  nurse: ["nurse", "نرس"],
  pharmacist: ["pharmacist", "دواخانه"],
  lab: ["laboratory", "لابراتوار"],
  radiology: ["radiology", "اکسری"],
  reception: ["reception", "استقبال"],
  doctor_role: ["doctor", "داکتر"],
  female: ["female", "زن"],
  male: ["male", "مرد"],
  other: ["other", "دیگر"],
  unknown: ["unknown", "نامعلوم"],
  self_pay: ["self-pay", "خودپرداخت"],
  none: ["none", "هیچ"],
};

export function statusText(lang: Lang, value: string): string {
  const e = STATUS[value] ?? STATUS[value.toLowerCase()];
  if (!e) return value.replace(/_/g, " ");
  return lang === "fa" ? e[1] : e[0];
}

/* ---------------------------------------------------------------- numbers */

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** Latin digits stay readable for clinical values; Persian mode uses Persian
 *  digits for anything a person reads as a count or a date. */
export function digits(lang: Lang, value: string | number): string {
  const s = String(value);
  if (lang !== "fa") return s;
  return s.replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

export function pick(lang: Lang, en: string, fa: string): string {
  return lang === "fa" ? fa : en;
}
