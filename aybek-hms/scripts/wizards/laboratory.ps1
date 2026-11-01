# Laboratory wizard.
. (Join-Path (Split-Path -Parent $PSScriptRoot) "install\_common.ps1")
. "$PSScriptRoot\_wizard.ps1"

Invoke-DepartmentWizard -Name "LABORATORY" -Path "/hms/lab" -Login "lab@aybek.hospital" -Steps @(
    "Open the worklist. Urgent requests are pinned to the top by the monitor.",
    "Print the collection list, draw the samples, then press Collect on each row.",
    "Open 'Enter result' and type the values exactly as the analyser prints them (e.g. 'Hb 9.1 g/dL').",
    "The assistant parses each analyte and shows low / high / critical flags before you save.",
    "A critical value automatically raises an alarm for the ordering physician - phone them as well.",
    "Press Verify to release the result; it appears instantly in the patient chart and in OPD.",
    "Anything unverified for more than 48 hours is escalated automatically - keep the list empty.",
    "Report analyser faults to the owner and log them in the alarm note so the 48-hour repair is documented."
)
