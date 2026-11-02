# ASH — مرحلهٔ اول محیط توسعهٔ سازمانی

**دامنهٔ واقعی این مرحله:** همان HIS موجود با PostgreSQL اختیاری، مهاجرت کنترل‌شده از snapshot SQLite، Docker Compose، CI، readiness، معیارهای عملیاتی و لاگ HTTP ساختاریافته. مسیر محلی/آفلاین SQLite و رابط Tailwind باقی مانده‌اند. این مرحله تأیید تولید/بالینی، Kubernetes، FHIR R4، SMART/OIDC، pgvector، RAG یا موتور تصمیم‌یار جدید نیست.

> اطلاعات واقعی را تا بازبینی امنیتی، حقوقی و بالینی وارد نکنید. ابزارهای آزمایش فقط روی محیط آموزشی هستند. هیچ کدام از دستورها به‌صورت خودکار دیتابیس فعال را جایگزین نمی‌کنند.

## ۱. ساختار افزوده

- `requirements-enterprise.txt`: وابستگی اختیاری psycopg 3.2.13 برای PostgreSQL؛ وابستگی و wheelهای Windows/SQLite قبلی تغییر نکرده‌اند.
- `backend/app/database.py`: انتخاب صریح مسیر محلی یا URL/secret؛ pool محدود و pre-ping در PostgreSQL، timeout اتصال و عدم چاپ پارامتر SQL.
- `backend/app/provisioning.py`: ایجاد صریح schema در مقصد خالی. در startup هیچ create_all یا مهاجرت خودکار انجام نمی‌شود.
- `scripts/enterprise.py`: ساخت اولیهٔ حساب مالک با رمز از getpass/stdin، نه argv.
- `scripts/migrate_postgres.py`: بررسی مبدأ، انتقال تراکنشی و تطبیق داده، بدون merge/overwrite.
- `scripts/postgres_ops.py`: pg_dump سفارشی و pg_restore تک‌تراکنشی به مقصد خالی؛ گذرواژه در فایل موقت 0600 و نه command line.
- `scripts/enterprise_secrets.py`: ساخت رازهای تصادفی محلی، بدون مقدار پیش‌فرض یا بازنویسی.
- `Dockerfile`، `compose.yaml`، `docker/postgres-init.sql`: محیط توسعه با PostgreSQL 17 و نقش‌های جدا.
- `.github/workflows/ci.yml`: آزمون SQLite، رابط، PostgreSQL و build/smoke/backup/restore در Compose.

## ۲. انتخاب دیتابیس بدون ابهام

فقط **یکی** را تنظیم کنید:

| متغیر | کاربرد |
|---|---|
| `ASH_DB_PATH` | فایل SQLite محلی؛ مسیر آفلاین قدیمی |
| `ASH_DATABASE_URL` | URL سرور PostgreSQL، فقط در محیط حفاظت‌شده |
| `ASH_DATABASE_URL_FILE` | فایل حاوی همان URL؛ روش پیشنهادی Compose/سرور |

نمونهٔ **ساختار** URL، نه رمز واقعی:

```text
postgresql+psycopg://USER:PASSWORD@HOST:5432/DATABASE?sslmode=verify-full&sslrootcert=/path/to/ca.crt
```

رمز واقعی را در چت، Git، history فرمان، screenshot، `docker build --build-arg` یا فایل عمومی قرار ندهید. در صورت تنظیم چند منبع، برنامه عمداً خطا می‌دهد؛ به SQLite خالی fallback نمی‌کند. در آزمون‌ها، مسیر صریح به create_app از محیط اولویت دارد تا DB آزمایشی اشتباه به سرور اصلی وصل نشود.

URL فقط PostgreSQL/psycopg و گزینه‌های مشخص TLS/timeout را می‌پذیرد؛ `options/search_path` دلخواه پذیرفته نمی‌شود. در این مرحله از **دیتابیس اختصاصی و schema public** استفاده کنید. schema SQL همچنان نسخهٔ ۲ است؛ جدول‌های بالینی بازطراحی نشده‌اند. این ابزار جایگزین سیستم migration نسخه‌دار عمومی مانند Alembic برای ارتقاهای آینده نیست.

launcher ویندوز، demo و ابزار `scripts.manage` برای SQLite هستند. در حالت سرور از دستورهای همین سند استفاده کنید، نه launcher محلی با URL PostgreSQL.

## ۳. راه‌اندازی تازه با Docker Compose — هر شماره یک اقدام

این مسیر برای کسی است که Docker می‌خواهد. نصب عادی Windows/آفلاین قبلی همچنان با ZIP و Setup.cmd است؛ ZIPهای ۰.۴/۰.۴.۱ تحویل قبلی این مرحلهٔ جدید را ندارند. بستهٔ تازهٔ `0.5.0-dev.1` سورس این مرحله و نصب‌کنندهٔ SQLite را دارد؛ Docker imageها و wheel اختیاری PostgreSQL برای نصب کاملاً آفلاین داخل آن نیستند.

۱. Docker Desktop/Engine و Compose v2، Python 3.11 و اینترنت اولیه برای imageها/وابستگی‌ها لازم است. اگر Docker نصب نیست، ابتدا از منبع رسمی و طبق سیاست IT آن را آماده کنید؛ متن این سند را کورکورانه در CMD اجرا نکنید.

۲. PowerShell را در **ریشهٔ سورس جدید** باز کنید؛ باید `compose.yaml` و `Dockerfile` را ببینید. مسیر پوشهٔ استخراج قدیمی را فرض نکنید.

۳. فقط بررسی کنید:

```powershell
docker version
```

اگر daemon در دسترس نیست، Docker Desktop را روشن و وضعیت آن را بررسی کنید. تا رفع خطا ادامه ندهید.

۴. بررسی Compose:

```powershell
docker compose version
```

۵. رازهای محلی را بسازید؛ نیازی به نصب پکیج Python روی میزبان برای این اسکریپت نیست:

```powershell
python -m scripts.enterprise_secrets
```

پنج فایل در `.secrets` ساخته می‌شود. رمزها تصادفی و مستقل‌اند؛ رمز حساب داکتر نیستند و چاپ نمی‌شوند. پوشه در Unix برابر 0700 است؛ فایل‌ها برای خوانده‌شدن توسط کاربر non-root کانتینر 0644 هستند، اما پوشهٔ والد خصوصی است. روی Windows حتماً ACL پوشه و File Sharing Docker را با IT کنترل کنید؛ بیت‌های POSIX جای NTFS ACL نیستند. `.secrets` در Git و build context نادیده گرفته می‌شود. اگر از قبل چیزی وجود داشته باشد، ساخت متوقف می‌شود؛ رازهای یک دیتابیس موجود را حذف/بازسازی نکنید.

۶. پوشهٔ ورودی مهاجرت را بسازید؛ دادهٔ واقعی را فقط با دسترسی محدود داخل آن بگذارید:

```powershell
New-Item -ItemType Directory -Force imports
```

۷. پیکربندی را بررسی کنید؛ رازها را چاپ نمی‌کند:

```powershell
docker compose config --quiet
```

۸. image برنامه را بسازید؛ این مرحله اینترنت می‌خواهد:

```powershell
docker compose build
```

Tailwind داخل build ساخته می‌شود؛ Node.js روی کمپیوتر استفاده‌کننده یا داخل کانتینر runtime لازم نیست. image runtime ابزار PostgreSQL 17 برای بکاپ/بازیابی دارد. build از tagهای major استفاده می‌کند؛ پیش از تولید digestهای موردبازبینی را pin کنید و برنامهٔ به‌روزرسانی امنیتی داشته باشید.

۹. فقط PostgreSQL را بالا بیاورید:

```powershell
docker compose up -d --wait db
```

پورت DB روی میزبان منتشر نشده است. داده در volume دائمی `postgres_data` می‌ماند. SQL راه‌اندازی نقش‌ها فقط هنگام ساخت اولیهٔ volume اجرا می‌شود.

۱۰. **فقط یکی** از دو مسیر را انتخاب کنید:

- نصب تازه و خالی: دستور زیر.
- انتقال اطلاعات قبلی: مرحلهٔ ۴ این سند؛ **ابتدا init را اجرا نکنید**، چون مهاجرت مقصد خالی می‌خواهد.

نصب تازه:

```powershell
docker compose run --rm ops python -m scripts.enterprise init --physician-owner
```

نام کاربری پیش‌فرض `owner` است. رمز یکتای حداقل ۱۲ حرف را دو بار در prompt وارد کنید؛ نمایش‌ندادن تایپ طبیعی است. می‌توانید `--username` و `--name` بدهید، اما **رمز را در فرمان ننویسید**. گزینهٔ `--physician-owner` صلاحیت صریح مدیر-داکتر می‌دهد؛ اگر آن را ندهید، مدیر عادی صلاحیت نسخه‌نویسی خودکار نمی‌گیرد. این دستور در مقصد دارای جدول/sequence/view متوقف می‌شود؛ حساب یا داده را reset نمی‌کند.

۱۱. پس از موفقیت init یا مهاجرت:

```powershell
docker compose up -d --wait web
```

۱۲. در مرورگر میزبان باز کنید:

```text
http://localhost:8000
```

اگر پورت ۸۰۰۰ قبلاً اشغال است، پیش از up متغیر `ASH_HTTP_PORT` را به یک پورت آزاد تغییر دهید؛ سرور قبلی را بی‌اجازه متوقف نکنید.

```powershell
$env:ASH_HTTP_PORT='8001'
```

Compose فعلی فقط loopback میزبان را منتشر می‌کند و برای توسعهٔ HTTP است؛ دسترسی عمومی/شبکهٔ شفاخانه نیاز به HTTPS reverse proxy، فایروال، TLS پایگاه‌داده و `ASH_SECURE_COOKIE=1` دارد. `0` بودن secure cookie در Compose به معنی پیکربندی امن اینترنتی نیست.

برای توقف بدون حذف volume:

```powershell
docker compose down
```

**`down -v` یا حذف volume را برای رفع مشکل اجرا نکنید؛ داده را از بین می‌برد.**

## ۴. مهاجرت امن SQLite → PostgreSQL

### پیش‌شرط‌ها

- مسئول IT و بالینی زمان توقف و معیار پذیرش را تأیید کنند؛ هیچ نویسنده‌ای در زمان snapshot/cutover فعال نماند.
- بکاپ معتبر schema 2 بگیرید و اصل آن را امن نگه دارید. schema 1 نخست به فایل جدید schema 2 ارتقا می‌خواهد.
- از snapshot مستقل استفاده کنید، نه کپی سادهٔ DB فعال. کنار فایل مبدأ نباید `-wal` یا `-journal` باشد. **برای عبور از خطا sidecarها را حذف نکنید**؛ snapshot صحیح تازه بگیرید.
- یک کپی محافظت‌شده را به نام `imports/source.sqlite3` بگذارید؛ mount در کانتینر read-only است. فایل‌های واقعی در Git/build/ZIP جمع‌آوری نمی‌شوند.
- مقصد باید اختصاصی، خالی و offline باشد. init تازه یا web را روی آن اجرا نکرده باشید. URL عملیات، نقش `ash_owner` است، نه نقش runtime و نه superuser.

### نخست فقط بررسی، بدون تماس با مقصد

```powershell
docker compose run --rm ops python -m scripts.migrate_postgres /imports/source.sqlite3 --report /backups/source-inspection.json
```

نتیجه فقط schema، شمارش، hash و سیاست ابطال نشست‌هاست؛ محتوای دوسیه/رمز/URL چاپ نمی‌شود. فایل گزارش از قبل موجود باشد، دستور متوقف می‌شود؛ برای تلاش جدید نام تازه بدهید.

اگر Linux و فایل مبدأ با 0600 فقط برای UID میزبان قابل‌خواندن است، **مجوز اطلاعات طبی را عمومی نکنید**. عملیات مهاجرت را یک‌بار با UID/GID همان مالک فایل اجرا کنید و گزارش موقت را در `/tmp` بگذارید؛ receipt دائمی داخل DB مقصد نگه داشته می‌شود. این دستور مخصوص shell لینوکس است، نه PowerShell:

```sh
docker compose run --rm --user "$(id -u):$(id -g)" ops python -m scripts.migrate_postgres /imports/source.sqlite3 --report /tmp/inspection.json
```

روی Windows، مجوز File Sharing/ACL را مسئول IT بررسی کند. خطای Permission denied دلیل حذف فایل/تغییر رمز DB نیست.

### اعمال، فقط با تأیید مقصد خالی

```powershell
docker compose run --rm ops python -m scripts.migrate_postgres /imports/source.sqlite3 --apply --confirm-empty-target --report /backups/import-verified.json
```

اگر UID سفارشیِ بالا لازم بود، همان `--user` و مسیر `/tmp` را اینجا نیز استفاده کنید. فایل گزارش موقت کانتینر حذف می‌شود؛ **receipt در settings با کلید `enterprise_import_receipt` پایدار می‌ماند** و IT می‌تواند آن را به شکل امن صادر کند.

### چه چیزی تضمین و چه چیزی مستثناست؟

- مبدأ با اتصال immutable/read-only خوانده می‌شود؛ این حالت فقط برای snapshot **ثابت و offline** معتبر است. hash کل فایل پیش/پس کنترل می‌شود؛ هیچ clinical row اصلاح/حذف نمی‌شود.
- در مقصد، قفل advisory برای ابزارهای خود برنامه و یک تراکنش PostgreSQL، schema و انتقال داده را دربر می‌گیرد؛ ابزار هیچ merge یا truncate ندارد. نویسندهٔ SQL دلخواه خارج از برنامه را این قفل متوقف نمی‌کند؛ مقصد را ایزوله نگه دارید.
- رکوردها به ترتیب وابستگی و در batchهای ۵۰۰تایی منتقل می‌شوند. ID، MRN، hash رمزها، طرح/محتوای تأییدشده و سابقه حفظ و با شمارش و SHA-256 ردیف‌های نوع‌دار هر جدول تطبیق داده می‌شوند. این hash، تطبیق بازنمایی SQLAlchemy/نوع داده است، نه یکسان‌بودن فیزیکی فایل SQLite و PG.
- `sessions` و `login_attempts` عمداً منتقل نمی‌شوند؛ همه باید دوباره وارد شوند. `maintenance_state` و `maintenance_last_backup` بازنشانی می‌شوند؛ بکاپ SQLite نباید به‌عنوان بکاپ تازهٔ PostgreSQL نشان داده شود.
- یک audit و receipt جدید اضافه می‌شود. sequenceها برای ID بعدی تنظیم می‌شوند تا رکورد تازه با ID قدیمی تصادم نکند.
- خطای درج، constraint یا عدم تطبیق، **تراکنش مقصد** را rollback می‌کند؛ مبدأ ثابت می‌ماند. ابزار مقصد دارای داده را حتی برای تکرار اجرا نمی‌پذیرد.
- قطع ارتباط هنگام commit یا خطای نوشتن گزارش می‌تواند نتیجهٔ بیرونی را مبهم کند؛ اول receipt/وضعیت مقصد را بررسی کنید. «پیام خطا» لزوماً به معنی انجام‌نشدن commit نیست. خودکار retry یا حذف DB ممنوع است.
- ستون/جدول اضافی، view/trigger یا index سفارشیِ خارج از مدل، و نیز نوع/دادهٔ نامعتبر، precision خارج از حدود PostgreSQL یا مقدار Boolean غیر ۰/۱ به بازبینی نیاز دارد؛ سیستم آن را به‌عنوان اصلاح پزشکی حدس نمی‌زند.

### پذیرش و برگشت

بعد از import، روی PostgreSQL با همان حساب قبلی وارد شوید؛ شمارش چند بخش، چند سند تأییدشده، ID بعدی، صلاحیت‌ها و چاپ را تطبیق دهید. یک pg_dump و بازیابی مستقل آزمایشی انجام دهید. سپس با تأیید مسئول، کاربران را به مقصد جدید هدایت کنید. اصل SQLite را آرشیو و offline نگه دارید؛ دو سیستم هم‌زمان نویسنده نشوند.

تا وقتی در PG دادهٔ تازه ننوشته‌اید، برگشت عملیاتی می‌تواند راه‌اندازی مجدد **همان SQLite دست‌نخورده** باشد. پس از نوشتن اطلاعات تازه در PG، برگشت نیاز به reconciliation رسمی دارد؛ ابزار این مرحله reverse sync یا مهاجرت PG→SQLite نیست. انتقال آنلاین/بدون توقف و migration نسخه‌دار عمومی هنوز پیاده نشده است.

## ۵. بکاپ و بازیابی PostgreSQL

دکمهٔ بکاپ SQLite در رابط روی PostgreSQL پاسخ راهنما می‌دهد و فایل جعلی SQLite تولید نمی‌کند. برای PG از ابزار عملیاتی با role مالک و client هم‌نسخهٔ major یا سازگار استفاده کنید.

```powershell
docker compose run --rm ops python -m scripts.postgres_ops backup --output /backups/first-reviewed.dump
```

مقصد نباید موجود باشد. archive سفارشی، بدون owner/ACL اختصاصی و بدون دادهٔ نشست‌های ورود ساخته می‌شود. گذرواژه فقط در pgpass موقت 0600 است؛ بعد پاک می‌شود. SHA-256 اعلام و زمان ساخت در وضعیت سلامت ثبت می‌شود. **archive رمزگذاری نشده است**؛ قبل از انتقال رمزگذاری، ACL، کپی خارج از سرور و نگهداری امن لازم است. ساخت فایل به معنی آزمون بازیابی یا وصول روی حافظهٔ امن نیست. volume بکاپ روی همان میزبان جای DR خارج از میزبان را نمی‌گیرد.

اگر dump سالم ساخته شد اما ثبت وضعیت DB شکست خورد، ابزار فایل سالم را نگه می‌دارد؛ آن را حذف/بازنویسی نکنید. اگر client شکست بخورد، فقط خروجی ناقص تازهٔ همان تلاش پاک می‌شود، نه DB یا بکاپ قبلی.

برای restore، مسئول DB یک **دیتابیس تازه، خالی و جدا** و دسترسی role مالک آن را بسازد؛ ابزار برای ایجاد database یا overwrite نیازی به superuser نمی‌گیرد. در یک فایل secret مجزا، URL آن مقصد را تنظیم کنید و با محیط حفاظت‌شده اجرا کنید:

```text
python -m scripts.postgres_ops restore --source /secure/path/reviewed.dump --confirm-empty-target
```

این نمونه برای محیط دارای URL مقصدِ تنظیم‌شده است، نه فرمان آماده برای دیتابیس اصلی Compose. `pg_restore` با single-transaction/exit-on-error اجرا می‌شود؛ فایل SQL ناشناس/نامطمئن را restore نکنید، چون archive می‌تواند دستورات SQL داشته باشد. پس از restore، schema کنترل، نشست‌ها باطل و وضعیت بکاپ/سلامت بازنشانی می‌شود. اگر archive ناسازگار بود، مقصد تازه را offline برای بررسی نگه دارید؛ خودکار آن را حذف یا وارد سرویس نمی‌کنیم. سازگاری client/server major، extensions، roleها و encoding را IT بررسی کند.

بازیابی موفق فقط بخشی از پذیرش است؛ recordها، snapshotها، شمارش، چاپ، دسترسی‌ها و سیاست مجوز هم کنترل شوند. هیچ مسیر restore در این مرحله URL سرویس فعال را خودکار عوض نمی‌کند.

## ۶. پایش، معیارها و حریم خصوصی

| مسیر/ابزار | معنی |
|---|---|
| `/healthz` | زنده‌بودن فرآیند؛ سالم‌بودن DB یا تأیید بالینی نیست |
| `/readyz` | اتصال DB، جدول‌های لازم و schema_version؛ ۲۰۰ یا ۵۰۳، بدون اطلاعات حساس |
| `/api/ops/status` | فقط مدیر: نوع backend، readiness و وضعیت ناظر؛ FHIR/SMART صریحاً false |
| `/api/ops/metrics` | فقط مدیر با نشست معتبر: متن Prometheus از شمارش HTTP، زمان تجمعی، uptime و DB ready |
| مرکز سلامت قبلی | همان هشدار ۳۰ دقیقه‌ای/تأیید دریافت/ارجاع دستی ۴۸ ساعت |

در PG، بررسی سلامت «اتصال و schema» است؛ جای `amcheck`، بررسی corruption، replica monitoring یا backup restore test نیست. در کانتینرِ بدون release manifest، checksum فایل‌ها unavailable است؛ از image digest و کنترل انتشار استفاده کنید. فضای دیسک فعلی مربوط به filesystem برنامه است، نه ظرفیت کامل volume دیتابیس یا سرویس ابری.

لاگ **HTTP برنامه** JSON است: request ID تولیدشدهٔ سرور، method، route pattern ثابت، status و زمان؛ body، query، URL کامل، نام مریض، ID کاربر، cookie و token ثبت نمی‌شود. request ID در پاسخ می‌آید. exception خام برنامه/driver در پاسخ و لاگ HTTP چاپ نمی‌شود. access log پیش‌فرض Uvicorn در Compose خاموش است. بااین‌حال لاگ PostgreSQL/پروکسی/ابزارها را حساس فرض کنید؛ Compose verbosity و parameter logging DB را محدود کرده، اما ادعای حذف تمام PHI از همهٔ لایه‌های ثالث نمی‌شود.

metrics در این مرحله **per-process و در حافظه** است؛ restart آن را reset می‌کند و چند worker تجمیع نمی‌شوند. scraper استاندارد OAuth/token مستقل و Prometheus/Grafana/OTel آماده نشده؛ endpoint از auth مدیر موجود استفاده می‌کند. کوکی مدیر را در فایل scrape عمومی نگه ندارید. این پایهٔ observability است، نه سکوی کامل مانیتورینگ تولید.

## ۷. امنیت محیط توسعه و کارهای باقی‌مانده

- bootstrap superuser فقط در کانتینر DB است؛ وب secret آن را ندارد. `ash_owner` فقط برای init/import/backup، و `ash_app` برای DML runtime است؛ وب DDL نمی‌کند.
- image وب کاربر 10001، root filesystem فقط‌خواندنی، `/tmp` محدود، capabilityهای حذف‌شده و no-new-privileges دارد. کانتینر ops هم به‌طور عادی non-root است.
- رمزهای DB در image یا source نیستند. secret فایل‌های Compose راهکار توسعه‌اند، نه KMS/Vault/سرویس چرخش secret تولید. تعویض فایل پس از ایجاد volume رمز role واقعی PG را خودکار عوض نمی‌کند.
- ارتباط داخلی Compose در این نمونه بدون TLS است و فقط شبکهٔ خصوصی Docker دارد؛ برای تولید یا DB راه‌دور، TLS با verify-full/CA معتبر، HTTPS و secure cookie ضروری است.
- یک worker عمداً حفظ شده؛ قفل ناظر سلامت محلی و metrics per-process است. scale-out/HA/replication، shared scheduling و کنترل تراکنش همهٔ raceهای ممکن هنوز بازبینی می‌خواهند.
- این مدل هنوز تک‌مرکزی است، نه چندمستاجری با RLS. integerهای فعلی epoch و ID هم به برنامهٔ ارتقای نوع/عمر بلندمدت نیاز دارند؛ PostgreSQL به‌تنهایی این مسائل را حل نمی‌کند.
- طرح DB و `schema_version=2` ثابت مانده‌اند؛ برای تغییرهای بعدی migration نسخه‌دار، rollback rehearsal و نسخه‌بندی API لازم است.
- Kubernetes، API Gateway خارجی، HSM/KMS، audit storage تغییرناپذیر، FHIR R4 و SMART/OIDC، RAG/pgvector/OCR/CDS و تأییدهای پزشکی هنوز مرحله‌های بعد هستند. از دادهٔ واقعی برای AI خارجی استفاده نشده است.

## ۸. CI و شواهد آزمون

Workflow در GitHub آماده شده، اما تا وقتی تغییرات به همین branch push و workflow اجرا نشود، **ادعای موفقیت GitHub CI نداریم**. در این محیط Docker daemon در دسترس نیست؛ build/runtime واقعی Docker Compose نیز هنوز اجرا نشده است. فایل YAML به‌صورت محلی بررسی می‌شود و job Compose در CI برای build، init، readiness و backup/restore نوشته شده است. نسخه/digest imageها و SHA دقیق actionها را قبل از تولید بازبینی و pin کنید.

آزمون‌های محلی: رگرسیون کامل SQLite؛ پشتیبانی و مهاجرت واقعی با PostgreSQL 17.6؛ آزمون client backup/restore با PostgreSQL/client 16.2 هم‌نسخهٔ جدا و صرفاً آزمایشی. ابزارهای این تست‌ها در `.cache` هستند و به محصول/سرور واقعی توزیع نمی‌شوند. این آزمایش PG16 تأیید تولید یا جای آزمون Docker17 نیست.

برای اجرای PostgreSQL tests روی یک cluster **کاملاً آزمایشی** که کاربر آن حق ساخت DB موقت دارد، `ASH_TEST_DATABASE_URL` را از مسیر امن تنظیم کنید. testها فقط DBهایی با نام تصادفی `ash_test_*` می‌سازند/حذف می‌کنند؛ URL دیتابیس تولید را ندهید.

```text
python -m pip install -r requirements-dev.txt -r requirements-enterprise.txt -c requirements-tested.txt
python -m pytest -q
```

آزمون اختیاری backup/restore علاوه بر `pg_dump`/`pg_restore` سازگار، `ASH_RUN_PG_CLIENT_TESTS=1` می‌خواهد. CI هم خروجی Tailwind، syntax و DOM را با `npm ci --ignore-scripts`، `npm run check:css`، `npm run check` و `npm test` کنترل می‌کند. بدون URL PG، آزمون‌های وابسته به آن صریحاً skip می‌شوند، نه اینکه موفق جا زده شوند.

## ۹. رفع مشکل بدون تخریب

| نشانه | علت/اقدام |
|---|---|
| Ambiguous database configuration | فقط یکی از URL، URL_FILE یا DB_PATH را نگه دارید؛ fallback خودکار وجود ندارد |
| ۵۰۳ در readyz | DB/role/schema آماده نیست؛ db health، init/import و اتصال را بررسی کنید؛ liveness ۲۰۰ کافی نیست |
| مقصد خالی نیست | DB اشتباه، init قبلی یا import قبلاً commit شده؛ receipt را بررسی کنید؛ truncate/drop خودکار نکنید |
| مبدأ WAL/journal دارد | snapshot ثابت نیست؛ بکاپ سازگار تازه بگیرید، sidecar را حذف نکنید |
| Permission denied در secret/import | ACL یا UID/GID؛ اطلاعات طبی را عمومی نکنید، matching UID یا مجوز Docker را با IT تنظیم کنید |
| Password authentication failed بعد از بازسازی secret | فایل جدید رمز role داخل volume قدیمی را عوض نکرده؛ secret اصلی/چرخش رسمی role را بررسی کنید؛ volume را حذف نکنید |
| پورت ۸۰۰۰ اشغال | فرآیند موجود را بررسی؛ پورت توسعهٔ دیگری انتخاب کنید |
| نسخهٔ client/server ناسازگار | pg_dump مناسب major سرور استفاده کنید؛ ابزار Compose client17 دارد |
| خطای import یا گزارش ناقص | مقصد و receipt را قبل از تکرار بررسی؛ اصل snapshot حفظ؛ نام گزارش تازه و تأیید انسانی |
| backup قبلی موجود است | overwrite ممنوع است؛ نام جدید و فضای امن انتخاب کنید |

برای کمک، request ID، مرحله، backend و خطای **غیرحساس** را بدهید؛ URL دارای رمز، فایل secret، DB، backup یا معلومات مریض را در گفتگو نفرستید.
