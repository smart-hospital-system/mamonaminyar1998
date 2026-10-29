# Reception / billing wizard.
. (Join-Path (Split-Path -Parent $PSScriptRoot) "install\_common.ps1")
. "$PSScriptRoot\_wizard.ps1"

Invoke-DepartmentWizard -Name "RECEPTION / BILLING" -Path "/hms/patients" -Login "reza@aybek.hospital" -Steps @(
    "Register every new patient with the full name, sex, date of birth and phone. The MRN is issued automatically.",
    "Ask about allergies and type them - the prescription screen checks every drug against them.",
    "Book the appointment in OPD, then send the patient to the waiting area.",
    "Open Billing to raise an invoice: choose consultation, laboratory, imaging or bed charges.",
    "Take full or partial payments - the balance stays on the patient account until it is settled.",
    "Print the receipt with the printer icon; it carries the hospital header and licence number.",
    "Outstanding balances are listed on the command centre every morning - call those patients politely.",
    "Never delete a record. If a registration was wrong, correct it and note why in the patient notes."
)
