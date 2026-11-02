# ساختن سیدی / دیویدی از این پروژه — Making the disc

این پوشه سورسِ «مسترِ دیسک» است. اگر می‌خواهید دیسک را دوباره بسازید (مثلاً بعد از
تغییر تنظیمات یا به‌روزرسانی نسخه)، روی ویندوز این مراحل را انجام دهید.

---

## ۱) چیدمان نهایی دیسک

```
Aybek-DISC-v4\
├── AUTORUN.INF            ← ویندوز خودش پیشنهاد اجرا می‌دهد (اختیاری)
├── START-HERE.bat         ← نصب یک‌کلیکی از روی دیسک به C:\AybekHMS
├── README-FIRST-FA.txt    ← یک صفحهٔ فارسی برای شروع سریع
├── RAHNAMA-FA.html        ← راهنمای کامل فارسی (برای خودم و دیگران)
├── CHECKLIST-FA.txt       ← چک‌لیست تحویل، قابل چاپ
├── MANIFEST-SHA256.txt    ← اثر انگشت همهٔ فایل‌ها
├── APP\                   ← کل برنامه (همان پوشهٔ پروژه، بدون node_modules)
├── COPY-TO-ANOTHER-PC\    ← فایل zip برای دادن به دیگران
├── DOCS\                  ← ۱۰ سند با نام‌های ASCII
└── TOOLS\                 ← MAKE-ISO.ps1 · MAKE-OFFLINE-DVD.ps1 · محل نصب‌کنندهٔ Node.js
```

## ۲) ساختن پوشهٔ دیسک روی ویندوز

```powershell
# از ریشهٔ پروژه
$disc = "D:\Aybek-DISC-v4"
New-Item -ItemType Directory -Force -Path $disc, "$disc\APP", "$disc\COPY-TO-ANOTHER-PC", "$disc\DOCS", "$disc\TOOLS" | Out-Null

# برنامه (بدون node_modules و بدون .next)
robocopy . "$disc\APP" /E /XD node_modules .next .git /XF slotly.db slotly.db-wal slotly.db-shm SERIALS.txt
Copy-Item "data\demo-hospital.db" "$disc\APP\data\" -ErrorAction SilentlyContinue
Copy-Item "START-HERE-FA.txt" "$disc\APP\" -ErrorAction SilentlyContinue

# فایل‌های سطح دیسک و اسناد
Copy-Item "aybek-hms\disc\*" $disc -Force
Copy-Item "aybek-hms\docs\INSTALL-WINDOWS.md","aybek-hms\docs\INSTALL-OFFLINE.md","aybek-hms\docs\USER-GUIDE.md","aybek-hms\docs\TROUBLESHOOTING.md","aybek-hms\docs\LICENSING.md","aybek-hms\docs\DESIGN-SYSTEM.md" "$disc\DOCS\"
Copy-Item "aybek-hms\docs\راهنمای-فارسی.md" "$disc\DOCS\GUIDE-FA.md"
Copy-Item "aybek-hms\SESSION-HANDOFF.md" "$disc\DOCS\SESSION-HANDOFF-FA.md"
```

سپس zip تحویل را در `COPY-TO-ANOTHER-PC` بگذارید و در پایان فهرست اثر انگشت را بسازید.

## ۳) ساخت فایل ISO و رایت

```powershell
cd "aybek-hms\disc\TOOLS"
.\MAKE-ISO.ps1 -Source "D:\Aybek-DISC-v4" -Iso "D:\Aybek-Hospital-HMS-v4-CD.iso"
.\MAKE-ISO.ps1 -Source "D:\Aybek-DISC-v4" -Iso "D:\Aybek.iso" -Burn -Drive "E:"
```

`MAKE-ISO.ps1` از سرویس IMAPI2 خود ویندوز استفاده می‌کند؛ نیازی به نرم‌افزار اضافی نیست.
اگر رایت انجام نشد، فایل ISO سالم می‌ماند: روی آن راست‌کلیک کنید و
«Burn disc image» را بزنید.

## ۴) نسخهٔ کاملاً آفلاین (دیویدی)

```powershell
.\MAKE-OFFLINE-DVD.ps1 -Target "D:\AybekDVD" -NodeInstaller "C:\node-v22-x64.msi"
.\MAKE-OFFLINE-DVD.ps1 -Target "D:\AybekDVD" -Iso "D:\Aybek-offline.iso" -Burn -Drive "E:"
```

این نسخه `node_modules` (حدود ۵۰۰ مگابایت) را هم داخل دیسک می‌گذارد، پس کمپیوتر مقصد
هیچ نیازی به اینترنت ندارد. حجم کل حدود ۵۵۰ مگابایت می‌شود: روی یک DVD (یا CD 700 MB)
جا می‌شود.

## ۵) نکته‌های عملی

* **CD ۷۰۰ مگابایتی**: نسخهٔ سبک (۳۳ مگابایت) یا نسخهٔ آفلاین (۵۵۰ مگابایت) هر دو جا می‌شوند.
* **DVD**: برای نسخهٔ آفلاین + چند نسخهٔ پشتیبان راحت‌تر است.
* فایل‌های `.db` را داخل `APP\` نگذارید مگر همان `demo-hospital.db`؛ دادهٔ مریضان واقعی
  روی دیسک پخش‌شدنی نباید باشد.
* `SERIALS.txt` را هرگز روی دیسک نگذارید.
* بعد از رایت، یک‌بار دیسک را در کمپیوتر دیگری باز کنید و `START-HERE.bat` را اجرا کنید؛
  همین ساده‌ترین تست سالم بودن دیسک است.
