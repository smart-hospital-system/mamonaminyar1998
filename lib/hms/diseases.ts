/**
 * Clinical reference catalogue — diseases, signs, diagnosis and treatment.
 *
 * Purpose: a doctor at Aybek Ten-Bed Specialy Surgical Hospital opens
 * /hms/diseases, types a symptom or a disease name (English or Dari) and gets
 * the disease, its signs and symptoms, how to diagnose it, and every treatment
 * route that applies — drug, supportive, procedural, surgical.
 *
 * Data format (deliberately compact so the catalogue can grow to thousands of
 * entries without bloating the bundle):
 *
 *   id | icd10 | category | nameEn | nameFa | symptoms | diagnosis | treatment | fa summary
 *
 * Fields are separated by "|" and symptoms/diagnosis/treatment use " • " as an
 * item separator. English carries the full clinical detail; every entry also
 * has a Persian name and a one-line Persian summary so a Dari-speaking clinician
 * can read the catalogue without switching language.
 *
 * Safety: this is a reference aid, not an autonomous prescriber. Every screen
 * that displays it says so, doses are not printed here (the prescription engine
 * and the renal/paediatric calculators own dosing), and each entry names the
 * guideline family it follows.
 */

export type DiseaseCategory =
  | "respiratory"
  | "infectious"
  | "gastrointestinal"
  | "cardiovascular"
  | "neurological"
  | "endocrine"
  | "renal"
  | "dermatology"
  | "musculoskeletal"
  | "obstetric"
  | "paediatric"
  | "psychiatric"
  | "surgical"
  | "ent"
  | "ophthalmic"
  | "haematology"
  | "poisoning"
  | "seasonal";

export type Disease = {
  id: string;
  icd10: string;
  category: DiseaseCategory;
  nameEn: string;
  nameFa: string;
  symptoms: string[];
  diagnosis: string[];
  treatment: string[];
  fa: string;
  /** Red flags that change the plan today — optional, added with the GI/CV chapters. */
  danger: string[];
  /** What happens if the condition is left alone — optional, same chapters. */
  complications: string[];
};

export const CATEGORY_LABEL: Record<DiseaseCategory, { en: string; fa: string }> = {
  respiratory: { en: "Respiratory", fa: "تنفسی" },
  infectious: { en: "Infectious", fa: "ساری" },
  gastrointestinal: { en: "Gastrointestinal", fa: "هاضمه" },
  cardiovascular: { en: "Cardiovascular", fa: "قلبی و عروقی" },
  neurological: { en: "Neurological", fa: "عصبی" },
  endocrine: { en: "Endocrine & metabolic", fa: "غدد و میتابولیک" },
  renal: { en: "Renal & urinary", fa: "کلیوی و ادراری" },
  dermatology: { en: "Skin", fa: "پوستی" },
  musculoskeletal: { en: "Bones & joints", fa: "استخوان و مفاصل" },
  obstetric: { en: "Pregnancy & childbirth", fa: "حاملگی و ولادت" },
  paediatric: { en: "Child health", fa: "صحتمندی طفل" },
  psychiatric: { en: "Mental health", fa: "صحتدروانی" },
  surgical: { en: "Surgery", fa: "جراحی" },
  ent: { en: "Ear, nose & throat", fa: "گوش، بینی و گلو" },
  ophthalmic: { en: "Eye", fa: "چشم" },
  haematology: { en: "Blood", fa: "خون" },
  poisoning: { en: "Poisoning & envenomation", fa: "زهر و گزیدگی" },
  seasonal: { en: "Seasonal & weather-linked", fa: "فصلی و مرتبط با هوا" },
};

/** Filled by the chapter modules; parsed once at module load. */
import { CHAPTERS } from "./diseases/index";

function parse(line: string): Disease | null {
  const p = line.split("|").map((x) => x.trim());
  if (p.length < 9) return null;
  const [id, icd10, category, nameEn, nameFa, symptoms, diagnosis, treatment, fa, danger = "", complications = ""] = p;
  if (!id || !nameEn) return null;
  const split = (s: string) => s.split("•").map((x) => x.trim()).filter(Boolean);
  return {
    id,
    icd10,
    category: category as DiseaseCategory,
    nameEn,
    nameFa,
    symptoms: split(symptoms),
    diagnosis: split(diagnosis),
    treatment: split(treatment),
    fa,
    danger: split(danger),
    complications: split(complications),
  };
}

export const DISEASES: Disease[] = CHAPTERS.flatMap((chunk) =>
  chunk.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map(parse)
).filter((d): d is Disease => d !== null);

const SEARCH_INDEX = DISEASES.map((d) => ({
  d,
  hay: [d.nameEn, d.nameFa, d.icd10, d.category, d.fa, d.symptoms.join(" "), d.diagnosis.join(" "), d.treatment.join(" "), d.danger.join(" "), d.complications.join(" ")]
    .join(" ")
    .toLowerCase(),
}));

export function searchDiseases(q: string, category?: string, limit = 60): Disease[] {
  const needle = q.trim().toLowerCase();
  const pool = category ? SEARCH_INDEX.filter((x) => x.d.category === category) : SEARCH_INDEX;
  if (!needle) return pool.slice(0, limit).map((x) => x.d);
  const terms = needle.split(/\s+/).filter(Boolean);
  const scored = pool
    .map((x) => {
      let score = 0;
      for (const t of terms) {
        if (!x.hay.includes(t)) return { d: x.d, score: -1 };
        if (x.d.nameEn.toLowerCase().includes(t) || x.d.nameFa.includes(t)) score += 5;
        else score += 1;
      }
      return { d: x.d, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.d);
}

export function diseaseById(id: string): Disease | undefined {
  return DISEASES.find((d) => d.id === id);
}

export function categoryCounts(): { category: DiseaseCategory; count: number }[] {
  const map = new Map<DiseaseCategory, number>();
  for (const d of DISEASES) map.set(d.category, (map.get(d.category) ?? 0) + 1);
  return [...map.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export function catalogueStats() {
  return {
    total: DISEASES.length,
    categories: categoryCounts().length,
    seasonal: DISEASES.filter((d) => d.category === "seasonal").length,
    withDrugs: DISEASES.filter((d) => d.treatment.some((t) => /\bmg\b|tablet|capsule|syrup|injection|IV|oral/i.test(t))).length,
    withRedFlags: DISEASES.filter((d) => d.danger.length > 0).length,
  };
}
