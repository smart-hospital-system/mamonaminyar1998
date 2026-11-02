# Age- and sex-stratified demo prescriptions

**Generated:** 2026-11-02T04:57:29.000Z · **Conditions:** 430 · **Patients:** 2580 · **Prescription lines:** 10876

Every condition has one patient per band and per sex: child (< 18), adult (18–70) and older
adult (71–90), half female and half male. Every prescription contains **at least four
medicines** and always includes a liquid preparation. Each one is then **checked by the
system** — age bans, renal adjustment, interactions and duplication.

| Band | Patients |
| --- | --- |
| < 18 years | 860 |
| 18–70 years | 860 |
| 71–90 years | 860 |

| Sex | Patients |
| --- | --- |
| female | 1290 |
| male | 1290 |

| Measure | Result |
| --- | --- |
| Medicines per prescription (min / max) | 4 / 6 |
| Prescriptions with a liquid preparation | 2580 of 2580 (100%) |
| Child prescriptions with an oral syrup | 860 of 860 (100%) |
| Prescriptions with an injectable (vial) | 1396 of 2580 (54%) |
| Prescriptions with a safety finding | 152 of 2580 |
| … of those, blocking findings | 0 |
| Total findings raised | 406 |

## Files

- `data/disease-regimens.json` — one record per patient, every item, dose, quantity and share
- `data/disease-regimens.csv` — flat table, one row per prescription line, plus safety counts
- `data/disease-regimens.md` — this summary

## The two rules the system enforces

1. **Reference doses, not a prescribing order.** Every entry is a textbook range for teaching.
   `/hms/diseases` prints this above the regimen, and the review panel runs age, renal,
   interaction and duplication checks on the prescription you are looking at.
2. **Injectables only where clinically right.** 54% of these prescriptions carry a vial — admitted,
   severe or emergency care. A viral cold or a fungal skin infection gets tablets or a syrup,
   because injecting there would be wrong. Children are the exception in the other direction:
   100% receive an oral syrup.

## Disclaimer

Demonstration and teaching dataset. Confirm every prescription against the national formulary,
the renal and hepatic adjustment tables and your own judgement before use.
