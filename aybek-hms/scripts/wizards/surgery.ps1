# Theatre / surgery wizard.
. (Join-Path (Split-Path -Parent $PSScriptRoot) "install\_common.ps1")
. "$PSScriptRoot\_wizard.ps1"

Invoke-DepartmentWizard -Name "THEATRE / SURGERY" -Path "/hms/surgery" -Login "yusuf@aybek.hospital" -Steps @(
    "Open the theatre list and confirm the order of cases for tomorrow with anaesthesia.",
    "Book a case with 'Book a case': patient, procedure, theatre, start time, duration and anaesthesia.",
    "Write the pre-op note (consent signed, NPO, group and save) - it prints on the theatre list.",
    "Press Start when the patient is on the table; the ward and the command centre see 'in theatre'.",
    "Press Complete when the patient leaves theatre and file the operation note in the same screen.",
    "Any case still 'scheduled' after its start time is flagged by the monitor as overdue.",
    "Post-op: admit the patient from the bed board, prescribe analgesia, and book the follow-up in OPD.",
    "Cancel a case only with a reason in the note - cancellations are reviewed in the weekly audit."
)
