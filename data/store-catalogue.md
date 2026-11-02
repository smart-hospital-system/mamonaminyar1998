# Hospital store catalogue — 1000 lines

**Generated:** 2026-11-01T18:22:45.964Z · **Reference date:** 2026-11-01 · **Stock value:** 291229 AFN (indicative)

Two distributions run at the same time, and both are exact.

## By therapeutic area

| Area | Items | Share | Requested | دری |
| --- | --- | --- | --- | --- |
| Urinary, sexual & digestive | 273 | 27.3% | 273 | بولی، تناسلی و هضمی |
| Respiratory & cardiac | 182 | 18.2% | 182 | تنفسی و قلبی |
| Surgery & anaesthesia | 91 | 9.1% | 91 | جراحی و انستیزی |
| Ear, nose & throat | 91 | 9.1% | 91 | گوش، گلو و بینی |
| Eye & skin | 91 | 9.1% | 91 | چشم و جلدی |
| Obstetric & newborn | 45 | 4.5% | 45 | نسایی و نوزاد |
| Traffic, forensic & emergency | 45 | 4.5% | 45 | حادثات، جنایی و عاجل |
| Orthopaedic | 91 | 9.1% | 91 | ارتوپیدی |
| Endocrine & blood | 91 | 9.1% | 91 | اندوکراین و خون |

## By dosage form / supply group

| Form group | Items | Share | Requested | دری |
| --- | --- | --- | --- | --- |
| Tablet / capsule / effervescent / oral sachet | 300 | 30.0% | 300 | تابلیت، کپسول، جوشی، ساشه |
| Syrup / suspension / drops / inhaler | 200 | 20.0% | 200 | شربت، سوسپانسیون، قطره، انهیلر |
| Ointment / cream / gel / lotion / eye drops | 100 | 10.0% | 100 | مرحم، کریم، جیل، لوشن، قطرهٔ چشم |
| Vial / ampoule / prefilled syringe | 100 | 10.0% | 100 | ویال، امپول، سرنج آماده |
| Gloves, mask, cap, pack, tube, catheter | 100 | 10.0% | 100 | دستکش، ماسک، کلاه، پک، تیوب، کاتتر |
| Shampoo, soap, pampers, sanitizer | 100 | 10.0% | 100 | شامپو، صابون، پمپر، ضدعفونی |
| Dressing, strips, thermometer, masks, splint | 100 | 10.0% | 100 | پانسمان، نوار تست، ترمومتر، ماسک، آتل |

## Expiry

| Bucket | Items |
| --- | --- |
| Near expiry — 60 to 90 days | 100 |
| 2028 | 259 |
| 2029 | 260 |
| 2030 | 258 |
| 2031 | 123 |

Every line not in the near-expiry batch expires on or after **2028-01-01** (spread to June 2031).
The near-expiry batch expires in **60–90 days** from the reference date — that is the group the
alert screen is meant to catch. 101 lines are below their reorder level.

## Files

- `data/store-catalogue.json` — every field, per line
- `data/store-catalogue.csv` — flat table for Excel
- `data/store-catalogue.md` — this summary

## Disclaimer

Demonstration inventory for training and software testing. Batch numbers, manufacturers,
prices and quantities are synthetic. Expiry dates are anchored to a fixed reference date so the
alert screens always have something to show; they are not a real stock record.
