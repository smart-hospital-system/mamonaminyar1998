# Age- and sex-stratified demo prescriptions

**Generated:** 2026-11-01T17:41:14.235Z · **Conditions:** 100 · **Patients:** 600 · **Prescriptions:** 600 · **Prescription lines:** 2432

Every condition has one patient per band and per sex, so each condition is represented
6 times: child (< 18), adult (18–70) and older adult (71–90), half female and half male.
Every prescription contains **at least four medicines** and always includes a liquid or
injectable preparation (syrup, suspension, nebule, drops, inhaler or vial).

| Band | Patients |
| --- | --- |
| < 18 years | 200 |
| 18–70 years | 200 |
| 71–90 years | 200 |

| Sex | Patients |
| --- | --- |
| female | 300 |
| male | 300 |

| Measure | Result |
| --- | --- |
| Medicines per prescription (min / max) | 4 / 5 |
| Prescriptions with a vial (injection) | 378 of 600 (63%) |
| Prescriptions with a syrup or suspension | 224 of 600 (37%) |
| Prescriptions with any liquid or injectable | 600 of 600 (100%) |
| Child prescriptions with an oral syrup/suspension | 200 of 200 (100%) |

Where a vial is clinically justified (admitted patients, severe infection, emergency care) the
regimen uses an injectable; for self-limiting outpatient illness the child receives a syrup and
the adult a tablet, because an injection would not be appropriate there. Vial-bearing
prescriptions: 378 of 600 (63%).

## Files

- `data/disease-regimens.json` — one record per patient, with every item, dose, quantity and share
- `data/disease-regimens.csv` — flat table, one row per prescription line
- `data/disease-regimens.md` — this summary

## Disclaimer

This is a demonstration and teaching dataset. The doses are standard textbook ranges, not a
prescribing authority. Confirm every prescription against the national formulary, the
renal and hepatic adjustment tables and the prescriber's own judgement before use.

## Sample prescription (child, asthma)

```
RX-D-0049 · Roya Safi / رویا صفی · female, 9 years · child band · J45.9
  Budesonide inhaler   100 mcg/dose  1 puff             twice daily with spacer   (14 puffs)
  Salbutamol           2.5 mg/2.5 ml  1 nebule           in an attack              (14 nebules)
  Prednisolone syrup   5 mg/5 ml      1–2 mg/kg           once daily, morning       (25 ml)
  Cetirizine syrup     5 mg/5 ml      2.5–5 mg            once daily at night       (70 ml)
```
