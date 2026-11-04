# Age- and sex-stratified clinical catalogue examples

**Generated:** 2026-11-02T22:56:07.209Z · **Conditions:** 717 · **Synthetic patient examples:** 3815 · **Prescription examples:** 3086 · **Prescription lines:** 12408

Each condition has synthetic patient examples only in its applicable age bands: child (2–17),
adult (18–70) and older adult (71–90). The paediatric chapter is restricted to child-band examples;
children under 2 and neonatal dosing are outside this demo engine. Its cases are age-bounded and do
not prefill medicines because safe choices depend on weight, age, diagnosis and formulation.
Obstetric and gynaecology cases are female-only, age-bounded, and have no prefilled medicines.
Other cases with no routine medicine have **no prescription example**; procedural or supportive
treatment remains in the clinical entry. The original catalogue recipes retain their historical
4–6-line teaching format. ENT, ophthalmic, paediatric and obstetric/gynaecology recipes opt out of
automatic fill-in where extra drugs would be inappropriate.

| Band | Synthetic patient examples |
| --- | --- |
| < 18 years | 1356 |
| 18–70 years | 1254 |
| 71–90 years | 1205 |

| Sex | Synthetic patient examples |
| --- | --- |
| female | 1964 |
| male | 1851 |

| Measure | Result |
| --- | --- |
| Conditions with at least one medication example | 515 of 717 |
| Medicines per non-empty prescription example (min / max) | 1 / 6 |
| Prescription examples with a liquid preparation | 3042 of 3086 (99%) |
| Child prescription examples with an oral syrup | 984 of 1026 (96%) |
| Prescription examples with an injectable (vial) | 1604 of 3086 (52%) |
| Prescription examples with a safety finding | 234 of 3086 |
| … of those, blocking findings | 0 |
| Total findings raised | 550 |
| Cases without a medication example | 729 |

## Files

- `data/disease-regimens.json` — synthetic age/sex records for applicable bands, including child-only paediatric cases and no-medication cases
- `data/disease-regimens.csv` — one row per medicine in a non-empty prescription example
- `data/disease-regimens.md` — this summary

## Safety and scope

1. **Reference examples, not prescriptions.** Doses are teaching ranges only. The disease page
   prints the disclaimer and the review panel checks age bands, renal adjustments, interactions
   and duplication. A clean check does not establish that a medicine is appropriate for a patient.
2. **Do not add medicines to reach a count.** ENT and ophthalmic examples show only medicines that
   may be indicated. Paediatric examples are child-only and intentionally have no prefilled drugs;
   weight-based decisions, supportive care, procedures and referral stay in the clinical entry.
3. The application is **not a medical device** and is not clinically certified. Follow the
   national formulary, local antimicrobial policy, patient-specific assessment and specialist advice.

## Disclaimer

Synthetic demonstration and teaching dataset. Confirm any medicine against the national formulary,
renal and hepatic adjustment guidance, allergies and the prescriber's judgement before use.
