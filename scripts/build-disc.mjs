#!/usr/bin/env node
/**
 * Build the delivery disc folder.
 *
 *   node scripts/build-disc.mjs                 # → dist/Aybek-DISC-v7
 *   node scripts/build-disc.mjs --out D:\DISC   # somewhere else
 *   node scripts/build-disc.mjs --no-source     # leave the source zip out
 *
 * What it produces
 *   dist/Aybek-DISC-v7/
 *     AUTORUN.INF  START-HERE.bat  README-FIRST-FA.txt  CHECKLIST-FA.txt
 *     RAHNAMA-FA.html
 *     MANIFEST-SHA256          one hash per file, `sha256sum -c` compatible
 *     MANIFEST.txt             what is on the disc, how big, what is missing
 *     HOSPITAL/                the built application — `node server.js`, no npm
 *     SOURCE/                  the sources as a zip, for whoever maintains it
 *     TOOLS/                   the ISO and DVD scripts, node installer slot
 *     DOCS/                    the guides
 *
 * Why the application is prebuilt: the hospital computers have no internet and
 * no developer to run npm install. `next build` with `output: "standalone"` copies
 * the server plus only the modules it imports, so the disc works with a plain
 * Node.js install. The database that ships (HOSPITAL/data/demo-hospital.db) is a
 * copy of this machine's hospital including the current clinical catalogue, so
 * the first start needs no internet or seeding step.
 *
 * Everything is written fresh each run; nothing is appended to an old disc folder.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

const root = process.cwd();
const argv = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};
const out = path.resolve(root, argOf("--out", path.join("dist", "Aybek-DISC-v7")));
const withSource = !argv.includes("--no-source");
const VERSION = "7";

const say = (m) => console.log(`  ${m}`);
const ok = (m) => console.log(`  [ok]   ${m}`);
const warn = (m) => console.log(`  [!]    ${m}`);
const die = (m) => {
  console.error(`  [x]    ${m}`);
  process.exit(1);
};

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const rel = (p) => path.relative(out, p).split(path.sep).join("/");

/* --------------------------------------------------------------- 0. preflight */
console.log("");
console.log("  AYBEK HOSPITAL — BUILD DELIVERY DISC");
console.log("  ------------------------------------");

const standalone = path.join(root, ".next", "standalone");
if (!fs.existsSync(path.join(standalone, "server.js"))) {
  die("No standalone build. Run `npm run build` first (next.config.ts sets output: \"standalone\").");
}
const demoDb = path.join(root, "data", "demo-hospital.db");
if (!fs.existsSync(demoDb)) {
  die("data/demo-hospital.db is missing. Run `npm run hms:demo-db` with the hospital stopped.");
}

/* ---- Read the generated catalogue manifest and verify the shipped DB has
        exactly that many medication examples (conditions without routine
        medicines deliberately do not become empty prescription rows). ---- */
let catalogueStats;
try {
  const generated = JSON.parse(fs.readFileSync(path.join(root, "data", "disease-regimens.json"), "utf8"));
  catalogueStats = {
    conditions: Number(generated.totals?.diseases ?? 0),
    medicatedConditions: Number(generated.totals?.medicatedConditions ?? 0),
    chapters: Number(generated.totals?.chapters ?? 0),
    prescriptions: Number(generated.totals?.prescriptionExamples ?? 0),
    formulary: Number(generated.totals?.formularyMedicines ?? 0),
  };
  if (!catalogueStats.conditions || !catalogueStats.medicatedConditions || !catalogueStats.prescriptions || !catalogueStats.formulary) {
    die("Generated catalogue totals are missing. Run `npm run hms:regimens` first.");
  }
} catch (e) {
  die(`Could not read data/disease-regimens.json: ${e.message}`);
}
let demoStats = {
  ...catalogueStats,
  prescriptionConditions: 0,
  patients: 0,
  medicines: 0,
  prescriptions: 0,
};
try {
  const db = new DatabaseSync(demoDb, { readOnly: true });
  const one = (sql) => Number(db.prepare(sql).get()?.c ?? 0);
  demoStats = {
    ...demoStats,
    prescriptionConditions: one("SELECT COUNT(DISTINCT diagnosis) AS c FROM hms_prescriptions WHERE rx_no LIKE 'RX-C-%'"),
    prescriptions: one("SELECT COUNT(*) AS c FROM hms_prescriptions WHERE rx_no LIKE 'RX-C-%'"),
    patients: one("SELECT COUNT(*) AS c FROM hms_patients"),
    medicines: one("SELECT COUNT(*) AS c FROM hms_medicines"),
  };
  db.close();
} catch (e) {
  die(`Could not read data/demo-hospital.db: ${e.message}`);
}
if (demoStats.prescriptions !== catalogueStats.prescriptions) {
  die(
    `The demo database has ${demoStats.prescriptions} catalogue prescription rows; ` +
      `the generated data expects ${catalogueStats.prescriptions}. Run ` +
      "`npm run hms:catalogue`, then `npm run hms:demo-db`, then build the disc again."
  );
}
if (demoStats.prescriptionConditions !== catalogueStats.medicatedConditions) {
  die(
    `The demo database has ${demoStats.prescriptionConditions} distinct catalogue diagnoses; ` +
      `the generated data expects ${catalogueStats.medicatedConditions}. Run ` +
      "`npm run hms:catalogue`, then `npm run hms:demo-db`, then build the disc again."
  );
}
if (demoStats.prescriptions < 1000) {
  die("The demo database has fewer than 1000 catalogue prescriptions; check the clinical seeder.");
}
ok(`demo database: ${demoStats.conditions} conditions · ${demoStats.prescriptionConditions} conditions with medication examples · ${demoStats.prescriptions} prescription examples · ${demoStats.formulary} formulary medicines`);

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const copyDir = (from, to, skip = () => false) => {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (skip(src, entry)) continue;
    if (entry.isDirectory()) copyDir(src, dst, skip);
    else if (entry.isSymbolicLink()) continue;
    else fs.copyFileSync(src, dst);
  }
};

/* ------------------------------------------------------- 1. HOSPITAL/ (the app) */
say("Copying the built application (no npm needed on site)…");
const hospital = path.join(out, "HOSPITAL");
copyDir(standalone, hospital, (src, entry) => {
  // .next/cache is a build cache, and any real database or signing key must never
  // travel on a disc: the shipped data/ is replaced below with the demo copy.
  if (src.endsWith(path.join(".next", "cache"))) return true;
  if (entry.name === "data") return true;
  return false;
});
// the standalone output does not include these two; Next documents copying them
copyDir(path.join(root, ".next", "static"), path.join(hospital, ".next", "static"));
if (fs.existsSync(path.join(root, "public"))) copyDir(path.join(root, "public"), path.join(hospital, "public"));

const hospitalData = path.join(hospital, "data");
fs.mkdirSync(hospitalData, { recursive: true });
fs.copyFileSync(demoDb, path.join(hospitalData, "demo-hospital.db"));
// first start needs something to open; deploy.mjs on a normal install copies it,
// and START-HOSPITAL.bat on the disc does the same in one line
ok(`HOSPITAL/ ready (${mb(dirSize(hospital))})`);

const startBat = `@echo off
rem ==========================================================================
rem  Aybek Ten-Bed Specialy Surgical Hospital - start the hospital
rem  No internet, no npm, no build step. Just Node.js and this folder.
rem ==========================================================================
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo   Node.js is not installed on this computer.
  echo   Run the installer in TOOLS\\ first, then start this file again.
  echo   -^>  https://nodejs.org  ^(LTS 20 or newer^)
  echo.
  pause
  exit /b 1
)

if not exist "data" mkdir "data"
if not exist "data\\slotly.db" (
  if exist "data\\demo-hospital.db" (
    copy /y "data\\demo-hospital.db" "data\\slotly.db" >nul
    echo   First start: installed the demonstration hospital.
  )
)

echo.
echo   Aybek Hospital is starting.
echo   Open your browser at:  http://localhost:3000
echo   Sign in: doctor@aybek.hospital / mamonaminyar
echo.
echo   Keep this window open while the hospital is in use.
echo   Close it (or press Ctrl+C) to stop.
echo.

set PORT=3000
set HOSTNAME=0.0.0.0
node server.js
echo.
echo   The hospital has stopped. Your records are in data\\slotly.db
pause
`;
fs.writeFileSync(path.join(hospital, "START-HOSPITAL.bat"), startBat.replace(/\n/g, "\r\n"), "utf8");

const firstReadme = `AYBEK TEN-BED SPECIALY SURGICAL HOSPITAL
شفاخانه ده بستر جراحی ایبک
Version ${VERSION} — offline installation disc

WHAT IS ON THIS DISC

  HOSPITAL\\   The hospital, already built. Needs only Node.js.
  TOOLS\\      Node.js installer goes here, plus the ISO and DVD scripts.
  DOCS\\       The guides, in Dari and English.
  SOURCE\\     The sources, for whoever maintains the hospital later.

HOW TO INSTALL  (10-15 minutes, no internet needed)

  1. If Node.js is not on the computer, run the installer in TOOLS\\ and click Next
     until it finishes. If TOOLS\\ has no installer, install Node.js LTS 20 or newer
     on a computer that does have internet, copy the .msi here, then run it.
  2. Copy the whole HOSPITAL folder to the hospital computer, for example to
     C:\\Aybek-Hospital
  3. Double-click START-HOSPITAL.bat inside that folder.
  4. The browser opens at http://localhost:3000
     Sign in with  doctor@aybek.hospital  /  mamonaminyar
  5. Change the password in Settings the same day, and write it down.

WHAT YOU GET

  ${demoStats.conditions} conditions (${demoStats.chapters} chapters), ${demoStats.prescriptions} medication examples already in the register,
  ${demoStats.formulary} formulary medicines, 1000 stock items, 21 screens, bilingual
  English and Dari, ten printed prescription papers, twelve themes.

YOUR DATA

  Every patient, prescription, bill and stock movement lives in ONE file:
      HOSPITAL\\data\\slotly.db
  Copy that file and you have a complete backup. See DOCS for the backup guide.

  The disc ships data\\demo-hospital.db, a demonstration hospital. The first
  start copies it to slotly.db. To begin with a completely empty hospital,
  delete slotly.db before starting and it will be created empty.

THIS DISC IS NOT A MEDICAL DEVICE

  The knowledge base and the safety checks are a working assistant, not a
  substitute for a doctor's judgement. Review every prescription yourself.
`;
fs.writeFileSync(path.join(out, "README-FIRST-FA.txt"), firstReadme.replace(/\n/g, "\r\n"), "utf8");

/* ------------------------------------------------------------ 2. root artefacts */
const discSrc = path.join(root, "aybek-hms", "disc");
// START-HERE.bat is generated below, because the disc now ships a prebuilt
// application instead of a source tree that needed `npm install`.
for (const name of ["AUTORUN.INF", "CHECKLIST-FA.txt", "RAHNAMA-FA.html"]) {
  const from = path.join(discSrc, name);
  if (fs.existsSync(from)) {
    let text = fs.readFileSync(from, "utf8");
    text = text.replace(/AYBEK_HMS_V4/g, `AYBEK_HMS_V${VERSION}`).replace(/v4/gi, `v${VERSION}`);
    fs.writeFileSync(path.join(out, name), text, "utf8");
  } else {
    warn(`${name} missing from aybek-hms/disc — the disc will not auto-start on Windows`);
  }
}
const startHere = `@echo off
rem ==========================================================================
rem  Aybek Ten-Bed Specialy Surgical Hospital - install from this disc
rem
rem  The disc carries the hospital already built, so there is no npm install,
rem  no internet and no build step: only Node.js has to be on the computer.
rem  Existing patient data is never overwritten.
rem ==========================================================================
setlocal EnableDelayedExpansion
title Aybek Ten-Bed Specialy Surgical Hospital - install from disc
cd /d "%~dp0"

set "TARGET=C:\\AybekHMS"
if exist "%ProgramFiles(x86)%" set "TARGET=C:\\AybekHMS"

echo ==========================================================================
echo   Aybek Ten-Bed Specialy Surgical Hospital   version ${VERSION}
echo   Installing from this disc
echo ==========================================================================
echo.
echo   Persian guide ....... RAHNAMA-FA.html   (open in a browser)
echo   English guide ....... DOCS\\DISC-INSTALL.md
echo.

rem ------------------------------------------------------------------ Node.js
where node >nul 2>nul
if errorlevel 1 goto nonode
for /f "delims=v." %%a in ('node -v') do set MAJOR=%%a
if not defined MAJOR goto nonode
if !MAJOR! LSS 20 goto oldnode
echo   [1/4] Node.js is present.
echo.

rem -------------------------------------------------------------------- target
if exist "%TARGET%\\server.js" (
  echo   An earlier installation is in %TARGET%
  choice /C YN /M "        Update the program and keep the patient records"
  if errorlevel 2 goto cancelled
  echo.
  echo   [2/4] Updating %TARGET% ...
) else (
  echo   [2/4] Installing into %TARGET% ...
)
robocopy "%~dp0HOSPITAL" "%TARGET%" /E /NFL /NDL /NJH /NJS /NP /XF slotly.db slotly.db-wal slotly.db-shm >nul
if errorlevel 8 goto copyfail
echo         Done, %TARGET% contains the hospital.
echo.

rem ---------------------------------------------------------------------- data
if exist "%TARGET%\\data\\slotly.db" (
  echo   [3/4] Patient records found - keeping them.
) else (
  if exist "%TARGET%\\data\\demo-hospital.db" (
    copy /y "%TARGET%\\data\\demo-hospital.db" "%TARGET%\\data\\slotly.db" >nul
    echo   [3/4] Installed the demonstration hospital ^(${demoStats.conditions} conditions, ${demoStats.prescriptions} prescriptions^).
  ) else (
    echo   [3/4] No database yet - the first start creates an empty hospital.
  )
)
echo.

rem ------------------------------------------------------------------ shortcut
echo   [4/4] Desktop shortcut
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop') + '\\Aybek Hospital.lnk');" ^
  "$s.TargetPath='%TARGET%\\START-HOSPITAL.bat'; $s.WorkingDirectory='%TARGET%';" ^
  "$s.IconLocation='%SystemRoot%\\System32\\shell32.dll,21'; $s.Save()" >nul 2>nul
if exist "%USERPROFILE%\\Desktop\\Aybek Hospital.lnk" (
  echo         Added "Aybek Hospital" to the desktop.
) else (
  echo         Could not add the shortcut - start the hospital from %TARGET%\\START-HOSPITAL.bat
)
echo.
echo ==========================================================================
echo   Installed.
echo.
echo   Start it from the desktop shortcut, or from %TARGET%\\START-HOSPITAL.bat
echo   then open  http://localhost:3000
echo   Sign in:  doctor@aybek.hospital  /  mamonaminyar
echo.
echo   Change that password in Settings on the first day.
echo   Your records live in ONE file: %TARGET%\\data\\slotly.db
echo ==========================================================================
echo.
choice /C YN /M "  Start the hospital now"
if errorlevel 2 goto done
cd /d "%TARGET%"
call "%TARGET%\\START-HOSPITAL.bat"
goto done

:nonode
echo.
echo   [X] Node.js was not found on this computer.
echo.
echo       Put the Node.js installer in TOOLS\\ (see TOOLS\\PUT-NODEJS-INSTALLER-HERE.txt),
echo       run it, click Next until it finishes, then double-click START-HERE.bat again.
echo       Persian explanation: RAHNAMA-FA.html - section 6
echo.
pause
exit /b 1

:oldnode
echo.
echo   [X] This computer has an old Node.js. Version 20 or newer is required.
echo       Remove the old one, install the new one from TOOLS\\, run this file again.
echo.
pause
exit /b 1

:copyfail
echo.
echo   [X] Could not copy the files to %TARGET%.
echo       Close any window using that folder, or right-click START-HERE.bat and
echo       choose "Run as administrator".
echo.
pause
exit /b 1

:cancelled
echo.
echo   Nothing was changed.
pause
exit /b 0

:done
echo.
pause
exit /b 0
`;
fs.writeFileSync(path.join(out, "START-HERE.bat"), startHere.replace(/\n/g, "\r\n"), "utf8");

// the guide is a real file in the repo, so it can be edited without touching code
fs.mkdirSync(path.join(out, "DOCS"), { recursive: true });
const discInstallSource = path.join(root, "aybek-hms", "docs", "DISC-INSTALL.md");
if (fs.existsSync(discInstallSource)) fs.copyFileSync(discInstallSource, path.join(out, "DOCS", "DISC-INSTALL.md"));

ok("root files (AUTORUN.INF, generated START-HERE.bat, Dari readme and checklist)");

/* ---------------------------------------------------------------- 3. TOOLS/ */
say("Copying the tools…");
const tools = path.join(out, "TOOLS");
copyDir(path.join(discSrc, "TOOLS"), tools);
// the scripts in TOOLS are the source of truth for Windows; bump their volume
// name and example paths to this version so the disc and the image agree
for (const name of fs.readdirSync(tools)) {
  if (!name.endsWith(".ps1")) continue;
  const file = path.join(tools, name);
  const text = fs
    .readFileSync(file, "utf8")
    .replace(/AYBEK_HMS_V4/g, `AYBEK_HMS_V${VERSION}`)
    .replace(/Aybek-Hospital-HMS-v4\.iso/g, `Aybek-Hospital-HMS-v${VERSION}.iso`);
  fs.writeFileSync(file, text, "utf8");
}
fs.writeFileSync(
  path.join(tools, "MAKE-ISO-ON-THIS-COMPUTER.txt"),
  `BUILDING THE .iso FROM THIS FOLDER

Windows (recommended, nothing to install):
    powershell -ExecutionPolicy Bypass -File TOOLS\\MAKE-ISO.ps1
  The image is written next to this disc folder as Aybek-Hospital-HMS-v${VERSION}.iso.
  To burn it straight away:
    powershell -ExecutionPolicy Bypass -File TOOLS\\MAKE-ISO.ps1 -Burn -Drive E:

Any computer with Node.js:
    npm run release:iso

CHECK BEFORE BURNING
  The disc must contain MANIFEST-SHA256. To check a copy of the disc later:
    Windows:  certutil -hashfile <file> SHA256
    Linux:    sha256sum -c MANIFEST-SHA256
`,
  "utf8"
);
ok(`TOOLS/ (${fs.readdirSync(tools).length} files)`);
if (!fs.readdirSync(tools).some((f) => /node.*\.(msi|exe|zip)$/i.test(f))) {
  warn("no Node.js installer in TOOLS/ — the disc still installs if Node is already present");
}

/* ---------------------------------------------------------------- 4. DOCS/ */
say("Copying the guides…");
const docs = path.join(out, "DOCS");
fs.mkdirSync(docs, { recursive: true });
for (const name of ["README.md", "SESSION-HANDOFF.md", "ONE-CLICK-START.bat"]) {
  const from = path.join(root, "aybek-hms", name);
  if (fs.existsSync(from)) fs.copyFileSync(from, path.join(docs, name));
}
const docsDir = path.join(root, "aybek-hms", "docs");
if (fs.existsSync(docsDir)) copyDir(docsDir, path.join(docs, "guides"));
if (fs.existsSync(path.join(root, "docs"))) copyDir(path.join(root, "docs"), path.join(docs, "technical"));
if (fs.existsSync(path.join(root, "README.md"))) fs.copyFileSync(path.join(root, "README.md"), path.join(docs, "PROJECT-README.md"));
ok(`DOCS/ (${fs.readdirSync(docs).length} entries)`);

/* -------------------------------------------------------------- 5. SOURCE/ */
if (withSource) {
  say("Packing the sources…");
  const sourceDir = path.join(out, "SOURCE");
  fs.mkdirSync(sourceDir, { recursive: true });
  const zipPath = path.join(sourceDir, `Aybek-Hospital-HMS-v${VERSION}-source.zip`);
  const listed = spawnSync("git", ["ls-files", "-z"], { cwd: root, encoding: "buffer", maxBuffer: 64 * 1024 * 1024 });
  const files = (listed.stdout ?? Buffer.alloc(0))
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    // release archives of the bundled ASH application are 48 MB of binaries and
    // have nothing to do with this disc
    .filter((f) => !f.startsWith("releases/") && !f.startsWith("node_modules/") && !/\.(iso|db)$/i.test(f));

  // `zip -@` takes the list on stdin; Windows ships bsdtar, which takes -T
  const zipped = spawnSync(
    "zip",
    ["-q", "-X", "-9", zipPath.startsWith("/") ? zipPath : path.basename(zipPath), "-@"],
    { cwd: root, input: files.join("\n"), encoding: "utf8" }
  );
  if (zipped.status !== 0 || !fs.existsSync(zipPath)) {
    const listFile = path.join(out, ".source-list.txt");
    fs.writeFileSync(listFile, files.join("\n"));
    const tarred = spawnSync("tar", ["-a", "-c", "-f", zipPath, "-T", listFile], { cwd: root, encoding: "utf8" });
    fs.rmSync(listFile, { force: true });
    if (tarred.status !== 0 || !fs.existsSync(zipPath)) {
      warn("could not pack the sources (no zip or tar) — the disc is still usable");
      fs.rmSync(sourceDir, { recursive: true, force: true });
    }
  }
  if (fs.existsSync(zipPath)) ok(`SOURCE/ ${path.basename(zipPath)} (${files.length} files, ${mb(fs.statSync(zipPath).size)})`);
}

/* ------------------------------------------------------------ 6. MANIFEST */
say("Writing the manifests…");

// one record per file, sha256sum-compatible, sorted so two builds compare cleanly
const allFiles = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else allFiles.push(full);
  }
})(out);

const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const manifestLines = [];
let totalBytes = 0;
for (const file of allFiles) {
  const size = fs.statSync(file).size;
  totalBytes += size;
  manifestLines.push(`${hash(file)}  ${rel(file)}`);
}
fs.writeFileSync(path.join(out, "MANIFEST-SHA256"), `${manifestLines.join("\n")}\n`, "utf8");

const byFolder = {};
for (const file of allFiles) {
  const top = rel(file).split("/")[0];
  const key = top.includes("/") ? "(root)" : top;
  byFolder[key] = byFolder[key] ?? { files: 0, bytes: 0 };
  byFolder[key].files += 1;
  byFolder[key].bytes += fs.statSync(file).size;
}

const buildTime = new Date().toISOString().replace("T", " ").slice(0, 19);
const manifestTxt = `AYBEK TEN-BED SPECIALY SURGICAL HOSPITAL
Delivery disc v${VERSION} — built ${buildTime} UTC

CONTENTS                          FILES        SIZE
${Object.entries(byFolder)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `  ${k.padEnd(28)}${String(v.files).padStart(6)}${mb(v.bytes).padStart(13)}`)
  .join("\n")}
  ${"TOTAL".padEnd(28)}${String(allFiles.length).padStart(6)}${mb(totalBytes).padStart(13)}

CLINICAL CATALOGUE IN THE SHIPPED DATABASE (data/demo-hospital.db)
  conditions in catalogue   ${demoStats.conditions}
  chapters                  ${demoStats.chapters}
  conditions with example   ${demoStats.prescriptionConditions}
  medication examples       ${demoStats.prescriptions}
  formulary reference       ${demoStats.formulary}
  patients in demo hospital ${demoStats.patients}
  pharmacy stock medicines  ${demoStats.medicines}

VERIFY A COPY OF THIS DISC
  Linux / macOS     sha256sum -c MANIFEST-SHA256
  Windows           powershell -Command "Get-FileHash -Algorithm SHA256 <file>"

This disc is not a medical device. The knowledge base and the safety checks are
an assistant to a doctor, not a replacement for one.
`;
fs.writeFileSync(path.join(out, "MANIFEST.txt"), manifestTxt.replace(/\n/g, "\r\n"), "utf8");

/* ------------------------------------------------------------- 7. summary */
const finalSize = dirSize(out);
console.log("");
ok(`${allFiles.length} files, ${mb(finalSize)} → ${out}`);
say(`ISO next:  npm run release:iso     (or TOOLS/MAKE-ISO.ps1 on Windows)`);
if (finalSize > 4_000_000_000) warn("larger than a single-layer DVD (4.7 GB) — use a dual layer disc");
else if (finalSize > 700_000_000) say("this disc needs a DVD (it is larger than a 700 MB CD)");
console.log("");

function dirSize(dir) {
  let bytes = 0;
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else bytes += fs.statSync(full).size;
    }
  };
  walk(dir);
  return bytes;
}
