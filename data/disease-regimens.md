# Age- and sex-stratified demo prescriptions

**Generated:** 2026-11-01T23:12:32.622Z · **Conditions:** 320 · **Patients:** 1920 · **Prescription lines:** 8114

Every condition has one patient per band and per sex: child (< 18), adult (18–70) and older
adult (71–90), half female and half male. Every prescription contains **at least four
medicines** and always includes a liquid preparation. Each one is then **checked by the
system** — age bans, renal adjustment, interactions and duplication.

| Band | Patients |
| --- | --- |
| < 18 years | 640 |
| 18–70 years | 640 |
| 71–90 years | 640 |

| Sex | Patients |
| --- | --- |
| female | 960 |
| male | 960 |

| Measure | Result |
| --- | --- |
| Medicines per prescription (min / max) | 4 / 6 |
| Prescriptions with a liquid preparation | 1920 of 1920 (100%) |
| Child prescriptions with an oral syrup | 640 of 640 (100%) |
| Prescriptions with an injectable (vial) | 1056 of 1920 (55%) |
| Prescriptions with a safety finding | 130 of 1920 |
| … of those, blocking findings | 0 |
| Total findings raised | 318 |

## Files

- `data/disease-regimens.json` — one record per patient, every item, dose, quantity and share
- `data/disease-regimens.csv` — flat table, one row per prescription line, plus safety counts
- `data/disease-regimens.md` — this summary

## The two rules the system enforces

1. **Reference doses, not a prescribing order.** Every entry is a textbook range for teaching.
   `/hms/diseases` prints this above the regimen, and the review panel runs age, renal,
   interaction and duplication checks on the prescription you are looking at.
2. **Injectables only where clinically right.** 55% of these prescriptions carry a vial — admitted,
   severe or emergency care. A viral cold or a fungal skin infection gets tablets or a syrup,
   because injecting there would be wrong. Children are the exception in the other direction:
   100% receive an oral syrup.

## Disclaimer

Demonstration and teaching dataset. Confirm every prescription against the national formulary,
the renal and hepatic adjustment tables and your own judgement before use.
