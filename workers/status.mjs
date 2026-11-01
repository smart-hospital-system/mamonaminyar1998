/**
 * Aybek Ten-Bed Specialy Surgical Hospital — public status endpoint.
 *
 * Why this Worker exists
 * ----------------------
 * The hospital system itself is an on-premise Next.js application: it keeps its
 * records in a local SQLite file (`node:sqlite`) on the hospital computer, writes
 * backups to disk and prints on the local network. None of that can run on
 * Cloudflare's edge, so this repository does NOT deploy the hospital to Workers.
 *
 * The repository is connected to Cloudflare Workers Builds, and that pipeline
 * runs `npx wrangler deploy` on every push. Without a Wrangler configuration
 * file Wrangler falls back to "automatic project configuration": it detects
 * Next.js, tries to scaffold an OpenNext adapter inside CI and the build fails.
 * This file plus ../wrangler.jsonc make the deploy deterministic: a tiny,
 * dependency-free status Worker goes to the edge, and the hospital keeps
 * running where its data actually lives.
 *
 * Routes
 * ------
 *   GET /            bilingual status page (English, `?lang=fa` for Dari)
 *   GET /health      JSON health probe
 *   GET /version     JSON build info
 *   *               404
 */

const SERVICE = "ash-magic-transit";
const HOSPITAL_EN = "Aybek Ten-Bed Specialy Surgical Hospital";
const HOSPITAL_FA = "شفاخانه ده بستر جراحی ایبک";
const VERSION = "7";
const OWNER = "Dr. Mamon Aminyar";

const TEXT = {
  en: {
    dir: "ltr",
    lang: "en",
    label: "Status endpoint",
    title: "The hospital system runs on the hospital computer",
    lead:
      "This page is hosted on Cloudflare Workers. The Aybek HMS application — patient records, pharmacy, laboratory, radiology, theatre, billing and the offline clinical engine — is not deployed here. It runs on the hospital's own computer, where its database and backups live.",
    startTitle: "Start the hospital system",
    startBody:
      "On the hospital computer, clone the repository, install once and run the deployment script. It creates the demonstration database, builds the application the first time and serves it on port 3000.",
    steps: [
      "git clone https://github.com/smart-hospital-system/mamonaminyar1998.git aybek-hospital",
      "cd aybek-hospital",
      "npm install",
      "npm run deploy",
    ],
    openNote:
      "Then open http://localhost:3000/hms/login on that computer, or http://<this-computer-IP>:3000/hms/login from a tablet or another ward computer on the same network.",
    whyTitle: "Why not on the edge?",
    why: [
      "Records are stored in a local SQLite file, not in a hosted database.",
      "The system must keep working with no internet connection — offline is identical to online.",
      "Backups, printing and the local network are part of the clinical workflow.",
    ],
    endpointTitle: "This Worker answers",
    endpoints: [
      ["/", "This page — human readable status"],
      ["/health", "JSON health probe for uptime monitoring"],
      ["/version", "JSON build information"],
    ],
    owner: "Owner",
    footer: "This endpoint is a status page, not the hospital system.",
  },
  fa: {
    dir: "rtl",
    lang: "fa",
    label: "نقطه وضعیت",
    title: "سیستم شفاخانه روی کمپیوتر خود شفاخانه اجرا می‌شود",
    lead:
      "این صفحه روی کلودفلر (Cloudflare Workers) میزبانی می‌شود. تطبیق ایبک اچ‌ام‌اس — پرونده بیماران، دواخانه، لابراتوار، اکسری، اتاق عملیات، بل و موتور کلینیکی آفلاین — اینجا اجرا نمی‌شود. روی کمپیوتر خود شفاخانه اجرا می‌شود، همان‌جایی که پایگاه داده و نسخه‌های پشتیبان قرار دارند.",
    startTitle: "شروع سیستم شفاخانه",
    startBody:
      "روی کمپیوتر شفاخانه، مخزن را کلون کنید، یک بار نصب کنید و سکریپت راه‌اندازی را اجرا کنید. این سکریپت پایگاه داده نمایشی را می‌سازد، بار اول تطبیق را بیلد می‌کند و آن را روی پورت ۳۰۰۰ اجرا می‌کند.",
    steps: [
      "git clone https://github.com/smart-hospital-system/mamonaminyar1998.git aybek-hospital",
      "cd aybek-hospital",
      "npm install",
      "npm run deploy",
    ],
    openNote:
      "بعد روی همان کمپیوتر http://localhost:3000/hms/login را باز کنید، یا از تبلت و کمپیوتر دیگر بخش‌ها در همان شبکه http://<IP-این-کمپیوتر>:3000/hms/login را.",
    whyTitle: "چرا روی لبه شبکه نیست؟",
    why: [
      "اطلاعات در یک فایل SQLite محلی ذخیره می‌شود، نه در یک پایگاه داده میزبانی‌شده.",
      "سیستم باید بدون انترنت هم کار کند — نسخه آفلاین با آنلاین فرق ندارد.",
      "نسخه پشتیبان، چاپ و شبکه محلی بخشی از کار بالینی هستند.",
    ],
    endpointTitle: "این ورکر پاسخ می‌دهد",
    endpoints: [
      ["/", "همین صفحه — وضعیت قابل خواندن"],
      ["/health", "پاسخ JSON برای پایش در دسترس بودن"],
      ["/version", "اطلاعات نسخه به صورت JSON"],
    ],
    owner: "مالک",
    footer: "این نقطه تنها یک صفحه وضعیت است، نه سیستم شفاخانه.",
  },
};

function pickLang(request, url) {
  const asked = (url.searchParams.get("lang") || "").toLowerCase();
  if (asked === "fa" || asked === "prs" || asked === "dar" || asked === "فا") return "fa";
  if (asked === "en") return "en";
  const header = (request.headers.get("accept-language") || "").toLowerCase();
  return /(^|,|\s)(fa|prs|dar)(-|;|,|$)/.test(header) ? "fa" : "en";
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2) + "\n", {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-aybek-service": SERVICE,
    },
  });
}

function page(t, lang) {
  const font =
    lang === "fa"
      ? "'Vazirmatn','Noto Naskh Arabic','Segoe UI',Tahoma,sans-serif"
      : "'Segoe UI',system-ui,-apple-system,sans-serif";
  const steps = t.steps
    .map((s) => `<li><code>${s.replace(/</g, "&lt;")}</code></li>`)
    .join("");
  const why = t.why.map((s) => `<li>${s}</li>`).join("");
  const endpoints = t.endpoints
    .map(([p, d]) => `<tr><td><code>${p}</code></td><td>${d}</td></tr>`)
    .join("");
  return `<!doctype html>
<html lang="${t.lang}" dir="${t.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${HOSPITAL_EN} — ${t.label}</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ${font}; line-height: 1.65;
         background: #f5f7fb; color: #16202e; }
  main { max-width: 46rem; margin: 0 auto; padding: 2.5rem 1.25rem 3.5rem; }
  .pill { display: inline-flex; align-items: center; gap: .5rem; font-size: .8rem;
          font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
          background: #e6f6ee; color: #14663f; border: 1px solid #b7e4cd;
          border-radius: 999px; padding: .3rem .75rem; }
  .dot { width: .5rem; height: .5rem; border-radius: 50%; background: #17a05e; }
  h1 { font-size: clamp(1.45rem, 4vw, 2.05rem); line-height: 1.3; margin: 1rem 0 .5rem; }
  .hospital { font-weight: 700; color: #0f5ea8; margin: 0 0 1.25rem; }
  p.lead { font-size: 1.02rem; margin: 0 0 1.75rem; }
  section { background: #fff; border: 1px solid #dde5ef; border-radius: 14px;
            padding: 1.25rem 1.35rem; margin: 0 0 1.1rem; }
  h2 { font-size: 1.02rem; margin: 0 0 .6rem; color: #0b3f6a; }
  ol, ul { margin: 0; padding-inline-start: 1.25rem; }
  li { margin: .3rem 0; }
  code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: .88em;
         background: #eef3f9; border: 1px solid #dde5ef; border-radius: 6px;
         padding: .12rem .38rem; display: inline-block; }
  ol code { display: block; padding: .4rem .55rem; margin: .2rem 0; word-break: break-all; }
  table { width: 100%; border-collapse: collapse; font-size: .93rem; }
  td { padding: .35rem .3rem; border-top: 1px solid #eef2f7; vertical-align: top; }
  td:first-child { width: 8rem; }
  .note { color: #46586e; font-size: .93rem; margin: .75rem 0 0; }
  footer { color: #67788e; font-size: .85rem; text-align: center; margin-top: 1.75rem; }
  @media (prefers-color-scheme: dark) {
    body { background: #10161f; color: #e6edf6; }
    section { background: #17202c; border-color: #26313f; }
    h2 { color: #9ec8f0; }
    .hospital { color: #8fc2f2; }
    .pill { background: #10331f; color: #86e0ac; border-color: #1d5433; }
    code { background: #1d2733; border-color: #2b3846; }
    td { border-color: #26313f; }
    .note, footer { color: #96a6ba; }
  }
</style>
</head>
<body>
<main>
  <span class="pill"><span class="dot"></span>${t.label}</span>
  <h1>${t.title}</h1>
  <p class="hospital">${HOSPITAL_EN} · ${HOSPITAL_FA}</p>
  <p class="lead">${t.lead}</p>

  <section>
    <h2>${t.startTitle}</h2>
    <p>${t.startBody}</p>
    <ol>${steps}</ol>
    <p class="note">${t.openNote}</p>
  </section>

  <section>
    <h2>${t.whyTitle}</h2>
    <ul>${why}</ul>
  </section>

  <section>
    <h2>${t.endpointTitle}</h2>
    <table>${endpoints}</table>
    <p class="note">${t.owner}: ${OWNER}</p>
  </section>

  <footer>${t.footer} · v${VERSION} · ${SERVICE}</footer>
</main>
</body>
</html>
`;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          allow: "GET, HEAD, OPTIONS",
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, HEAD, OPTIONS",
        },
      });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ error: "method_not_allowed", allow: "GET, HEAD, OPTIONS" }, 405);
    }

    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/health" || path === "/healthz") {
      return json({
        status: "ok",
        service: SERVICE,
        hospital: HOSPITAL_EN,
        hospital_fa: HOSPITAL_FA,
        deployment: "cloudflare-worker",
        note: "status endpoint only — the hospital application runs on-premise",
        version: VERSION,
      });
    }

    if (path === "/version") {
      return json({
        service: SERVICE,
        version: VERSION,
        hospital: HOSPITAL_EN,
        owner: OWNER,
        source: "https://github.com/smart-hospital-system/mamonaminyar1998",
        runtime: "on-premise (Node.js 20+, SQLite, offline capable)",
      });
    }

    if (path === "/" || path === "/status") {
      const lang = pickLang(request, url);
      const body = page(TEXT[lang], lang);
      return new Response(request.method === "HEAD" ? null : body, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=300",
          vary: "accept-language",
          "content-language": lang,
          "x-aybek-service": SERVICE,
        },
      });
    }

    return json({ error: "not_found", path, try: ["/", "/health", "/version"] }, 404);
  },
};
