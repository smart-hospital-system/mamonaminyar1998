# Troubleshooting

Run this first whenever something is wrong:

```powershell
.\aybek-hms\scripts\install\10-doctor.ps1
```

It prints fourteen lines and the fix for each. Then look below for the exact
message you saw.

---

## Installation

### “cannot be loaded because running scripts is disabled on this system”
```powershell
Set-ExecutionPolicy -Scope Process Bypass
```
Type it in the same PowerShell window, then run the script again. This changes
nothing permanently.

### “node is not recognized as an internal or external command”
Node.js is not installed, or PowerShell was open before it was installed. Close
every PowerShell window, open a new one, run `node --version`. Still missing?
Reinstall Node.js 22 LTS with the default options.

### “npm error code ENOTCACHED” during the offline install
The `npm-cache` folder was not copied completely. Either copy it again from the
connected computer, or copy that computer's `node_modules` folder into the
project (same Windows architecture, same Node major version).

### “npm error code EBUSY” / “EPERM”
The server is still running and holding files. Press Ctrl+C in the server
window, then run the installer again.

### “Cannot find the project folder”
You ran a script from inside `aybek-hms\` without the project above it, or moved
the folder. Either run it from the project root, or pass the path:

```powershell
.\aybek-hms\scripts\install\02-install.ps1 -Path "D:\Aybek"
```

---

## Starting the hospital

### “Port 3000 is already in use”
Another copy (or a zombie process) is using the port. Options:

1. Open <http://localhost:3000> — maybe it is already running.
2. Close the old window.
3. Start on another port: `.\04-start.ps1 -Port 3001`.

Find out what owns the port:

```powershell
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
Get-Process -Id <that number>
```

### The page loads forever the first time (development mode)
Normal: Next.js compiles the first visit to each page (10–30 seconds). After
that it is instant. For a permanently fast hospital run
`05-build.ps1` once, then start with `04-start.ps1 -Mode prod`.

### The browser opens but shows “This site can't be reached”
The server window has an error. Read the last 20 lines of that window — usually
a missing database (`03-seed.ps1`) or missing packages (`02-install.ps1`).

### The ward tablet cannot reach the hospital
1. Both devices must be on the same network (same Wi-Fi).
2. Use the address printed by `04-start.ps1`, e.g. `http://192.168.1.20:3000/hms/login`.
3. Allow Node.js on **Private networks** when Windows Firewall asks.
4. If the router isolates clients (guest Wi-Fi), connect the tablet to the
   normal network.

---

## Signing in

### “Email or password is not correct”
Demo accounts all use `mamonaminyar`. Check for a capital letter or a trailing
space. Locked out completely? Reset the demo database with
`03-seed.ps1 -Force` (this erases data — back up first).

### Signed in, but the sidebar is almost empty
That is the role. Reception cannot see the theatre. Sign in as
`doctor@aybek.hospital` to see everything.

### Redirected to `/hms/login` in a loop
Cookies are blocked for `localhost`. Allow cookies for this site, or use
`http://127.0.0.1:3000` instead.

---

## Printing

### The prescription prints with a grey background or is cut off
In the browser print dialog:

* Paper **A4**, orientation **portrait**
* Margins **None**
* Scale **100 %** (not “Fit to page”)
* **Background graphics** ON (Chrome: *More settings → Background graphics*)

### The signature name is missing
The prescription was saved as a draft. Sign it (Prescriptions → Sign) and print
again; the signature block uses the signed physician's name.

### I want a different design for one document
Open the print sheet and choose from the dropdown at the top. The choice is
stored with that prescription only; the hospital default stays as set in
Settings → Look & print.

---

## Data

### “Patient not found” after a server restart
The record was created while the previous server process was being killed by
Windows. Re-create it — everything created before the crash is intact, and the
doctor script would have flagged a broken database.

### The database file keeps growing
That is normal: SQLite keeps deleted rows in free pages until a vacuum. Once a
year, stop the server and run:

```powershell
node -e "const {DatabaseSync}=require('node:sqlite');new DatabaseSync('data/slotly.db').exec('VACUUM')"
```

### I need to move to a new computer
1. `07-backup.ps1` on the old machine.
2. Copy the project folder **and** the newest `backups\` folder to the new machine.
3. Install (steps 1–4), then `08-restore.ps1 -Backup "<that folder>"`.

### A patient was registered twice
Merge mentally and keep the older MRN. Add a note to the newer record: “Duplicate
of MRN-1004 — do not use.” The monitor flags duplicates rather than deleting
them, because deletion is never allowed.

---

## Monitor and licence

### The alarm chime does not play
Browsers block audio until the user has clicked something. Click anywhere in the
workspace, then press the bell to test.

### Alarms keep re-appearing
They are real: an unsigned prescription, an expired batch or an overdue study is
still there. Open the alarm, read the detail, fix the cause in the department,
then press Resolve with a note.

### “Trial expired — activation required”
The hospital keeps working in read-only mode; nothing is deleted. Activate with
`09-activate.ps1` and your serial (see `LICENSING.md`).

### “Checksum mismatch — this serial was not issued by Aybek”
One character is wrong, or the serial belongs to a different product. Copy it
again from the certificate, without spaces.

---

## Performance

| Symptom | Cause | Fix |
|---------|-------|-----|
| 2–5 s per page | development mode | `05-build.ps1`, then `04-start.ps1 -Mode prod` |
| Slow first visit only | Next.js compiling | normal in dev mode |
| The whole computer is slow | 4 GB RAM or fewer | close other browsers; keep only one tab of the hospital |
| Lists take seconds | 50 000+ records | archive old years: `07-backup.ps1` then prune from Billing with a date filter |

---

## When all else fails

1. `10-doctor.ps1` and take a screenshot of the output.
2. `07-backup.ps1` — protect the data before doing anything else.
3. Keep the server window text: the real error is printed there.
4. Only then reinstall: `02-install.ps1 -Force`, then `03-seed.ps1` **only** if
   you accept losing the entered data.
