/**
 * Chapter registry for the clinical reference catalogue.
 * Add a new chapter by importing its module and appending it here — the parser,
 * search index, category counts and statistics all pick it up automatically.
 */
import { CARDIOVASCULAR } from "./ch-cardiovascular";
import { DERMATOLOGY } from "./ch-dermatology";
import { ENDOCRINE } from "./ch-endocrine";
import { GASTROINTESTINAL } from "./ch-gastrointestinal";
import { INFECTIOUS } from "./ch-infectious";
import { ENT } from "./ch-ent";
import { MUSCULOSKELETAL } from "./ch-musculoskeletal";
import { NEUROLOGICAL } from "./ch-neurological";
import { RENAL } from "./ch-renal";
import { RESPIRATORY } from "./ch-respiratory";
import { SEASONAL } from "./ch-seasonal";

export const CHAPTERS: string[] = [
  RESPIRATORY,
  SEASONAL,
  INFECTIOUS,
  ENT,
  GASTROINTESTINAL,
  CARDIOVASCULAR,
  NEUROLOGICAL,
  ENDOCRINE,
  RENAL,
  DERMATOLOGY,
  MUSCULOSKELETAL,
];
