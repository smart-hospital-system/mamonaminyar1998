"""Export committed development source, not an offline installer or a live hospital backup.

Excludes historical releases and refuses runtime data/secrets. Uses Git blobs rather
than working files, so a hospital's ignored database/env/uploads cannot be copied.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FORBIDDEN = {'.git', 'node_modules', '.venv', '.next', '.cache', '.data', 'backups', 'logs', 'uploads', '__pycache__'}


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True, help='NEW .zip destination')
    args = parser.parse_args()
    output = args.output.resolve()
    checksum = Path(str(output) + '.sha256.txt')
    if output.suffix.lower() != '.zip' or output.exists() or checksum.exists():
        raise ValueError('Choose a NEW ZIP path; outputs/checksums are never overwritten')
    if git('diff', 'HEAD', '--name-only').strip():
        raise ValueError('Commit reviewed source changes first; archive exports HEAD only')
    commit = git('rev-parse', 'HEAD').decode().strip()
    entries = []
    for row in git('ls-tree', '-rz', '--full-tree', 'HEAD').split(b'\0'):
        if not row:
            continue
        metadata, raw_path = row.split(b'\t', 1)
        mode, kind, oid = metadata.decode().split()
        name = raw_path.decode('utf-8')
        file = PurePosixPath(name)
        if file.parts[0] == 'releases':
            continue
        if kind != 'blob' or mode not in {'100644', '100755'}:
            raise ValueError(f'Unsupported source entry: {name}')
        if FORBIDDEN.intersection(file.parts) or '..' in file.parts or file.is_absolute():
            raise ValueError(f'Runtime/private path may not be packaged: {name}')
        if file.name.startswith('.env') and file.name != '.env.example':
            raise ValueError(f'Private environment path may not be packaged: {name}')
        if file.suffix.lower() in {'.sqlite', '.sqlite3', '.pem', '.key', '.dump', '.pgpass'} or name.endswith(('-wal', '-shm', '-journal')):
            raise ValueError(f'Private/database path may not be packaged: {name}')
        if file.suffix.lower() == '.db' and name != 'data/demo-hospital.db':
            raise ValueError('Only the explicitly tracked synthetic demo DB is allowed')
        entries.append((name, mode, oid))
    manifest = {'kind': 'committed-source-only-not-offline-installer', 'commit': commit, 'files': []}
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for name, mode, oid in entries:
            content = git('cat-file', 'blob', oid)
            info = zipfile.ZipInfo(name)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = int(mode, 8) << 16
            bundle.writestr(info, content)
            manifest['files'].append({'path': name, 'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest()})
        bundle.writestr('SOURCE-MANIFEST.json', json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        bundle.writestr('SOURCE-BUNDLE-NOTES.txt',
            'REPAIRED DEVELOPMENT SOURCE ONLY — NOT A CLINICALLY VALIDATED PRODUCT\n'
            'دو برنامه مستقل‌اند. این سورس نصب‌کنندهٔ کامل آفلاین نیست.\n'
            'Start with docs/REPAIR_AUDIT_2026-11-02_FA.md and docs/APPLICATION_COEXISTENCE.md.\n'
            'Next.js: Node 22.13+, npm ci, then npm run deploy (port 3000).\n'
            'ASH: Python prerequisites; docs/SETUP_FA.md (port 8000). Different DB/auth.\n'
            'Dependencies/runtimes are NOT bundled. First dependency installation needs a network or a separately verified offline cache.\n'
            'Only the committed synthetic demo DB is included. Published demo passwords must be changed.\n'
            'No live DB, private .env, uploads, runtime, node_modules, .git or historical ZIPs are included.\n'
            'Native Windows/printer/clinical validation and Next historical print snapshots remain outstanding.\n'
            f'Source commit: {commit}\n')
    with zipfile.ZipFile(output) as bundle:
        if bundle.testzip() is not None:
            raise ValueError('Archive CRC verification failed; inspect new output')
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    with checksum.open('x', encoding='utf-8') as handle:
        handle.write(f'{digest}  {output.name}\n')
    print(f'Exported {len(entries)} committed source files; CRC verified; {output.stat().st_size:,} bytes')
    print(f'SHA-256: {digest}')
    print('Source only, not a complete offline/native-Windows/clinically validated installer.')


if __name__ == '__main__':
    main()
