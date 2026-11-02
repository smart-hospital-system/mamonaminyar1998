# Age- and sex-stratified clinical catalogue examples

**Generated:** 2026-11-02T13:01:20.987Z · **Conditions:** 537 · **Synthetic patient examples:** 3222 · **Prescription examples:** 3012 · **Prescription lines:** 12324

Each condition has one synthetic patient example for each sex in each band: child (< 18), adult
(18–70) and older adult (71–90). Cases with no routine medicine have **no prescription example**;
procedural or supportive treatment remains in the clinical entry. The original catalogue recipes
retain their historical 4–6-line teaching format. The ENT chapter opts out of automatic fill-in:
only medicines that may be indicated are shown, and some ENT cases correctly have none.

| Band | Synthetic patient examples |
| --- | --- |
| < 18 years | 1074 |
| 18–70 years | 1074 |
| 71–90 years | 1074 |

| Sex | Synthetic patient examples |
| --- | --- |
| female | 1611 |
| male | 1611 |

| Measure | Result |
| --- | --- |
| Medicines per non-empty prescription example (min / max) | 1 / 6 |
| Prescription examples with a liquid preparation | 2982 of 3012 (99%) |
| Child prescription examples with an oral syrup | 978 of 1004 (97%) |
| Prescription examples with an injectable (vial) | 1600 of 3012 (53%) |
| Prescription examples with a safety finding | 234 of 3012 |
| … of those, blocking findings | 0 |
| Total findings raised | 550 |
| Cases without a medication example | 210 |

## Files

- `data/disease-regimens.json` — six synthetic age/sex records per condition, including no-medication cases
- `data/disease-regimens.csv` — one row per medicine in a non-empty prescription example
- `data/disease-regimens.md` — this summary

## Safety and scope

1. **Reference examples, not prescriptions.** Doses are teaching ranges only. The disease page
   prints the disclaimer and the review panel checks age bands, renal adjustments, interactions
   and duplication. A clean check does not establish that a medicine is appropriate for a patient.
2. **Do not add medicines to reach a count.** The ENT chapter can show one indicated medicine or
   none; procedures, hearing support, observation and urgent referral are described in the entry.
3. The application is **not a medical device** and is not clinically certified. Follow the
   national formulary, local antimicrobial policy, patient-specific assessment and specialist advice.

## Disclaimer

Synthetic demonstration and teaching dataset. Confirm any medicine against the national formulary,
renal and hepatic adjustment guidance, allergies and the prescriber's judgement before use.
