#!/usr/bin/env node
/**
 * Write an .iso image from a disc folder, with no external tools.
 *
 *   node scripts/make-iso.mjs                          # dist/Aybek-DISC-v7 → dist/Aybek-Hospital-HMS-v7.iso
 *   node scripts/make-iso.mjs --from D:\DISC --iso E:\Aybek.iso
 *   node scripts/make-iso.mjs --label AYBEK_HMS_V7
 *
 * Why this file exists: the Windows scripts in aybek-hms/disc/TOOLS use IMAPI2,
 * which only exists on Windows, and the usual mkisofs/genisoimage/xorriso are not
 * installed on most machines. This writer needs nothing but Node.js — the same
 * runtime the hospital already uses — so the image can always be rebuilt.
 *
 * What it writes
 *   ISO 9660 (level 2, ASCII names) + Joliet (UCS-2, long names) + a real
 *   volume descriptor set. Windows uses the Joliet tree, so files keep their
 *   names: `PUT-NODEJS-INSTALLER-HERE.txt` and `node_modules/@next/...` survive.
 *   Not bootable, by design: it is a data disc, the hospital is started from a
 *   shortcut after copying the folder off the disc.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const SECTOR = 2048;
const argv = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};

const root = process.cwd();
const from = path.resolve(root, argOf("--from", path.join("dist", "Aybek-DISC-v7")));
const isoPath = path.resolve(root, argOf("--iso", path.join("dist", "Aybek-Hospital-HMS-v7.iso")));
const volumeId = argOf("--label", "AYBEK_HMS_V7").toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 32);

const say = (m) => console.log(`  ${m}`);
const ok = (m) => console.log(`  [ok]   ${m}`);
const die = (m) => {
  console.error(`  [x]    ${m}`);
  process.exit(1);
};

if (!fs.existsSync(from)) die(`Disc folder not found: ${from}\n         Build it first: npm run release:disc`);
if (fs.existsSync(isoPath) && fs.statSync(isoPath).isDirectory()) die("--iso points at a directory");

/* ------------------------------------------------------------------ the tree */
const now = new Date();
const isoDate = (d) => {
  const p = (n, w = 2) => String(n).padStart(w, "0");
  // 7-byte binary date used inside directory records
  return Buffer.from([d.getUTCFullYear() - 1900, d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), 0]);
};
const asciiDate = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return Buffer.from(
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}00`,
    "ascii"
  );
};

/** Directory entry: { name, kind: 'dir'|'file', children?, size?, src? } */
function readTree(dir) {
  const entries = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isSymbolicLink()) continue; // links never travel on a disc
    if (e.isDirectory()) entries.push({ name: e.name, kind: "dir", children: readTree(full) });
    else if (e.isFile()) {
      const size = fs.statSync(full).size;
      if (size > 0xffffffff) die(`${full} is larger than 4 GB, which this writer does not split`);
      entries.push({ name: e.name, kind: "file", size, src: full });
    }
  }
  return entries;
}

const tree = readTree(from);
const walk = (nodes, fn) => {
  for (const n of nodes) {
    fn(n);
    if (n.kind === "dir") walk(n.children, fn);
  }
};
const totals = { files: 0, bytes: 0, dirs: 0 };
walk(tree, (n) => {
  if (n.kind === "file") {
    totals.files += 1;
    totals.bytes += n.size;
  } else totals.dirs += 1;
});

/* ------------------------------------------------------------- name handling */
// ISO 9660 level 2 allows 30 characters from the d-character set; anything else
// is folded to '_'. Joliet keeps the real name in UCS-2, so nothing is lost on a
// Windows disc — the ASCII tree is only a fallback for very old readers.
const dChars = (s) =>
  s
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "") || "FILE";

function isoName(name, kind, taken) {
  const isDir = kind === "dir";
  let base = dChars(name);
  const ext = !isDir && /\.[A-Za-z0-9]{1,4}$/.test(name) ? name.slice(name.lastIndexOf(".") + 1).toUpperCase() : "";
  base = dChars(isDir ? name : name.slice(0, ext ? name.lastIndexOf(".") : undefined));
  const suffix = isDir ? "" : ext ? `.${dChars(ext).slice(0, 4)}` : "";
  const limit = 30 - suffix.length;
  let candidate = base.slice(0, limit) + suffix;
  let n = 1;
  while (taken.has(candidate.toUpperCase())) {
    const tag = `_${n++}`;
    candidate = base.slice(0, Math.max(1, limit - tag.length)) + tag + suffix;
  }
  taken.add(candidate.toUpperCase());
  return isDir ? candidate : `${candidate};1`;
}

/** Joliet identifier: UCS-2BE, no version suffix (the Joliet spec omits it). */
function jolietName(name, taken) {
  let cut = [...name].slice(0, 64);
  let candidate = cut.join("");
  let n = 1;
  while (taken.has(candidate.toLowerCase())) {
    const tag = `~${n++}`;
    candidate = [...name].slice(0, 64 - tag.length).join("") + tag;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}
const ucs2 = (s) => {
  const out = Buffer.alloc(s.length * 2);
  for (let i = 0; i < s.length; i++) out.writeUInt16BE(s.charCodeAt(i), i * 2);
  return out;
};

/** Assign both names to every node, per directory, so uniqueness is per folder. */
function assignNames(nodes, joliet) {
  for (const dir of nodes.filter((n) => n.kind === "dir")) {
    const taken = new Set();
    dir.isoRootName = joliet ? null : dir.name;
    for (const child of dir.children) {
      if (joliet) child.alias = jolietName(child.name, taken);
      else child.alias = isoName(child.name, child.kind, taken);
    }
    assignNames(dir.children, joliet);
  }
}
const rootNode = { name: "", kind: "dir", children: tree };
assignNames([rootNode], false);
assignNames([rootNode], true);

/* ------------------------------------------------------------------- layout */
/*
  Sector 0-15   system area (empty, as the standard requires)
  16            primary volume descriptor      — ASCII tree
  17            supplementary descriptor        — Joliet tree
  18            volume descriptor set terminator
  19..          path tables: ISO L, ISO M, Joliet L, Joliet M
                directory extents: ISO tree, then Joliet tree
                file data: each file once, shared by both trees

  Sizes never depend on addresses (a record is 33 + name length, rounded up to an
  even number; the extent field is always 8 bytes), so the extents can be handed
  out in one pass without any iteration.
*/
const bothEndian16 = (v) => {
  const b = Buffer.alloc(4);
  b.writeUInt16LE(v, 0);
  b.writeUInt16BE(v, 2);
  return b;
};
const bothEndian32 = (v) => {
  const b = Buffer.alloc(8);
  b.writeUInt32LE(v, 0);
  b.writeUInt32BE(v, 4);
  return b;
};

rootNode.alias = "";
const spaces = ["iso", "joliet"];

// breadth-first, so every parent's path-table number is smaller than its children's
const orders = {};
for (const space of spaces) {
  const order = [];
  const queue = [rootNode];
  while (queue.length) {
    const dir = queue.shift();
    order.push(dir);
    for (const child of dir.children) if (child.kind === "dir") queue.push(child);
  }
  orders[space] = order;
  order.forEach((dir, i) => {
    dir[`num_${space}`] = i + 1;
    dir[`parent_${space}`] = null;
  });
  for (const dir of order) for (const child of dir.children) if (child.kind === "dir") child[`parent_${space}`] = dir;
}

const nameBytesFor = (node, space) => {
  if (node === rootNode) return Buffer.from([0x00]);
  return space === "joliet" ? ucs2(node.alias) : Buffer.from(node.alias, "ascii");
};
const pathTableRecordLength = (node, space) => {
  // 8 bytes of header plus the identifier; the identifier is padded with one zero
  // byte when its length is odd, so that the record itself stays even
  const n = nameBytesFor(node, space).length;
  return 8 + n + (n % 2 === 1 ? 1 : 0);
};
const pathTableLength = (space) => orders[space].reduce((sum, dir) => sum + pathTableRecordLength(dir, space), 0);

// one directory record: 33 + identifier, padded to an even length
const recordLength = (node, space) => {
  const n = space === "joliet" ? ucs2(node.alias).length : Buffer.byteLength(node.alias, "ascii");
  const base = 33 + n;
  return base % 2 === 0 ? base : base + 1;
};
const dirSectorCount = (dir, space) => {
  const children = dir.children.reduce((sum, child) => sum + recordLength(child, space), 0);
  return Math.max(1, Math.ceil((34 + 34 + children) / SECTOR));
};

let cursor = 19;
const tables = {};
for (const space of spaces) {
  for (const kind of ["L", "M"]) {
    const sectors = Math.max(1, Math.ceil(pathTableLength(space) / SECTOR));
    tables[`${space}${kind}`] = { sector: cursor };
    cursor += sectors;
  }
  for (const dir of orders[space]) {
    dir[`extent_${space}`] = cursor;
    dir[`sectors_${space}`] = dirSectorCount(dir, space);
    cursor += dir[`sectors_${space}`];
  }
}

// files are placed after every directory, one extent each, shared by both trees
walk(tree, (n) => {
  if (n.kind === "file") {
    n.extent = cursor;
    cursor += Math.max(1, Math.ceil(n.size / SECTOR));
  }
});
const totalSectors = cursor;
if (totalSectors > 0xffffffff) die("image is larger than the ISO 9660 limit for this writer");

/* --------------------------------------------------------- record writers */
function dirRecord(node, space, extent, size) {
  const name = nameBytesFor({ ...node, alias: node === rootNode ? "" : node.alias }, space);
  const nameLen = node === rootNode ? 1 : name.length;
  const len = recordLength(node, space);
  const rec = Buffer.alloc(len);
  rec.writeUInt8(len, 0);
  rec.writeUInt8(0, 1);
  bothEndian32(extent).copy(rec, 2);
  bothEndian32(size).copy(rec, 10);
  isoDate(now).copy(rec, 18);
  rec.writeUInt8(node.kind === "dir" ? 0x02 : 0x00, 25);
  rec.writeUInt8(0, 26);
  rec.writeUInt8(0, 27);
  bothEndian16(1).copy(rec, 28);
  rec.writeUInt8(nameLen, 32);
  name.copy(rec, 33);
  return rec;
}

function dotRecord(extent, size, which) {
  const rec = Buffer.alloc(34);
  rec.writeUInt8(34, 0);
  rec.writeUInt8(0, 1);
  bothEndian32(extent).copy(rec, 2);
  bothEndian32(size).copy(rec, 10);
  isoDate(now).copy(rec, 18);
  rec.writeUInt8(0x02, 25);
  rec.writeUInt8(0, 26);
  rec.writeUInt8(0, 27);
  bothEndian16(1).copy(rec, 28);
  rec.writeUInt8(1, 32);
  rec.writeUInt8(which, 33);
  return rec;
}

function dirBytes(dir, space) {
  const children = [...dir.children].sort((a, b) => {
    const A = space === "joliet" ? a.alias : a.alias.replace(";1", "");
    const B = space === "joliet" ? b.alias : b.alias.replace(";1", "");
    return A < B ? -1 : A > B ? 1 : 0;
  });
  const parent = dir[`parent_${space}`] ?? dir;
  const parts = [
    dotRecord(dir[`extent_${space}`], dir[`sectors_${space}`] * SECTOR, 0x00),
    dotRecord(parent[`extent_${space}`], parent[`sectors_${space}`] * SECTOR, 0x01),
  ];
  for (const child of children) {
    parts.push(
      dirRecord(
        child,
        space,
        child.kind === "dir" ? child[`extent_${space}`] : child.extent,
        child.kind === "dir" ? child[`sectors_${space}`] * SECTOR : child.size
      )
    );
  }
  // no record may cross a sector boundary: start a new sector when it would not fit
  const chunks = [];
  let sector = Buffer.alloc(0);
  for (const part of parts) {
    if (sector.length + part.length > SECTOR) {
      chunks.push(Buffer.concat([sector, Buffer.alloc(SECTOR - sector.length)]));
      sector = Buffer.alloc(0);
    }
    sector = Buffer.concat([sector, part]);
  }
  chunks.push(Buffer.concat([sector, Buffer.alloc(SECTOR - sector.length)]));
  return Buffer.concat(chunks);
}

function pathTable(space, bigEndian) {
  const parts = [];
  for (const dir of orders[space]) {
    const name = nameBytesFor(dir, space);
    const len = pathTableRecordLength(dir, space);
    const rec = Buffer.alloc(len);
    rec.writeUInt8(name.length, 0);
    rec.writeUInt8(0, 1);
    const extent = dir[`extent_${space}`];
    if (bigEndian) rec.writeUInt32BE(extent, 2);
    else rec.writeUInt32LE(extent, 2);
    const parent = dir[`parent_${space}`] ?? dir;
    const parentNum = parent[`num_${space}`];
    if (bigEndian) rec.writeUInt16BE(parentNum, 6);
    else rec.writeUInt16LE(parentNum, 6);
    name.copy(rec, 8);
    parts.push(rec);
  }
  return Buffer.concat(parts);
}

/* ----------------------------------------------------------- build the image */
const image = Buffer.alloc(totalSectors * SECTOR);
const put = (sector, buf) => buf.copy(image, sector * SECTOR);

for (const space of spaces) {
  put(tables[`${space}L`].sector, pathTable(space, false));
  put(tables[`${space}M`].sector, pathTable(space, true));
  for (const dir of orders[space]) put(dir[`extent_${space}`], dirBytes(dir, space));
}
walk(tree, (n) => {
  if (n.kind === "file" && n.size > 0) fs.readFileSync(n.src).copy(image, n.extent * SECTOR);
});

/* --------------------------------------------------------- volume descriptors */
function volumeDescriptor({ type, space, joliet }) {
  const d = Buffer.alloc(SECTOR);
  d.writeUInt8(type, 0);
  d.write("CD001", 1, "ascii");
  d.writeUInt8(1, 6);
  // byte 7 is reserved and must be zero — a space here is rejected by strict readers
  // Every text field in the Joliet descriptor is UCS-2, including the volume
  // label; writing plain ASCII there makes strict readers show mojibake.
  const pad = (s, len) => {
    if (!joliet) return Buffer.from(s.padEnd(len, " ").slice(0, len), "ascii");
    const chars = Math.floor(len / 2);
    const body = ucs2(s.slice(0, chars));
    const fill = Buffer.alloc(len - body.length);
    for (let i = 0; i + 1 < fill.length; i += 2) {
      fill.writeUInt16BE(0x20, i);
    }
    return Buffer.concat([body, fill]);
  };
  pad("AYBEK_HOSPITAL", 32).copy(d, 8); // system identifier
  pad(volumeId, 32).copy(d, 40);
  bothEndian32(totalSectors).copy(d, 80);
  if (joliet) {
    // escape sequences: %/E = UCS-2 level 3
    d.writeUInt8(0x25, 88);
    d.writeUInt8(0x2f, 89);
    d.writeUInt8(0x45, 90);
  }
  bothEndian16(1).copy(d, 120); // volume set size
  bothEndian16(1).copy(d, 124); // volume sequence number
  bothEndian16(SECTOR).copy(d, 128); // logical block size
  bothEndian32(pathTableLength(space)).copy(d, 132); // path table size
  d.writeUInt32LE(tables[`${space}L`].sector, 140);
  d.writeUInt32LE(0, 144);
  d.writeUInt32BE(tables[`${space}M`].sector, 148);
  d.writeUInt32BE(0, 152);

  const rootDir = rootNode;
  const rootAlias = joliet ? "" : "";
  const rootRec = Buffer.alloc(34);
  rootRec.writeUInt8(34, 0);
  bothEndian32(rootDir[`extent_${space}`]).copy(rootRec, 2);
  bothEndian32(rootDir[`sectors_${space}`] * SECTOR).copy(rootRec, 10);
  isoDate(now).copy(rootRec, 18);
  rootRec.writeUInt8(0x02, 25);
  bothEndian16(1).copy(rootRec, 28);
  rootRec.writeUInt8(1, 32);
  rootRec.writeUInt8(0x00, 33);
  rootRec.copy(d, 156);

  pad("AYBEK HOSPITAL DELIVERY DISC", 128).copy(d, 190); // volume set id
  pad("DR MAMON AMINYAR", 128).copy(d, 318); // publisher
  pad("AYBEK HMS BUILD - NODE", 128).copy(d, 446); // data preparer
  pad("AYBEK-HMS", 128).copy(d, 574); // application id
  pad("", 37).copy(d, 702);
  pad("", 37).copy(d, 739);
  pad("", 37).copy(d, 776);
  const stamp = asciiDate(now);
  stamp.copy(d, 813);
  stamp.copy(d, 830);
  Buffer.from("0000000000000000", "ascii").copy(d, 847);
  Buffer.from("0000000000000000", "ascii").copy(d, 864);
  d.writeUInt8(1, 881); // file structure version
  void rootAlias;
  return d;
}

put(16, volumeDescriptor({ type: 1, space: "iso", joliet: false }));
put(17, volumeDescriptor({ type: 2, space: "joliet", joliet: true }));
const terminator = Buffer.alloc(SECTOR);
terminator.writeUInt8(255, 0);
terminator.write("CD001", 1, "ascii");
terminator.writeUInt8(1, 6);
put(18, terminator);

/* -------------------------------------------------------------------- write */
fs.mkdirSync(path.dirname(isoPath), { recursive: true });
fs.writeFileSync(isoPath, image);

const digest = crypto.createHash("sha256").update(image).digest("hex");
const sizeMb = (image.length / 1024 / 1024).toFixed(1);
console.log("");
ok(`${path.relative(root, isoPath)} — ${sizeMb} MB, ${totals.files} files, ${totals.dirs} folders, label ${volumeId}`);
console.log(`  sha256 ${digest}`);
console.log(`  wrote ${path.relative(root, isoPath)}.sha256.txt`);
fs.writeFileSync(`${isoPath}.sha256.txt`, `${digest}  ${path.basename(isoPath)}\n`, "utf8");
if (image.length > 700 * 1024 * 1024) console.log("  (this image needs a DVD)");
console.log("");
