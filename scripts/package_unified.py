"""One allowlisted Windows package; offline default, optional online dependency install."""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from scripts.distribution import make_manifest,source_files

ROOT=Path(__file__).resolve().parents[1]
PREFIX='Mamonaminyar-HMS-Print-Design-v4'


def build(root,destination,wheelhouse,public_key=None):
    manifest=make_manifest(root,'offline',wheelhouse,public_key)
    manifest['package_kind']='unified'
    destination.parent.mkdir(parents=True,exist_ok=True)
    with ZipFile(destination,'x',ZIP_DEFLATED) as archive:
        for file in source_files(root):
            archive.write(file,f'{PREFIX}/{file.relative_to(root).as_posix()}')
        for wheel in sorted(wheelhouse.glob('*.whl')):
            archive.write(wheel,f'{PREFIX}/wheelhouse/{wheel.name}')
        archive.writestr(f'{PREFIX}/release-manifest.json',json.dumps(manifest,ensure_ascii=False,indent=2))
        archive.writestr(f'{PREFIX}/START-HERE.txt',
            'ASH Nexus 0.5.0-dev.1 — SQLITE INSTALLER + ENTERPRISE DEVELOPMENT SOURCE / SAME HOSPITAL FEATURES\n'
            'Read docs/UPGRADE_V04_FA.html first (Persian/Dari).\n'
            'Tailwind UI: docs/TAILWIND_FA.md; prebuilt CSS included. No Node.js needed to run SQLite.\n'
            'PostgreSQL/Compose phase 1: docs/ENTERPRISE_PHASE1_FA.md. Docker images and optional PG driver are NOT bundled for offline installation.\n'
            'Extract ALL files. Requires preinstalled Windows CPython 3.11 x64.\n'
            'Setup.cmd uses bundled wheels offline by default.\n'
            'Optional online install: powershell/02-Install-Hospital.ps1 -Online\n'
            'No standalone EXE, Python installer, cloud hosting or real patient database is bundled.\n'
            'Demo data is created locally, in a NEW separate database, by script 04.\n'
            'No preset password or issuer private key is included.\n'
            'Ten numbered automation scripts are in powershell/. Legacy helpers remain in scripts/.\n'
            f'Activation: {manifest["activation_mode"]}. See owner licensing guide.\n')
    digest=hashlib.sha256(destination.read_bytes()).hexdigest()
    destination.with_suffix(destination.suffix+'.sha256.txt').write_text(f'{digest}  {destination.name}\n')
    return manifest


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output',type=Path,required=True)
    p.add_argument('--wheelhouse',type=Path,required=True)
    p.add_argument('--public-key',type=Path)
    args=p.parse_args()
    public=args.public_key.read_text().strip() if args.public_key else None
    build(ROOT,args.output,args.wheelhouse,public)
    print('Unified package created:',args.output)


if __name__=='__main__':
    main()
