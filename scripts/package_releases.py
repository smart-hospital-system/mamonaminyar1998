"""Build separate online/offline setup ZIPs; secrets/runtime data are never collected."""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
from scripts.distribution import make_manifest, source_files

ROOT = Path(__file__).resolve().parents[1]


def build_release(root, destination, mode, wheelhouse=None, public_key=None):
    manifest = make_manifest(root, mode, wheelhouse, public_key)
    destination.parent.mkdir(parents=True, exist_ok=True)
    prefix = 'ASH-Nexus-' + mode.capitalize()
    with ZipFile(destination, 'x', ZIP_DEFLATED) as archive:
        for source in source_files(root):
            archive.write(source, f'{prefix}/{source.relative_to(root).as_posix()}')
        if mode == 'offline':
            for wheel in sorted(wheelhouse.glob('*.whl')):
                archive.write(wheel, f'{prefix}/wheelhouse/{wheel.name}')
        archive.writestr(f'{prefix}/release-manifest.json', json.dumps(manifest, ensure_ascii=False, indent=2))
        start = ('Start with Setup.cmd after extracting ALL files.\n'
                 f'Edition: {mode}\nRequires preinstalled Windows x64 CPython 3.11 x64.\n'
                 'This is a ZIP with a browser-based setup wizard, NOT a compiled standalone Setup.exe.\n'
                 'No Python runtime installer is bundled.\n'
                 f'Activation: {manifest["activation_mode"]}. See docs/INSTALLERS_FA.md.\n'
                 'Online means downloading dependencies, NOT cloud hosting.\n')
        archive.writestr(f'{prefix}/START-HERE.txt', start)
    value = hashlib.sha256(destination.read_bytes()).hexdigest()
    destination.with_suffix(destination.suffix + '.sha256.txt').write_text(f'{value}  {destination.name}\n')
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'releases')
    parser.add_argument('--wheelhouse', type=Path, required=True)
    parser.add_argument('--public-key', type=Path, help='Optional issuer public key ONLY; enables signed-license edition')
    args = parser.parse_args()
    public = args.public_key.read_text().strip() if args.public_key else None
    for mode in ('online', 'offline'):
        destination = args.output / f'ASH-Nexus-{mode.capitalize()}-Setup-win64-py311.zip'
        build_release(ROOT, destination, mode, args.wheelhouse, public)
        print('Built:', destination)


if __name__ == '__main__':
    main()
