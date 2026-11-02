# Age- and sex-stratified demo prescriptions

**Generated:** 2026-11-02T05:10:03.587Z · **Conditions:** 477 · **Patients:** 2862 · **Prescription lines:** 12096

Every condition has one patient per band and per sex: child (< 18), adult (18–70) and older
adult (71–90), half female and half male. Every prescription contains **at least four
medicines** and always includes a liquid preparation. Each one is then **checked by the
system** — age bans, renal adjustment, interactions and duplication.

| Band | Patients |
| --- | --- |
| < 18 years | 954 |
| 18–70 years | 954 |
| 71–90 years | 954 |

| Sex | Patients |
| --- | --- |
| female | 1431 |
| male | 1431 |

| Measure | Result |
| --- | --- |
| Medicines per prescription (min / max) | 4 / 6 |
| Prescriptions with a liquid preparation | 2862 of 2862 (100%) |
| Child prescriptions with an oral syrup | 954 of 954 (100%) |
| Prescriptions with an injectable (vial) | 1560 of 2862 (55%) |
| Prescriptions with a safety finding | 234 of 2862 |
| … of those, blocking findings | 0 |
| Total findings raised | 544 |

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
