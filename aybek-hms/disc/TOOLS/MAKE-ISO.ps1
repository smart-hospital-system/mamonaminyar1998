<#
.SYNOPSIS
  Turns a disc folder into an .iso image, and optionally burns it.

.DESCRIPTION
  Uses the IMAPI2 component that is built into Windows, so nothing has to be
  installed. Running with -Burn writes the image straight to an empty CD/DVD
  in the drive you name.

.PARAMETER Source
  The disc folder. Defaults to the folder that contains this TOOLS folder.

.PARAMETER Iso
  Where to write the .iso file. Defaults to a file next to the disc folder.

.PARAMETER Burn
  After building the image, burn it to the disc in -Drive.

.PARAMETER Drive
  Drive letter of the writer, for example "E:". Only used with -Burn.

.EXAMPLE
  .\MAKE-ISO.ps1 -Iso "D:\Aybek-Hospital-HMS-v4.iso"

.EXAMPLE
  .\MAKE-ISO.ps1 -Iso "D:\Aybek.iso" -Burn -Drive "E:"

.NOTES
  If burning fails, close any program that is using the drive, insert a blank
  disc, and try again - or right-click the .iso in Windows Explorer and choose
  "Burn disc image".
#>

param(
    [string]$Source,
    [string]$Iso,
    [switch]$Burn,
    [string]$Drive,
    [string]$VolumeName = "AYBEK_HMS_V4"
)

$ErrorActionPreference = "Stop"

function Say($msg)  { Write-Host "  $msg" }
function Ok($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "  [!]  $msg" -ForegroundColor Yellow }
function Die($msg)  { Write-Host "  [X]  $msg" -ForegroundColor Red; exit 1 }

if (-not $Source) { $Source = Split-Path $PSScriptRoot -Parent }
if (-not (Test-Path -LiteralPath $Source)) { Die "Disc folder not found: $Source" }
$Source = (Resolve-Path -LiteralPath $Source).Path

if (-not $Iso) {
    $Iso = Join-Path (Split-Path $Source -Parent) ((Split-Path $Source -Leaf) + ".iso")
}

Write-Host ""
Write-Host "  AYBEK HOSPITAL - BUILD DISC IMAGE" -ForegroundColor Cyan
Write-Host "  ---------------------------------"
Say "Source : $Source"
Say "Image  : $Iso"
Write-Host ""

# ------------------------------------------------------------------ size check
$bytes = (Get-ChildItem -LiteralPath $Source -Recurse -File | Measure-Object -Property Length -Sum).Sum
$mb = [math]::Round($bytes / 1MB, 1)
Say ("Content: {0} MB" -f $mb)
if ($mb -gt 700) {
    Warn "This is larger than a 700 MB CD. Use a DVD, or a dual-layer disc for more than 4.7 GB."
}

# ------------------------------------------------------------------ build image
Say "Building the file system image ..."
try {
    $fsi = New-Object -ComObject IMAPI2FS.MsftFileSystemImage
    $fsi.FileSystemsToCreate = 3          # ISO9660 + Joliet (long file names)
    $fsi.VolumeName = $VolumeName
    $fsi.Root.AddTree($Source, $false)
    $result = $fsi.CreateResultImage()
}
catch {
    Die ("Windows could not build the image: " + $_.Exception.Message)
}

$stream = $result.ImageStream
if (Test-Path -LiteralPath $Iso) { Remove-Item -LiteralPath $Iso -Force }

Say "Writing $Iso ..."
$buffer = New-Object byte[] 524288
$read = 0
$out = [System.IO.File]::Create($Iso)
try {
    while ($true) {
        $stream.Read($buffer, $buffer.Length, [ref]$read)
        if ($read -le 0) { break }
        $out.Write($buffer, 0, $read)
    }
}
finally {
    $out.Close()
}

$isoSize = [math]::Round((Get-Item -LiteralPath $Iso).Length / 1MB, 1)
Ok ("Image written: {0} MB" -f $isoSize)

# ------------------------------------------------------------------ checksum
$hash = (Get-FileHash -LiteralPath $Iso -Algorithm SHA256).Hash
Say "SHA-256: $hash"

# ------------------------------------------------------------------ burning
if (-not $Burn) {
    Write-Host ""
    Write-Host "  How to burn it by hand:" -ForegroundColor Cyan
    Say "1. Insert a blank CD or DVD."
    Say "2. In Windows Explorer, right-click the .iso file."
    Say "3. Choose 'Burn disc image', pick the drive, press Burn."
    Write-Host ""
    exit 0
}

if (-not $Drive) { Die "Give the writer drive letter, for example: -Drive E:" }
$Drive = $Drive.TrimEnd('\')
if ($Drive -notmatch '^[A-Za-z]:$') { Die "Drive must look like E:" }

Say "Looking for the writer in $Drive ..."
try {
    $discMaster = New-Object -ComObject IMAPI2.MsftDiscMaster2
    $recorder = $null
    for ($i = 0; $i -lt $discMaster.Count; $i++) {
        $id = $discMaster.Item($i)
        $candidate = New-Object -ComObject IMAPI2.MsftDiscRecorder2
        $candidate.InitializeDiscRecorder($id)
        foreach ($path in $candidate.VolumePathNames) {
            if ($path -eq $Drive) { $recorder = $candidate }
        }
    }
    if (-not $recorder) { Die "No writer found on $Drive. Check the drive letter with: Get-Volume" }

    $format = New-Object -ComObject IMAPI2.MsftDiscFormat2Data
    $format.Recorder = $recorder
    $format.ClientName = "Aybek Hospital"
    $format.BurnVerificationEnabled = $true

    if (-not $format.IsCurrentMediaSupported($recorder)) {
        Die "The disc in $Drive cannot be written. Insert a blank CD-R/DVD-R and try again."
    }

    Say "Burning ... this can take several minutes. Do not open the drive."
    $stream.Seek(0, 0) | Out-Null
    $format.Write($stream)
    Ok "Disc burned and verified."
}
catch {
    Warn ("Burning stopped: " + $_.Exception.Message)
    Say  "The .iso file is still complete: $Iso"
    Say  "Right-click it in Windows Explorer and choose 'Burn disc image'."
    exit 1
}

Write-Host ""
Say "Done. Label the disc: Aybek HMS v4 - $(Get-Date -Format 'yyyy-MM-dd')"
