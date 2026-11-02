# Installing from the disc

The disc carries the hospital **already built**. There is no `npm install`, no
build step and no internet connection involved: only Node.js has to be present.

1. If Node.js 20 or newer is not installed, run the installer kept in `TOOLS\`
   (see `TOOLS\PUT-NODEJS-INSTALLER-HERE.txt`).
2. Double-click **START-HERE.bat** in the root of the disc.
3. It copies the hospital to `C:\AybekHMS`, keeps any patient records that are
   already there, installs the demonstration hospital on a first install, and
   puts an **Aybek Hospital** shortcut on the desktop.
4. Start it from that shortcut, then open <http://localhost:3000> and sign in as
   `doctor@aybek.hospital` / `mamonaminyar`. Change the password the same day.

## Where things are

| Path | What it is |
|---|---|
| `C:\AybekHMS\server.js` | the application — started with `node server.js` |
| `C:\AybekHMS\data\slotly.db` | **all** patients, prescriptions, stock and audit rows |
| `C:\AybekHMS\START-HOSPITAL.bat` | the everyday start file |
| `HOSPITAL\` on the disc | the same folder, before installation |

## What is inside the shipped database

`data\demo-hospital.db` is a complete demonstration hospital, not an empty shell:

- 537 unique conditions across eleven chapters, in English and Dari
- 3 012 medication examples already in the register (1 004 per age band), with 12 324 medicine lines; the 210 conditions without routine medicines are not inserted as empty prescriptions
- 223 formulary references, 1 000 stock items
- patients, staff, billing history and an audit trail to look at

To start with a **completely empty** hospital instead, delete
`C:\AybekHMS\data\slotly.db` before the first start; the app recreates it empty.

## Backups

Copy `C:\AybekHMS\data\slotly.db` — that single file is the whole hospital.
Do it on a schedule you can keep (end of clinic is enough for ten beds).

## Updating later

Insert a newer disc and run `START-HERE.bat` again. It asks before touching
anything, replaces the program files, and leaves `data\slotly.db` alone.

## If something goes wrong

- **"Node.js was not found"** — install it from `TOOLS\`, then run the file again.
- **The browser shows nothing** — the start window must stay open; it is the server.
- **Port 3000 is used by another program** — edit `START-HOSPITAL.bat` and change
  `set PORT=3000` to `set PORT=3001`, then open <http://localhost:3001>.

This disc is not a medical device: the knowledge base and the safety checks help a
doctor, they do not replace one.
