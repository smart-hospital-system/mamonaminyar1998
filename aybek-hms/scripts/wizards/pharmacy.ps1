# Pharmacy / stock wizard.
. (Join-Path (Split-Path -Parent $PSScriptRoot) "install\_common.ps1")
. "$PSScriptRoot\_wizard.ps1"

Invoke-DepartmentWizard -Name "PHARMACY" -Path "/hms/pharmacy" -Login "pharmacy@aybek.hospital" -Steps @(
    "Open the Dispensing tab: every signed prescription is waiting there with the patient's name and diagnosis.",
    "Read the prescription before dispensing - allergies are printed on the sheet in red.",
    "Press Dispense. Stock is reduced automatically and the charge is added to the patient account.",
    "Check the Stock tab each morning: red quantities are at or below the reorder level.",
    "Receive deliveries with the 'Receive' button - always enter the batch number and expiry date.",
    "Open the Expiry tab weekly; anything overdue must be quarantined and reported to the owner.",
    "The monitor raises an alarm for expired stock and low stock every 30 minutes - acknowledge it with a note.",
    "Never dispense against an unsigned prescription; if the doctor is unreachable, escalate to the medical director."
)
