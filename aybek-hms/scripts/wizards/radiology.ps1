# Radiology / imaging wizard.
. (Join-Path (Split-Path -Parent $PSScriptRoot) "install\_common.ps1")
. "$PSScriptRoot\_wizard.ps1"

Invoke-DepartmentWizard -Name "RADIOLOGY / X-RAY" -Path "/hms/radiology" -Login "laila@aybek.hospital" -Steps @(
    "Open the imaging worklist: requests, urgent requests in red, and studies already reported.",
    "Press Accept when the patient arrives so the ward can see they are in the department.",
    "Acquire the study, then press Report - a structured template loads for chest, abdomen and CT.",
    "Write findings first, impression second. The impression is what the surgeon reads.",
    "Press 'Sign & release'. The report is attached to the patient chart immediately.",
    "Any study unreported after 36 hours raises an alarm; the monitor will reassign or escalate it.",
    "Keep the modality log with the accession number in case the ministry inspects the department.",
    "Images stay on the modality - the hospital stores the report text, which is what clinicians need."
)
