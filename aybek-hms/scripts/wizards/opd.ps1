# OPD / examinations wizard.
. (Join-Path (Split-Path -Parent $PSScriptRoot) "install\_common.ps1")
. "$PSScriptRoot\_wizard.ps1"

Invoke-DepartmentWizard -Name "OPD / EXAMINATIONS" -Path "/hms/opd" -Login "arash@aybek.hospital" -Steps @(
    "Morning: open OPD and scan today's queue. 'Waiting' patients are physically in the corridor.",
    "Call a patient in with the phone icon; the status changes to waiting and the audit trail records who called.",
    "In the Consult room, choose the patient, type the vitals - triage (NEWS) updates as you type.",
    "Type the working diagnosis, then press 'AI draft' to start the note, choose the print design and pre-fill doses.",
    "Add medicines line by line. The safety panel turns amber or red for interactions, allergies and duplicate therapy.",
    "Press 'Sign & issue'. Nothing can be dispensed before a physician signs.",
    "Send the patient to the pharmacy with the printed prescription (Print opens a clean A4 sheet).",
    "If the patient needs admission, use Inpatients -> tap a free bed -> admit; the bed board updates instantly."
)
