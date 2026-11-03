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

## Clinical catalogue and demonstration database

The current source includes **717 English/Dari condition entries across fourteen chapters**.
The generated teaching export has 3 815 synthetic examples. The `PED` chapter contributes 120
child-only examples (ages 2–17); the `OBG` chapter adds 113 female-only, age-bounded examples,
including adolescent cases. Both chapters have no prefilled medicines. Neonatal and under-two age
groups are outside the demo regimen engine. The previously built ISO predates both new chapters
and must be regenerated from the current source before distributing this update.

`data\demo-hospital.db` is a complete demonstration hospital, not an empty shell:

- 3 086 medication examples from 515 conditions in the register (1 026 child, 1 030 adult and 1 030 older-adult), with 12 408 medicine lines
- 729 no-medication examples are not inserted as empty prescriptions
- 225 formulary references, 1 000 stock items
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
doctor, they do not replace one. ENT, ophthalmic, paediatric and obstetric/gynaecology
chapters have not received external clinical approval; see `CLINICAL-REVIEW-STATUS-FA.md` for
current status and `CLINICAL-REVIEW-TEMPLATE-FA.md` to record a real specialist review.
