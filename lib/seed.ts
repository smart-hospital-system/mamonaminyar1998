import type { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";
import { toIso, dateKey, addDaysKey } from "./utils";

/* deterministic pseudo-random so the demo looks the same on every fresh install */
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260314);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const chance = (p: number) => rand() < p;
const pad = (n: number) => String(n).padStart(2, "0");

const STAFF_COLORS = ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#8b5cf6", "#0ea5e9"];

export function seedDatabase(db: DatabaseSync) {
  const now = new Date();
  const today = dateKey(now);
  const nowIso = now.toISOString();

  const insert = (table: string, row: Record<string, unknown>) => {
    const keys = Object.keys(row);
    const sql = `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`;
    db.prepare(sql).run(...(keys.map((k) => (row[k] === undefined ? null : row[k])) as never[]));
  };

  db.exec("BEGIN");
  try {
    /* ------------------------------------------------------------------ staff */
    const staff = [
      { id: "stf_ava", name: "Ava Bennett", email: "ava@lumierestudio.sg", phone: "+65 8123 4471", title: "Creative Director", color: "#6366f1", specialties: ["Hair", "Colour", "Bridal"], rating: 4.9, rate: 65, bio: "Award-winning colourist with 12 years behind the chair. Trained in London and obsessed with lived-in balayage.", start: "09:00", end: "18:00" },
      { id: "stf_marcus", name: "Marcus Reed", email: "marcus@lumierestudio.sg", phone: "+65 8123 4482", title: "Senior Stylist", color: "#0ea5e9", specialties: ["Hair", "Barbering"], rating: 4.8, rate: 48, bio: "Precision cuts and classic barbering. Marcus keeps the studio's playlist and the fades sharp.", start: "10:00", end: "19:00" },
      { id: "stf_sofia", name: "Sofia Kim", email: "sofia@lumierestudio.sg", phone: "+65 8123 4493", title: "Lead Esthetician", color: "#ec4899", specialties: ["Skin", "Facials"], rating: 4.9, rate: 52, bio: "Clinical esthetician focused on barrier repair and gentle, results-driven facials.", start: "09:00", end: "18:00" },
      { id: "stf_jasmine", name: "Jasmine Ortiz", email: "jasmine@lumierestudio.sg", phone: "+65 8123 4504", title: "Nail Artist", color: "#f59e0b", specialties: ["Nails"], rating: 4.7, rate: 38, bio: "Hand-painted nail art specialist. If you can sketch it, Jasmine can put it on a nail.", start: "10:00", end: "19:00" },
      { id: "stf_liam", name: "Liam Chen", email: "liam@lumierestudio.sg", phone: "+65 8123 4515", title: "Massage Therapist", color: "#14b8a6", specialties: ["Wellness", "Massage"], rating: 4.8, rate: 45, bio: "Sports massage and deep tissue specialist, certified in prenatal and lymphatic techniques.", start: "11:00", end: "20:00" },
      { id: "stf_priya", name: "Priya Nair", email: "priya@lumierestudio.sg", phone: "+65 8123 4526", title: "Studio Manager", color: "#8b5cf6", specialties: ["Hair", "Bridal"], rating: 4.6, rate: 50, bio: "Runs the floor, handles bridal trials and somehow still finds time for her own clients.", start: "09:00", end: "18:00" },
    ];
    for (const s of staff) {
      insert("staff", {
        id: s.id, name: s.name, email: s.email, phone: s.phone, title: s.title,
        avatar_color: s.color, bio: s.bio, specialties: JSON.stringify(s.specialties),
        rating: s.rating, hourly_rate: s.rate, active: 1, created_at: nowIso,
      });
      for (let wd = 0; wd < 7; wd++) {
        const working = wd !== 0 && !(wd === 1 && s.id === "stf_liam");
        insert("staff_schedules", {
          id: `sch_${s.id}_${wd}`, staff_id: s.id, weekday: wd,
          start_time: s.start, end_time: s.end, is_working: working ? 1 : 0,
        });
      }
    }

    /* ------------------------------------------------------------------ users */
    const pw = bcrypt.hashSync("mamonaminyar", 10);
    const staffPw = bcrypt.hashSync("slotly123", 10);
    const users = [
      { id: "usr_owner", email: "mamon.aminyar650432@gmail.com", hash: pw, name: "Mamon Aminyar", role: "owner", staff_id: "stf_ava", avatar: "#6366f1" },
      { id: "usr_manager", email: "priya@lumierestudio.sg", hash: staffPw, name: "Priya Nair", role: "manager", staff_id: "stf_priya", avatar: "#8b5cf6" },
      { id: "usr_ava", email: "ava@lumierestudio.sg", hash: staffPw, name: "Ava Bennett", role: "staff", staff_id: "stf_ava", avatar: "#6366f1" },
      { id: "usr_sofia", email: "sofia@lumierestudio.sg", hash: staffPw, name: "Sofia Kim", role: "staff", staff_id: "stf_sofia", avatar: "#ec4899" },
    ];
    for (const u of users) {
      insert("users", {
        id: u.id, email: u.email, password_hash: u.hash, name: u.name,
        avatar_url: u.avatar, role: u.role, staff_id: u.staff_id, active: 1,
        created_at: nowIso, last_login_at: nowIso,
      });
    }

    /* ------------------------------------------------------------------ services */
    const services = [
      { id: "svc_haircut", name: "Signature Haircut & Style", cat: "Hair", dur: 45, price: 68, dep: 20, color: "#6366f1", desc: "Consultation, precision cut and a finish-your-way blow-dry.", pop: 1, staff: ["stf_ava", "stf_marcus", "stf_priya"] },
      { id: "svc_balayage", name: "Balayage & Colour", cat: "Hair", dur: 180, price: 328, dep: 80, color: "#8b5cf6", desc: "Hand-painted dimensional colour with toner and gloss finish.", pop: 1, staff: ["stf_ava", "stf_priya"] },
      { id: "svc_root", name: "Root Touch-Up", cat: "Hair", dur: 90, price: 148, dep: 40, color: "#a855f7", desc: "Seamless regrowth coverage with a shine-enhancing rinse.", pop: 0, staff: ["stf_ava", "stf_marcus"] },
      { id: "svc_blowout", name: "Blowout & Styling", cat: "Hair", dur: 45, price: 58, dep: 0, color: "#818cf8", desc: "Volume, waves or sleek — a 45-minute reset for any occasion.", pop: 1, staff: ["stf_ava", "stf_marcus", "stf_priya"] },
      { id: "svc_keratin", name: "Keratin Smoothing", cat: "Hair", dur: 150, price: 268, dep: 60, color: "#7c3aed", desc: "Frizz-taming smoothing treatment that lasts up to 12 weeks.", pop: 0, staff: ["stf_ava"] },
      { id: "svc_facial", name: "Signature Glow Facial", cat: "Skin", dur: 60, price: 128, dep: 30, color: "#ec4899", desc: "Double cleanse, enzyme exfoliation, extractions and LED therapy.", pop: 1, staff: ["stf_sofia"] },
      { id: "svc_hydraglow", name: "HydraGlow Deep Cleanse", cat: "Skin", dur: 75, price: 168, dep: 40, color: "#f472b6", desc: "Hydradermabrasion with custom serums for instant luminosity.", pop: 1, staff: ["stf_sofia"] },
      { id: "svc_peel", name: "Resurfacing Peel", cat: "Skin", dur: 45, price: 138, dep: 30, color: "#db2777", desc: "Medical-grade lactic or mandelic peel tailored to your skin.", pop: 0, staff: ["stf_sofia"] },
      { id: "svc_gel", name: "Gel Manicure", cat: "Nails", dur: 45, price: 58, dep: 0, color: "#f59e0b", desc: "Shape, cuticle care and a long-wear gel colour of your choice.", pop: 1, staff: ["stf_jasmine"] },
      { id: "svc_pedi", name: "Spa Pedicure", cat: "Nails", dur: 60, price: 78, dep: 0, color: "#fbbf24", desc: "Warm soak, exfoliation, massage and polish.", pop: 0, staff: ["stf_jasmine"] },
      { id: "svc_nailart", name: "Nail Art Add-On", cat: "Nails", dur: 30, price: 38, dep: 0, color: "#f97316", desc: "Chrome, French, or hand-painted detail — per hand.", pop: 0, staff: ["stf_jasmine"] },
      { id: "svc_massage", name: "Deep Tissue Massage", cat: "Wellness", dur: 60, price: 118, dep: 20, color: "#14b8a6", desc: "Focused pressure work for knots, tension and desk-bound shoulders.", pop: 1, staff: ["stf_liam"] },
      { id: "svc_aroma", name: "Aromatherapy Relaxation", cat: "Wellness", dur: 90, price: 158, dep: 20, color: "#10b981", desc: "Slow, full-body massage with a bespoke essential oil blend.", pop: 0, staff: ["stf_liam"] },
      { id: "svc_bridal", name: "Bridal Hair & Makeup", cat: "Bridal", dur: 120, price: 388, dep: 100, color: "#d946ef", desc: "Trial-informed bridal styling with long-wear makeup.", pop: 0, staff: ["stf_ava", "stf_priya"] },
    ];
    for (const s of services) {
      insert("services", {
        id: s.id, name: s.name, category: s.cat, description: s.desc,
        duration_min: s.dur, price: s.price, deposit: s.dep, color: s.color,
        buffer_min: s.dur >= 120 ? 20 : 10, active: 1, popular: s.pop, created_at: nowIso,
      });
      for (const st of s.staff) insert("staff_services", { staff_id: st, service_id: s.id });
    }

    const addons: [string, string, number, number][] = [
      ["svc_haircut", "Scalp Massage Ritual", 25, 15],
      ["svc_haircut", "Gloss Shine Treatment", 45, 20],
      ["svc_blowout", "Extensions Styling", 35, 20],
      ["svc_balayage", "Bond Builder Treatment", 55, 25],
      ["svc_balayage", "Extra Bowl of Lightener", 40, 30],
      ["svc_facial", "LED Light Therapy", 30, 15],
      ["svc_facial", "Lymphatic Face Massage", 28, 15],
      ["svc_hydraglow", "Eye Brightening Patch", 22, 10],
      ["svc_gel", "Nail Art (per hand)", 18, 15],
      ["svc_pedi", "Paraffin Foot Treatment", 20, 15],
      ["svc_massage", "Hot Stone Upgrade", 30, 20],
      ["svc_aroma", "Scalp & Hair Oil Ritual", 18, 15],
    ];
    addons.forEach(([sid, name, price, dur], i) => {
      insert("service_addons", { id: `add_${i + 1}`, service_id: sid, name, price, duration_min: dur, active: 1 });
    });

    /* ------------------------------------------------------------------ customers */
    const customerSeed: [string, string, string][] = [
      ["Aisha Rahman", "aisha.rahman", "VIP"], ["Benjamin Tan", "benjamin.tan", "Loyal"],
      ["Chloe Lim", "chloe.lim", "VIP"], ["Daniel Wong", "daniel.wong", "New"],
      ["Elena Ng", "elena.ng", "Loyal"], ["Farhan Ismail", "farhan.ismail", "At-risk"],
      ["Grace Lee", "grace.lee", "Loyal"], ["Hafiz Osman", "hafiz.osman", "New"],
      ["Isabella Koh", "isabella.koh", "VIP"], ["Jun Wei Teo", "junwei.teo", "Loyal"],
      ["Kavya Menon", "kavya.menon", "Loyal"], ["Lucas Goh", "lucas.goh", "New"],
      ["Mei Ling Chan", "meiling.chan", "VIP"], ["Nadia Salleh", "nadia.salleh", "At-risk"],
      ["Oliver Sims", "oliver.sims", "New"], ["Priyanka Rao", "priyanka.rao", "Loyal"],
      ["Qi Hui Tan", "qihui.tan", "Loyal"], ["Ryan Chua", "ryan.chua", "New"],
      ["Siti Aminah", "siti.aminah", "VIP"], ["Thomas Yeo", "thomas.yeo", "At-risk"],
      ["Uma Devi", "uma.devi", "Loyal"], ["Victor Lau", "victor.lau", "New"],
      ["Wei Xuan Ho", "weixuan.ho", "Loyal"], ["Xin Yi Lim", "xinyi.lim", "VIP"],
      ["Yusuf Khan", "yusuf.khan", "Loyal"], ["Zoe Tan", "zoe.tan", "New"],
      ["Arjun Nair", "arjun.nair", "Loyal"], ["Beatrice Ong", "beatrice.ong", "At-risk"],
      ["Caleb Sim", "caleb.sim", "New"], ["Divya Pillai", "divya.pillai", "VIP"],
      ["Ethan Chew", "ethan.chew", "Loyal"], ["Fiona Goh", "fiona.goh", "New"],
      ["Gabriel Tan", "gabriel.tan", "Loyal"], ["Hannah Lee", "hannah.lee", "At-risk"],
      ["Ivan Koh", "ivan.koh", "New"], ["Jasmine Wong", "jasmine.wong", "Loyal"],
      ["Kenneth Ng", "kenneth.ng", "VIP"], ["Layla Hussain", "layla.hussain", "New"],
      ["Marcus Lim", "marcus.lim", "Loyal"], ["Natalie Chua", "natalie.chua", "New"],
      ["Omar Rashid", "omar.rashid", "At-risk"], ["Rachel Teo", "rachel.teo", "Loyal"],
      ["Samuel Lee", "samuel.lee", "New"], ["Tanya Kapoor", "tanya.kapoor", "VIP"],
      ["Umar Farooq", "umar.farooq", "New"], ["Valerie Chia", "valerie.chia", "Loyal"],
      ["William Toh", "william.toh", "At-risk"], ["Yvonne Tan", "yvonne.tan", "Loyal"],
      ["Amelia Koh", "amelia.koh", "New"], ["Bryan Lim", "bryan.lim", "Loyal"],
      ["Carmen Yeo", "carmen.yeo", "Loyal"], ["Devon Tan", "devon.tan", "New"],
      ["Eleanor Goh", "eleanor.goh", "VIP"], ["Felix Chan", "felix.chan", "New"],
      ["Gwen Law", "gwen.law", "Loyal"], ["Harper Ng", "harper.ng", "New"],
      ["Iris Tan", "iris.tan", "Loyal"], ["Jonah Teo", "jonah.teo", "At-risk"],
      ["Keira Sim", "keira.sim", "New"], ["Leon Chua", "leon.chua", "Loyal"],
      ["Maya Lim", "maya.lim", "VIP"], ["Noel Ong", "noel.ong", "New"],
    ];
    // Extend the roster so the client book feels like a real studio (not 60 people sharing 2,300 bookings).
    const extraFirst = [
      "Aarav", "Adeline", "Aiden", "Aisyah", "Alina", "Amara", "Amos", "Ananya", "Anders", "Ariel",
      "Asher", "Aurelia", "Bella", "Benedict", "Bianca", "Caleb", "Camille", "Celine", "Chelsea", "Clara",
      "Damien", "Daphne", "Darius", "Delia", "Dylan", "Edith", "Elijah", "Elise", "Elliot", "Emilia",
      "Enya", "Ezra", "Farah", "Faye", "Finn", "Freya", "Gareth", "Genevieve", "Gideon", "Hana",
      "Harriet", "Hazel", "Heidi", "Hugo", "Ian", "Imani", "Indira", "Ingrid", "Irene", "Isaac",
      "Ivy", "Jaden", "Jaime", "Jasper", "Jolene", "Jonas", "Josiah", "Joy", "Jude", "Juliet",
      "Kai", "Kara", "Kian", "Kira", "Lachlan", "Lena", "Leo", "Liana", "Logan", "Lorraine",
      "Luca", "Lydia", "Mabel", "Maeve", "Malik", "Mara", "Matilda", "Megan", "Micah", "Mila",
      "Mira", "Nadia", "Nathan", "Niamh", "Nico", "Nina", "Noah", "Nora", "Olive", "Owen",
      "Phoebe", "Quinn", "Rafael", "Rania", "Reuben", "Rhea", "Riley", "Rohan", "Rosa", "Ruth",
      "Saanvi", "Sage", "Sasha", "Selina", "Shane", "Sienna", "Silas", "Simone", "Stella", "Talia",
      "Tara", "Theo", "Tobias", "Tristan", "Vera", "Vihaan", "Vince", "Vivian", "Wesley", "Willa",
      "Xander", "Yara", "Yasmine", "Yvette", "Zachary", "Zara", "Zayn", "Zoe",
    ];
    const extraLast = ["Tan", "Lim", "Ng", "Wong", "Lee", "Goh", "Chua", "Teo", "Koh", "Yeo", "Sim", "Ong", "Chan", "Ho", "Lau", "Toh", "Chia", "Law", "Png", "Sng"];
    const extraTags = ["Loyal", "Loyal", "Loyal", "New", "New", "New", "VIP", "At-risk"];
    extraFirst.forEach((first, i) => {
      const last = extraLast[(i * 7 + 3) % extraLast.length];
      customerSeed.push([`${first} ${last}`, `${first.toLowerCase()}.${last.toLowerCase()}${i + 1}`, extraTags[i % extraTags.length]]);
    });

    const preferencePool = [
      "Prefers senior stylist · no fragrance products",
      "Sensitive scalp — avoid ammonia colour",
      "Loves warm tones, books Saturday mornings",
      "Prefers a quiet room during treatments",
      "Allergic to latex gloves",
      "Always books with Sofia for facials",
      "Drinks oat latte, extra hot",
      "Wants low-maintenance colour between visits",
      "Brings her daughter for side-by-side appointments",
      "Prefers SMS reminders instead of email",
    ];
    const notePool = [
      "Referred by a friend through the referral programme.",
      "Asked about the bridal package for next spring.",
      "Had a colour correction in 2024 — patch test on file.",
      "Corporate wellness client, invoices to company.",
      "Loyalty tier reached Gold in January.",
      "Left a 5-star review after her last HydraGlow.",
    ];
    type SeedCustomer = {
      id: string; name: string; email: string; phone: string; dob: string;
      notes: string | null; preferences: string | null; tags: string; loyalty_points: number;
      vip: number; marketing_opt_in: number; visits: number; total_spent: number;
      last_visit_at: string | null; created_at: string;
    };
    const customers: SeedCustomer[] = customerSeed.map(([name, handle, tag], i) => {
      // skew join dates toward recent months so the growth curve trends upward
      const monthsAgo = Math.floor(Math.pow(rand(), 2.2) * 8);
      const joinOffset = monthsAgo * 30 + int(2, 28);
      const created = new Date(now.getTime() - joinOffset * 864e5).toISOString();
      return {
        id: `cus_${1001 + i}`,
        name,
        email: `${handle}@example.com`,
        phone: `+65 ${int(8, 9)}${int(100, 999)} ${int(1000, 9999)}`,
        dob: `${int(1, 12) === 3 && chance(0.3) ? 3 : int(1, 12)}-${pad(int(1, 28))}`,
        notes: chance(0.4) ? pick(notePool) : null,
        preferences: chance(0.65) ? pick(preferencePool) : null,
        tags: JSON.stringify([tag]),
        loyalty_points: int(0, 480),
        vip: tag === "VIP" ? 1 : 0,
        marketing_opt_in: chance(0.82) ? 1 : 0,
        visits: 0,
        total_spent: 0,
        last_visit_at: null,
        created_at: created,
      };
    });
    for (const c of customers) insert("customers", c);

    /* ------------------------------------------------------------------ bookings */
    const serviceWeights: Record<string, number> = {
      svc_haircut: 15, svc_blowout: 11, svc_facial: 13, svc_gel: 12, svc_massage: 10,
      svc_hydraglow: 8, svc_pedi: 8, svc_balayage: 7, svc_root: 6, svc_peel: 4,
      svc_nailart: 4, svc_keratin: 3, svc_aroma: 3, svc_bridal: 2,
    };
    const weightedPool: (typeof services)[number][] = [];
    for (const svc of services) {
      const w = serviceWeights[svc.id] ?? 4;
      for (let i = 0; i < w; i++) weightedPool.push(svc);
    }
    const pickService = () => pick(weightedPool);
    const staffById = new Map(staff.map((s) => [s.id, s]));
    const busy = new Map<string, [number, number][]>();
    const isFree = (staffId: string, start: number, end: number) => {
      const list = busy.get(staffId) ?? [];
      return !list.some(([s, e]) => start < e && end > s);
    };
    const occupy = (staffId: string, start: number, end: number) => {
      const list = busy.get(staffId) ?? [];
      list.push([start, end]);
      busy.set(staffId, list);
    };

    // Weighted customer pick — a core group books far more often.
    const loyalists = customers.slice(0, 34);
    const pickCustomer = () => (chance(0.55) ? pick(loyalists) : pick(customers));

    let bookingSeq = 1000;
    const invoiceStart = 1000 + int(0, 40);
    let paymentSeq = 0;
    const completedForReviews: { id: string; customer_id: string; staff_id: string; service_id: string; start: string }[] = [];
    const bookings: Record<string, unknown>[] = [];

    for (let dayOffset = -150; dayOffset <= 24; dayOffset++) {
      const dk = addDaysKey(today, dayOffset);
      const dow = new Date(`${dk}T00:00:00Z`).getUTCDay();
      if (dow === 0) continue; // studio closed Sundays
      const growth = dayOffset < 0 ? 1 - (Math.abs(dayOffset) / 150) * 0.62 : 1;
      const base = dow === 6 ? int(21, 26) : dow === 1 ? int(12, 15) : int(15, 20);
      const count = Math.max(3, Math.round(base * growth));
      for (let i = 0; i < count; i++) {
        const svc = chance(0.1) ? pick(services.filter((s) => s.dur >= 90)) : pickService();
        const staffId = pick(svc.staff);
        const st = staffById.get(staffId)!;
        const [sh, sm] = st.start.split(":").map(Number);
        const [eh] = st.end.split(":").map(Number);
        const slotMinutes = 15;
        const openMin = sh * 60 + sm;
        const closeMin = eh * 60 - svc.dur;
        if (closeMin <= openMin) continue;
        let placed = false;
        for (let attempt = 0; attempt < 40 && !placed; attempt++) {
          const raw = openMin + Math.floor(rand() * ((closeMin - openMin) / slotMinutes)) * slotMinutes;
          const hh = pad(Math.floor(raw / 60));
          const mm = pad(raw % 60);
          const startIso = toIso(dk, `${hh}:${mm}`);
          const startMs = new Date(startIso).getTime();
          const endMs = startMs + svc.dur * 60_000;
          if (!isFree(staffId, startMs, endMs + 10 * 60_000)) continue;
          occupy(staffId, startMs, endMs + 10 * 60_000);
          placed = true;

          const cust = pickCustomer();
          let status: string;
          const past = startMs < now.getTime();
          if (past) {
            const r = rand();
            status = r < 0.855 ? "completed" : r < 0.895 ? "no_show" : r < 0.95 ? "cancelled" : "confirmed";
          } else {
            const r = rand();
            status = r < 0.78 ? "confirmed" : r < 0.87 ? "pending" : r < 0.96 ? "confirmed" : "cancelled";
          }
          const source = pick(["online", "online", "online", "phone", "walk_in", "ai"]);
          const addonCount = chance(0.28) ? int(1, 2) : 0;
          const chosenAddons = Array.from({ length: addonCount }, () => ({
            name: pick(["Scalp Massage Ritual", "LED Light Therapy", "Gloss Shine Treatment", "Nail Art (per hand)", "Hot Stone Upgrade"]),
            price: pick([18, 22, 25, 30, 45]),
          }));
          const addonTotal = chosenAddons.reduce((a, b) => a + b.price, 0);
          const price = svc.price + addonTotal;
          const endIso = new Date(endMs).toISOString();
          const id = `bkg_${++bookingSeq}`;
          const created = new Date(startMs - int(1, 20) * 864e5).toISOString();

          const booking = {
            id,
            code: `BK-${String(bookingSeq).slice(-4)}${String.fromCharCode(65 + int(0, 25))}`,
            customer_id: cust.id,
            staff_id: staffId,
            service_id: svc.id,
            addons: JSON.stringify(chosenAddons),
            start_at: startIso,
            end_at: endIso,
            status,
            payment_status: "unpaid" as string,
            price,
            notes: chance(0.22) ? pick(["First visit — please allow extra time.", "Running 5 mins late, on the way.", "Would like a trim only, keep the length.", "Celebrating a birthday, add a glass of prosecco.", "Please use fragrance-free products."]) : null,
            internal_notes: chance(0.15) ? pick(["Repeat client — likes the same formula.", "Patch tested 2 weeks ago.", "Requested no small talk.", "Has a voucher from the giveaway."]) : null,
            source,
            recurring_rule: chance(0.06) ? pick(["weekly", "biweekly", "monthly"]) : null,
            parent_id: null,
            reminder_sent: past ? 1 : chance(0.5) ? 1 : 0,
            cancelled_reason: status === "cancelled" ? pick(["Customer rescheduled", "Staff unavailable", "Duplicate booking", "Payment failed"]) : null,
            created_at: created,
            updated_at: created,
          };

          // payments for completed / some confirmed
          let paymentStatus = "unpaid";
          if (status === "completed") {
            paymentStatus = chance(0.94) ? "paid" : "unpaid";
            completedForReviews.push({ id, customer_id: cust.id, staff_id: staffId, service_id: svc.id, start: startIso });
          } else if (status === "confirmed" && dayOffset < 0) {
            paymentStatus = chance(0.5) ? "paid" : "unpaid";
          }
          booking.payment_status = paymentStatus;

          if (paymentStatus === "paid") {
            const tip = chance(0.35) ? int(2, 12) : 0;
            const total = price + tip;
            const method = pick(["card", "card", "card", "paynow", "cash", "apple_pay"]);
            insert("payments", {
              id: `pay_${++paymentSeq + 5000}`,
              booking_id: id,
              customer_id: cust.id,
              invoice_no: `INV-${new Date(startIso).getUTCFullYear()}-${invoiceStart + paymentSeq}`,
              amount: price,
              tip,
              tax: Math.round(((price / 1.09) * 0.09) * 100) / 100,
              total,
              method,
              ...(chance(0.012)
                ? {
                    status: "refunded",
                    refunded_amount: Math.round(total * 0.6 * 100) / 100,
                    notes: "Client cancelled inside the 24h window — partial refund issued",
                  }
                : { status: "paid", refunded_amount: 0 }),
              paid_at: endIso,
              notes: null,
              created_at: endIso,
            });
          }

          bookings.push(booking);
          if (status === "completed") {
            cust.visits += 1;
            cust.total_spent = Math.round((cust.total_spent + price) * 100) / 100;
            if (!cust.last_visit_at || new Date(startIso) > new Date(cust.last_visit_at)) {
              cust.last_visit_at = startIso;
            }
            cust.loyalty_points += Math.round(price / 10);
            if (cust.marketing_opt_in) cust.loyalty_points += 0;
          }
        }
      }
    }

    for (const b of bookings) insert("bookings", b);
    for (const c of customers) {
      db.prepare(
        "UPDATE customers SET visits = ?, total_spent = ?, last_visit_at = ?, loyalty_points = ? WHERE id = ?"
      ).run(c.visits, c.total_spent, c.last_visit_at, c.loyalty_points, c.id);
    }

    /* ------------------------------------------------------------------ reviews */
    const comments5 = [
      "Ava absolutely nailed the colour — I've never had so many compliments.",
      "The most relaxing facial I've had in Singapore. My skin is glowing.",
      "Booked last minute and still felt like a priority. Beautiful studio.",
      "Marcus is a wizard with curls. Not going anywhere else.",
      "Loved the attention to detail, and the head massage was heaven.",
      "Spotless space, warm team, and my gel manicure still looks fresh two weeks later.",
      "Sofia explained every step and my barrier feels so much calmer.",
      "Best deep tissue massage — walked out feeling two inches taller.",
    ];
    const comments4 = [
      "Great result, though I waited about ten minutes past my slot.",
      "Lovely service and friendly team. Parking nearby is tricky.",
      "Really happy with the colour. Slightly pricier than my old salon.",
      "Beautiful finish — would have liked a bit more time on the blow-dry.",
    ];
    const comments3 = [
      "Good cut but the style didn't quite hold by the evening.",
      "Nice experience overall, though the room was a little noisy.",
    ];
    let reviewCount = 0;
    for (const b of completedForReviews) {
      if (!chance(0.58)) continue;
      const r = rand();
      const rating = r < 0.72 ? 5 : r < 0.93 ? 4 : 3;
      insert("reviews", {
        id: `rev_${++reviewCount}`,
        booking_id: b.id,
        customer_id: b.customer_id,
        staff_id: b.staff_id,
        rating,
        comment: rating === 5 ? pick(comments5) : rating === 4 ? pick(comments4) : pick(comments3),
        reply: chance(0.3) ? "Thank you so much for the kind words — we can't wait to see you again!" : null,
        tags: JSON.stringify(rating === 5 ? ["friendly", "results"] : ["timing"]),
        created_at: new Date(
          Math.min(new Date(b.start).getTime() + 20 * 36e5, now.getTime() - 5 * 6e4)
        ).toISOString(),
      });
    }

    /* ------------------------------------------------------------------ waitlist */
    const waitlistSeed = [
      ["cus_1001", "svc_balayage", "stf_ava", "Saturday morning ideally", "waiting"],
      ["cus_1005", "svc_facial", "stf_sofia", "Any weekday after 5pm", "offered"],
      ["cus_1011", "svc_massage", null, "Flexible — 90 min if possible", "waiting"],
      ["cus_1018", "svc_haircut", "stf_marcus", "Weekend, before noon", "waiting"],
      ["cus_1024", "svc_gel", "stf_jasmine", "Friday evening", "booked"],
      ["cus_1033", "svc_hydraglow", "stf_sofia", "Next week, any slot", "waiting"],
    ];
    waitlistSeed.forEach(([cid, sid, staffId, pref, status], i) => {
      insert("waitlist", {
        id: `wlt_${i + 1}`, customer_id: cid, service_id: sid, staff_id: staffId,
        desired_from: addDaysKey(today, int(1, 5)),
        desired_to: addDaysKey(today, int(8, 20)),
        preferred_time: pref, notes: null, status, created_at: new Date(now.getTime() - int(1, 6) * 864e5).toISOString(),
      });
    });

    /* ------------------------------------------------------------------ time off */
    [
      ["stf_jasmine", 6, 2, "Family trip to Bali", "approved"],
      ["stf_liam", 12, 1, "Physio appointment", "pending"],
      ["stf_marcus", 21, 3, "Barbering masterclass", "approved"],
    ].forEach(([sid, offset, days, reason, status], i) => {
      insert("staff_time_off", {
        id: `toff_${i + 1}`, staff_id: sid,
        start_date: addDaysKey(today, offset as number),
        end_date: addDaysKey(today, (offset as number) + (days as number)),
        reason: reason as string, status: status as string, created_at: nowIso,
      });
    });

    /* ------------------------------------------------------------------ coupons */
    const coupons = [
      ["WELCOME20", "20% off a first visit (max $40)", "percent", 20, 50, 200, 87, addDaysKey(today, 45), 1],
      ["GLOWUP15", "15% off any facial this month", "percent", 15, 90, 100, 34, addDaysKey(today, 18), 1],
      ["SPA50", "$50 off treatments over $200", "fixed", 50, 200, 60, 12, addDaysKey(today, 60), 1],
      ["WEEKEND10", "10% off Saturday appointments", "percent", 10, 0, 500, 156, addDaysKey(today, 90), 1],
      ["REFER25", "Referral reward — $25 off", "fixed", 25, 80, 999, 41, addDaysKey(today, 200), 1],
      ["BIRTHDAY", "Birthday month treat — 25% off", "percent", 25, 0, 999, 63, addDaysKey(today, -100), 0],
    ] as const;
    coupons.forEach((c, i) => {
      insert("coupons", {
        id: `cpn_${i + 1}`, code: c[0], description: c[1], type: c[2], value: c[3],
        min_amount: c[4], max_uses: c[5], uses: c[6],
        starts_at: addDaysKey(today, -60), expires_at: c[7], active: c[8], created_at: nowIso,
      });
    });

    /* ------------------------------------------------------------------ campaigns */
    const campaigns = [
      ["March Glow-Up", "email", "Your spring reset starts here ✨", "Beauty", "sent", 812, 498, 122, addDaysKey(today, -22)],
      ["We miss you, {{first_name}}", "email", "A little something for your next visit", "lapsed", "sent", 146, 71, 19, addDaysKey(today, -9)],
      ["Weekend Flash: 20% off facials", "sms", null, "all", "sent", 623, 0, 84, addDaysKey(today, -3)],
      ["Birthday treats for March", "email", "Happy birthday from Lumière 🎂", "birthday", "scheduled", 38, 0, 0, addDaysKey(today, 4)],
      ["New: HydraGlow Deep Cleanse", "email", "Meet your glowiest facial yet", "vip", "draft", 0, 0, 0, null],
    ] as const;
    campaigns.forEach((c, i) => {
      insert("campaigns", {
        id: `cmp_${i + 1}`, name: c[0], channel: c[1], subject: c[2],
        body: `Hi {{first_name}},\n\n${String(c[2] ?? "A quick note from the Lumière team")}.\n\nBook online any time and we'll take care of the rest.\n\nWith love,\nAva & the Lumière team`,
        audience: c[3], status: c[4], recipients: c[5], opened: c[6], clicked: c[7],
        scheduled_at: c[8] ? toIso(c[8], "10:00") : null,
        sent_at: c[4] === "sent" && c[8] ? toIso(c[8], "10:00") : null,
        created_at: nowIso,
      });
    });

    /* ------------------------------------------------------------------ referrals */
    [
      ["cus_1001", "Nadia Lim", "nadia.lim@example.com", "rewarded"],
      ["cus_1003", "Cheryl Ong", "cheryl.ong@example.com", "joined"],
      ["cus_1007", "Marco Bianchi", "marco.bianchi@example.com", "pending"],
      ["cus_1012", "Shruti Iyer", "shruti.iyer@example.com", "joined"],
      ["cus_1015", "Alex Tan", "alex.tan@example.com", "rewarded"],
    ].forEach(([cid, name, email, status], i) => {
      insert("referrals", {
        id: `ref_${i + 1}`, referrer_customer_id: cid, referred_name: name,
        referred_email: email, code: `LUM-${pick(["AVA", "PRIYA", "SOFIA", "MARCO"])}${int(10, 99)}`,
        status, reward: 25, created_at: new Date(now.getTime() - int(2, 40) * 864e5).toISOString(),
      });
    });

    /* ------------------------------------------------------------------ notifications */
    const notifications = [
      ["booking", "New booking request", "Nadia Salleh requested Balayage & Colour with Ava for Saturday 11:00.", "/dashboard/bookings", 0, 25],
      ["payment", "Payment received — S$328.00", "Invoice INV-2026-1042 was paid by card for Chloe Lim.", "/dashboard/payments", 0, 80],
      ["review", "New 5-star review", "“Ava absolutely nailed the colour.” — Aisha Rahman", "/dashboard/reviews", 0, 150],
      ["waitlist", "Waitlist match found", "Sofia has a 17:30 facial opening that fits Grace Lee's request.", "/dashboard/waitlist", 1, 240],
      ["staff", "Time-off request", "Liam Chen requested 1 day off for a physio appointment.", "/dashboard/staff", 1, 420],
      ["system", "Weekly report ready", "Your weekly performance summary is ready to review in Analytics.", "/dashboard/analytics", 1, 900],
      ["booking", "Booking cancelled", "Thomas Yeo cancelled his Gel Manicure — slot released.", "/dashboard/bookings", 1, 1200],
      ["ai", "AI insight", "Tuesdays are running 38% below capacity. Try a Tuesday promo.", "/dashboard/ai", 0, 60],
    ] as const;
    notifications.forEach((n, i) => {
      insert("notifications", {
        id: `ntf_${i + 1}`, user_id: null, type: n[0], title: n[1], body: n[2],
        link: n[3], read: n[4], created_at: new Date(now.getTime() - (n[5] as number) * 60000).toISOString(),
      });
    });

    /* ------------------------------------------------------------------ activity */
    const actions: [string, string, string][] = [
      ["created", "booking", "Created a booking for Chloe Lim — Balayage & Colour"],
      ["confirmed", "booking", "Confirmed booking BK-1042 for Aisha Rahman"],
      ["completed", "booking", "Marked booking BK-1038 as completed"],
      ["cancelled", "booking", "Cancelled booking BK-1035 — customer rescheduled"],
      ["updated", "customer", "Updated preferences for Elena Ng"],
      ["created", "payment", "Recorded a card payment of S$148.00"],
      ["updated", "service", "Changed price of Signature Glow Facial to S$128"],
      ["created", "staff", "Approved time-off for Jasmine Ortiz"],
      ["updated", "coupon", "Paused coupon BIRTHDAY"],
      ["created", "campaign", "Queued campaign “Birthday treats for March”"],
    ];
    for (let i = 0; i < 36; i++) {
      const [action, entity, detail] = pick(actions);
      const actor = pick([
        { id: "usr_owner", name: "Mamon Aminyar" },
        { id: "usr_manager", name: "Priya Nair" },
        { id: "usr_ava", name: "Ava Bennett" },
      ]);
      insert("activity_logs", {
        id: `log_seed_${i + 1}`, actor_name: actor.name, actor_id: actor.id,
        action, entity, entity_id: null, detail,
        created_at: new Date(now.getTime() - int(10, 1200) * 60000).toISOString(),
      });
    }

    /* ------------------------------------------------------------------ settings */
    const settings: Record<string, unknown> = {
      business: {
        name: "Lumière Studio",
        legal_name: "Lumière Beauty Studio Pte Ltd",
        tagline: "Hair · Skin · Nails · Wellness",
        email: "hello@lumierestudio.sg",
        phone: "+65 6733 8899",
        address: "21 Orchard Road, #02-14, Singapore 238839",
        timezone: "Asia/Singapore",
        currency: "SGD",
        website: "https://lumierestudio.sg",
        instagram: "@lumierestudio",
        description: "A small studio with big standards — six specialists, one calm room, and treatments built around your hair and skin.",
      },
      booking: {
        slot_interval: 15,
        min_notice_hours: 2,
        max_advance_days: 60,
        auto_confirm: true,
        allow_waitlist: true,
        cancellation_window_hours: 24,
        require_deposit: true,
        buffer_min: 10,
      },
      notifications: {
        email_confirmations: true,
        email_cancellations: true,
        sms_reminders: true,
        reminder_hours: 24,
        staff_notifications: true,
        daily_digest: true,
        review_requests: true,
      },
      payments: {
        gst_rate: 9,
        accept_card: true,
        accept_paynow: true,
        accept_cash: true,
        deposit_percent: 25,
        payout_account: "•••• 4412",
      },
      ai: {
        assistant_enabled: true,
        smart_assignment: true,
        followups: true,
        forecast_horizon: 14,
      },
    };
    for (const [key, value] of Object.entries(settings)) {
      insert("settings", { key, value: JSON.stringify(value) });
    }

    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
