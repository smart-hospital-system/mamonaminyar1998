# Inpatient / ward wizard.
. (Join-Path (Split-Path -Parent $PSScriptRoot) "install\_common.ps1")
. "$PSScriptRoot\_wizard.ps1"

Invoke-DepartmentWizard -Name "INPATIENTS / WARD" -Path "/hms/inpatients" -Login "nurse@aybek.hospital" -Steps @(
    "Open the bed board at the start of every shift: green beds are ready, red are occupied, amber are being cleaned.",
    "To admit: tap a green bed, choose the patient, write the working diagnosis and the admission type.",
    "To move a patient: tap the occupied bed and choose the destination - the old bed goes to cleaning automatically.",
    "To discharge: press Discharge on the bed card; the bed is released for housekeeping at once.",
    "Press the amber bed when cleaning is finished - it turns green and can be used again.",
    "Beds stuck 'cleaning' for more than six hours are flagged by the monitor as a housekeeping delay.",
    "Vitals belong in the OPD consult room: open the patient, run a consult, and the chart records the trend.",
    "Check the ward round list against the theatre list every evening so no post-operative patient is missed."
)
