# Installing Aybek HMS on a Windows computer

This is the complete first-time installation. Allow **20 minutes**, most of it
waiting for the packages to download.

You need: a Windows 10 or 11 computer (8 GB RAM recommended), an administrator
account on that computer, and the Aybek folder copied to `E:\Mamonaminyar-HMS-Print-Design-v4`
(or any path — the scripts accept `-Path`).

---

## Step 0 — What "the folder" means

The hospital is one folder that contains:

```
E:\Mamonaminyar-HMS-Print-Design-v4\
├─ package.json          ← the application manifest
├─ app\                  ← every screen
├─ lib\                  ← database, safety rules, licence, templates
├─ components\           ← reusable interface pieces
├─ data\                 ← the database (created by step 3)
├─ public\               ← logo, reference designs
└─ aybek-hms\            ← this guide and the ten scripts
```

Copy **the whole folder**. Copying only `aybek-hms\` gives you the instructions
without the hospital.

> Never run the hospital from a USB stick or from `C:\Program Files` (Windows
> protects those folders and the database cannot be written). `E:\` or `D:\` is
> ideal, and `C:\Users\you\Aybek` also works.

---

## Step 1 — Install Node.js (once per computer)

1. Open <https://nodejs.org> and download **Node.js 22 LTS — Windows Installer (.msi) 64-bit**.
2. Run it, keep the default options, tick *“Automatically install the necessary tools”* if offered.
3. If Windows asks to restart, restart.
4. Close every PowerShell window you had open (they cache the old PATH).

Check it worked: open PowerShell and type `node --version`. You should see
something like `v22.20.0`.

---

## Step 2 — Open PowerShell in the project folder

1. Open the folder in File Explorer.
2. Click the address bar, type `powershell`, press **Enter**.
3. Allow scripts for this window only:

   ```powershell
   Set-ExecutionPolicy -Scope Process Bypass
   ```

   (This affects only this window; nothing is changed permanently.)

---

## Step 3 — Run the four installation scripts

```powershell
.\aybek-hms\scripts\install\01-setup.ps1
.\aybek-hms\scripts\install\02-install.ps1
.\aybek-hms\scripts\install\03-seed.ps1
.\aybek-hms\scripts\install\04-start.ps1
```

What each one prints, and what to expect:

* **01-setup** — `Node.js v22.x detected`, `Port 3000 is free`,
  `All 15 core files are present`.
* **02-install** — a few hundred lines of npm output, then
  `All core packages installed`. It takes 2–6 minutes on a good connection.
* **03-seed** — `Seeding the demonstration hospital`, then a table of tables
  with record counts, then the list of nine staff logins.
* **04-start** — `Starting the production server on port 3000` (or the
  development server), then the browser opens.

Keep the PowerShell window open. **That window is the hospital.** Closing it
stops the system for everybody.

---

## Step 4 — Sign in

Browser: <http://localhost:3000/hms/login>

```
Email     doctor@aybek.hospital
Password  mamonaminyar
```

You land on the command centre. The badge in the header says `Trial · 14d` —
that is normal until you activate a serial (see `LICENSING.md`).

---

## Step 5 — Make it yours (10 minutes, once)

1. **Settings → Hospital identity** — legal name, local name, licence number,
   phone, address, footer text. Press *Save*; every prescription, letter and
   receipt changes immediately.
2. **Settings → Look & print** — choose the interface theme and the default
   prescription paper. Try *Royal Heritage* and *Midnight Ward*.
3. **Settings → Monitor & alarms** — keep 30 minutes and 48 hours unless you
   have a reason to change them.
4. **Settings → Departments** — turn off anything you do not run.
5. **Licence → activate** — paste your serial (see `LICENSING.md`).
6. Register one real patient and print one prescription end to end before the
   first real clinic day.

---

## Step 6 — Optional: faster start and a desktop icon

```powershell
.\aybek-hms\scripts\install\05-build.ps1     # production build, 2-4 minutes
.\aybek-hms\scripts\install\06-shortcut.ps1  # desktop icon
```

After the build, `04-start.ps1` uses the production server automatically: pages
open in about 300 ms instead of 2 s.

To have the hospital start with Windows:

```powershell
.\aybek-hms\scripts\install\06-shortcut.ps1 -AutoStart
```

---

## Step 7 — Let the ward use it from a tablet

The server listens on all interfaces. On the tablet, open:

```
http://<this-computer-ip>:3000/hms/login
```

`04-start.ps1` prints that address for you. If the page does not open, allow
Node.js through the firewall (Windows asks the first time, choose **Private
networks**).

---

## Step 8 — Backups (do this every evening)

```powershell
.\aybek-hms\scripts\install\07-backup.ps1
```

It writes `backups\2026-10-30_1900\` with the database, the WAL files, the
settings export and the uploads folder, then prunes anything older than the last
14 copies. Copy that folder to a second disk or a USB stick weekly — a backup on
the same disk does not survive a disk failure.

---

## Installing on a second computer

Three options, in order of preference:

1. **Offline package (recommended)** — on the first computer run
   `05-build.ps1 -OfflineTarget "F:\AybekOffline"`, then follow
   `INSTALL-OFFLINE.md` on the second machine. Nothing needs the internet.
2. **Internet install** — copy the folder, then run steps 1–4 above.
3. **Same network, one server** — do not install twice. Point the second
   computer's browser at the first computer's address (step 7). This is the only
   way both computers share the same patients.

> Two independent installations have two independent databases. If you need
> both, they must be reconciled by hand — which is why option 3 is recommended
> for a small hospital.

---

## Uninstalling

1. Stop the server (Ctrl+C).
2. Copy `backups\` somewhere safe if you might return.
3. Delete the folder. Nothing was written to the Windows registry except the
   optional scheduled task, which you remove with
   `06-shortcut.ps1 -AutoStart -Remove`.
