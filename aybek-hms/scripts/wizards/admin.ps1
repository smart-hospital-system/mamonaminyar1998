# Owner / administrator wizard - the whole hospital.
. (Join-Path (Split-Path -Parent $PSScriptRoot) "install\_common.ps1")
. "$PSScriptRoot\_wizard.ps1"

Invoke-DepartmentWizard -Name "OWNER / ADMINISTRATOR" -Path "/hms" -Login "doctor@aybek.hospital" -Steps @(
    "Open the command centre: every department, the health score and today's money on one screen.",
    "Check the Health monitor card (top-right bell). Critical alarms must be handled before anything else.",
    "Review Settings -> Hospital identity once, so letters and prescriptions carry your legal name and licence number.",
    "Open Settings -> Monitor and confirm the 30-minute scan and 48-hour auto-repair windows.",
    "Open Licence and activate the installation with your serial; generate department serials for other computers.",
    "Use Analytics to see demand, revenue and quality; export patient lists to CSV whenever a ministry report is due.",
    "Run scripts\install\07-backup.ps1 every evening - a backup on the same disk is not a backup.",
    "Read the Guide chapter 'Install the hospital on a new computer' before setting up a second machine."
)
