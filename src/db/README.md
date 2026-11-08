# هستهٔ Identity & Security — پیاده‌سازی پیش‌نویس سند نسخهٔ ۴

این پوشه مدل ساختاری `ASH-ARCH-DB-CORE-001` نسخهٔ ۴ را با Drizzle ORM برای PostgreSQL 17 تعریف می‌کند. سند مادر در `docs/ASH-ARCH-DB-CORE-001-v4.md` نگهداری می‌شود.

## مرز مصوب این مرحله

- ۱۹ جدول در دو Schema منطقی `app` و `security`؛
- روابط Drizzle، FK، CHECK، UNIQUE و شاخص‌های ضروری؛
- تست ساختاری بدون دیتابیس در `tests/unit/core-schema.test.ts`؛
- هیچ Migration، SQL اجرایی، Seed، Runtime client یا تغییر در دیتابیس انجام نشده است.

Import کردن `schema/index.ts` هیچ `CREATE SCHEMA` یا Query دیگری اجرا نمی‌کند. دو اپلیکیشن فعلی Next.js/SQLite و FastAPI/SQLAlchemy به این مدل متصل نشده‌اند. وجود Schema قدیمی `public` و جدول‌های هم‌نام در FastAPI، اجرای Migration آینده را بدون طرح Cutover مجاز نمی‌کند.

## نقشه جدول‌ها

| Schema | جدول‌ها |
|---|---|
| `app` | `departments`, `staff`, `staff_departments` |
| `security` | `users`, `account_requests`, `auth_sessions`, `login_attempts`, `password_reset_requests`, `roles`, `permissions`, `role_permissions`, `user_roles`, `role_grant_rules`, `approval_requests`, `approval_decisions`, `emergency_access_grants`, `audit_logs`, `security_alerts`, `audit_retention_policies` |

## تصمیم‌های ساختاری مهم

### کارمند و بخش

`app.staff` هیچ `department_id` ندارد. عضویت‌ها در `app.staff_departments` با `PRIMARY/SECONDARY` و `start_date/end_date` نگهداری می‌شوند. شناسهٔ سازمانی `staff_number` الزامی و یکتا است.

- `staff_departments_one_active_primary_unique`: حداکثر یک بخش اصلی با `end_date IS NULL`؛
- `staff_departments_open_membership_unique`: حداکثر یک عضویت باز برای هر زوج کارمند/بخش؛
- پایان انتساب می‌تواند مساوی شروع باشد، اما نه پیش از آن؛
- `assigned_by` به `app.staff.id` متصل است و با `RESTRICT` از تاریخچه محافظت می‌کند.

### حساب و نشست

- وضعیت پیش‌فرض حساب `DISABLED` است؛ تأیید درخواست به‌تنهایی حساب را فعال نمی‌کند.
- فعال‌بودن MFA بدون ثبت `mfa_method` با CHECK رد می‌شود؛ این به معنی طراحی ذخیرهٔ امن Secret نیست.
- `account_requests_no_self_review_check` تطبیق درخواست‌کننده و Reviewer را رد می‌کند.
- `auth_sessions_absolute_24h_check` دقیقاً `expires_at = created_at + interval '24 hours'` را الزام می‌کند. تغییر آیندهٔ مدت نشست به Migration سازگار نیاز دارد.
- تلاش ورود و رویداد Audit فقط `source_identifier_hash` دارند، نه IP یا User Agent خام.
- Token خام و رمز خام هیچ ستونی ندارند. Hash توکن Reset تا صدور مجاز می‌تواند `NULL` باشد و در صورت وجود یکتا است.

### RBAC و تأیید

- Scope نقش باید دقیقاً با خالی/پر بودن `department_id` سازگار باشد.
- `user_roles_no_self_grant_check` هر انتساب نقش به خودِ اعطاکننده را رد می‌کند؛ این محدودیت عمداً از قاعدهٔ «عدم ارتقای خود» سخت‌گیرانه‌تر است.
- Unique Index جزئی نقش، انتساب لغونشدهٔ تکراری را ممنوع می‌کند. برای `GLOBAL`، UUID صفر فقط داخل عبارت Index جای `NULL` می‌گیرد و در داده ذخیره نمی‌شود.
- `role_grant_rules` سه‌تایی Grantor/Target/Scope را یکتا می‌کند. مجازبودن واقعی Grant باید با این جدول، نقش فعال، عضویت بخش و سیاست سرویس ارزیابی شود.
- هر `approval_request` حداکثر یک `approval_decision` دارد. Payload و Hash هر دو الزامی‌اند.
- `related_event_id` در هشدار امنیتی **FK نیست** تا چرخهٔ Retention/Partitioning رویدادها باعث حذف تاریخچهٔ هشدار نشود؛ رابطهٔ خواندنی Drizzle به `event_id` وجود دارد.

### Audit و Retention

- `event_id` مستقل و یکتاست و `correlation_id` اجباری است.
- سیاست نگهداری به‌صورت پیش‌فرض `is_active = false` است.
- برای مقدار Canonical `record_type = 'audit_logs'`، CHECK حداقل پنج سال را الزام می‌کند. Service باید Record Typeها را Normalize و Allowlist کند تا نوشتن نام متفاوت، قاعده را دور نزند.
- هیچ Job حذف خودکار در این مرحله وجود ندارد.

## مقدارهای پیشنهادی که سند نسخهٔ ۴ صریحاً فهرست نکرده است

این مقدارها برای کامل‌شدن پیش‌نویس انتخاب شده‌اند و باید در بازبینی سرویس تأیید شوند؛ تصمیم نهایی مدیریت محسوب نمی‌شوند:

- `password_reset_requests.status`: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `COMPLETED`, `EXPIRED`؛
- `audit_logs.outcome`: `SUCCESS`, `FAILURE`, `DENIED`, `PARTIAL`؛
- `security_alerts.severity`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`؛
- `security_alerts.status`: `OPEN`, `ACKNOWLEDGED`, `RESOLVED`؛
- `approval_decisions.decision`: `APPROVED`, `REJECTED`.

## موارد حل‌نشده پیش از SQL نهایی

1. **همپوشانی بازه‌ها:** Indexهای جزئی فقط رکوردهای باز را محدود می‌کنند. همپوشانی انتساب‌های بسته/آینده و نقش‌های تاریخ‌دار به Exclusion Constraint مبتنی بر `daterange`/`tstzrange` و `btree_gist` یا راهکار بازبینی‌شدهٔ دیگر نیاز دارد.
2. **Idempotency اجرای تأیید:** `payload_hash` برای تشخیص تغییر محتواست، نه کلید Idempotency. در ستون‌های ارائه‌شدهٔ نسخهٔ ۴ کلید مستقل وجود ندارد؛ افزودن `idempotency_key` یکتا یا طراحی معادل باید پیش از Migration تصویب شود. اجرای تکراری را نمی‌توان فقط با Hash محتوا ممنوع کرد، چون دو عملیات مشروع ممکن است Payload یکسان داشته باشند.
3. **قواعد بین‌جدولی:** جلوگیری از تأیید Approval توسط Requester، تطبیق Decision با وضعیت Request، مجوز Grantor، عضویت بخش، ممنوعیت اعطای `SYSTEM_ADMIN`، و بررسی دوبارهٔ مجوزها هنگام اجرا به Transaction Service و در صورت تصویب Trigger نیاز دارند.
4. **تغییرناپذیری Payload:** تطبیق `payload_hash` هنگام اجرا، Canonical Serialization و ممنوعیت Update پس از ثبت/تأیید باید پیاده و آزموده شود؛ JSONB و CHECK به‌تنهایی کافی نیستند.
5. **چرخهٔ وضعیت‌ها:** تبدیل `PENDING → APPROVED → EXECUTED`، انقضا، لغو، خطا، تکمیل Account/Reset Request و یکتایی Username در زمان فعال‌سازی باید State Machine تراکنشی داشته باشد.
6. **لغو نشست‌ها:** تغییر رمز، غیرفعال‌سازی و خروج باید در همان تراکنش نشست‌ها را لغو و Audit کنند. ساختار جدول این اثر جانبی را خودکار انجام نمی‌دهد.
7. **Password/MFA:** Argon2id، رد رمز ضعیف، سیاست حداقل ۶ کاراکتر مندرج در سند، Rate Limit، قفل پنج‌دقیقه‌ای و ذخیرهٔ امن عامل MFA در لایهٔ سرویس بررسی شوند. طول رمز در Schema قابل ارزیابی نیست و ذخیرهٔ Secret MFA هنوز طراحی نشده است.
8. **حفاظت Audit:** مجوزهای Role برنامه، منع UPDATE/DELETE، Trigger هشدار، Redaction با Allowlist، ثبت مشاهدهٔ Audit، Backup مستقل و محافظت در برابر DBA هنوز پیاده نشده‌اند.
9. **چرخهٔ Retention:** سال تقویمی، Legal Hold، قوانین محلی، Partitioning و Restore قبل از هر حذف فیزیکی باید آزموده شوند.
10. **زمان `updated_at`:** مقدار اولیه `now()` است؛ Service باید آن را صریحاً به‌روزرسانی کند. Trigger پنهانی اضافه نشده است.

## آزمون

```sh
npm run test:core
```

تست‌ها ۱۹ جدول، Namespaceها، ستون‌ها، FKهای `RESTRICT`، Indexهای جزئی، Scope، شاخص‌های ترکیبی، زمان‌ها و روابط را بررسی می‌کنند. موفقیت آن‌ها **تأیید Production، اجرای Migration، امنیت سرویس یا تست Integration روی PostgreSQL نیست.**
