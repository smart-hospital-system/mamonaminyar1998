# Installing on a computer with no internet

The offline version is **not** a reduced version. Same screens, same ten
prescription designs, same assistant, same monitor. The only difference is that
the packages and the Node.js installer are already on your USB stick.

---

## A. On the computer that HAS internet (once)

```powershell
cd E:\Mamonaminyar-HMS-Print-Design-v4
.\aybek-hms\scripts\install\02-install.ps1        # if not already installed
.\aybek-hms\scripts\install\05-build.ps1 -OfflineTarget "F:\AybekOffline"
```

`F:\` is your USB stick. The script copies:

* the application (source, build, database, guides),
* the npm package cache (`npm-cache\`) — every package the installer needs,
* the Node.js installer, if `node-v*-x64.msi` is in your Downloads folder.

If it warns that no `.msi` was found, download
<https://nodejs.org/dist/latest-v22.x/> → `node-v22.x.x-x64.msi` and copy it into
`F:\AybekOffline\`. That is the only file the offline machine cannot produce by
itself.

Safely eject the USB stick.

---

## B. On the computer WITHOUT internet

### 1. Install Node.js from the stick

Double-click `node-v22.x.x-x64.msi` on the USB stick. Default options. Restart
PowerShell afterwards.

### 2. Copy the folder to the local disk

Copy `F:\AybekOffline\` to `E:\Mamonaminyar-HMS-Print-Design-v4\` — the local
disk, **not** the USB stick (the database must live on a fixed disk).

### 3. Install from the local cache

```powershell
cd E:\Mamonaminyar-HMS-Print-Design-v4
Set-ExecutionPolicy -Scope Process Bypass
.\aybek-hms\scripts\install\01-setup.ps1
.\aybek-hms\scripts\install\02-install.ps1 -OfflineFrom "E:\Mamonaminyar-HMS-Print-Design-v4\npm-cache"
```

The second command sets `npm_config_offline=true`, so npm never tries to reach
the network. Expect 2–4 minutes of disk activity.

If the cache is missing or incomplete you will see:

```
npm error code ENOTCACHED
```

…which means the cache folder was not copied completely. Re-run step A on the
connected computer, or copy the **complete** `node_modules` folder from the
connected computer instead and skip this step entirely (`node_modules` copies
are portable between Windows machines with the same Node major version).

### 4. Use the database that is already there

The offline package contains `data\slotly.db` — the full demonstration hospital.
Do **not** run `03-seed.ps1` unless you want to start the demo from scratch:

```powershell
.\aybek-hms\scripts\install\04-start.ps1
```

If you prefer a clean demonstration database on the new machine:

```powershell
.\aybek-hms\scripts\install\03-seed.ps1 -Force
```

### 5. Activate

```powershell
.\aybek-hms\scripts\install\09-activate.ps1
```

Paste the serial. Activation is verified locally (SHA-256 checksum), so it works
without internet. If you have no serial yet, the trial runs for 14 days from the
first sign-in.

---

## C. What needs the internet, and what does not

| Feature | Internet needed? |
|---------|------------------|
| Every screen, every department | No |
| Prescriptions, printing, PDF export | No |
| Assistant (interactions, triage, notes, forecasts) | No — runs on this computer |
| Health monitor and 48-hour repairs | No |
| Serial activation | No — checksum verified offline |
| Backups, restore, exports | No |
| Installing packages (`02-install.ps1`) | Yes, unless `-OfflineFrom` is used |
| Fonts and images | No — system fonts only, no CDN |

Nothing in the interface loads a remote font, script or image. That was a
deliberate design decision so that a power cut or an internet cut never leaves
half a page on screen.

---

## D. Keeping the offline copy up to date

When you change something on the connected computer:

1. `05-build.ps1 -OfflineTarget "F:\AybekOffline"` again (overwrites).
2. On the offline machine, copy **only** `app\`, `lib\`, `components\`,
   `public\` and `aybek-hms\` from the stick — never `data\` (that would erase
   the patients entered on that machine).
3. Run `05-build.ps1` on the offline machine, then `04-start.ps1 -Mode prod`.
