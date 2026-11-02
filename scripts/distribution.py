"""Standard-library release manifest/allowlist, shared by packager and setup wizard."""
import base64
import hashlib
import json
from pathlib import Path, PurePosixPath

PRODUCT = 'ASH-NEXUS-HMS'
DIRECTORIES = ('backend', 'frontend', 'installer', 'scripts', 'docs', 'tests', 'powershell', 'docker', '.github')
FILES = ('README.md', 'LICENSE', 'requirements.txt', 'requirements-dev.txt', 'requirements-tested.txt',
         'requirements-enterprise.txt', 'Dockerfile', 'compose.yaml', '.dockerignore', 'package.json', 'package-lock.json', '.gitignore', 'Setup.cmd', 'Start-Hospital.cmd')
SUFFIXES = {'.py', '.js', '.cjs', '.html', '.css', '.md', '.txt', '.ps1', '.psm1', '.cmd', '.sql', '.yml', '.yaml'}


def source_files(root):
    result = []
    for directory in DIRECTORIES:
        for path in (root / directory).rglob('*'):
            if path.is_file() and not path.is_symlink() and '__pycache__' not in path.parts and path.suffix in SUFFIXES:
                result.append(path)
    result.extend(root / name for name in FILES if (root / name).is_file())
    return sorted(result)


def checksum(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def safe_member(root, name):
    member = PurePosixPath(name)
    if not name or member.is_absolute() or '..' in member.parts or '\\' in name or ':' in name:
        raise ValueError('مسیر ناامن در فهرست بسته.')
    path = root.joinpath(*member.parts)
    if not path.resolve().is_relative_to(root.resolve()) or path.is_symlink():
        raise ValueError('مسیر فایل از بسته خارج است.')
    return path


def make_manifest(root, mode, wheelhouse=None, public_key=None):
    if mode not in ('online', 'offline'):
        raise ValueError('Unknown installer mode')
    sources = {path.relative_to(root).as_posix(): checksum(path) for path in source_files(root)}
    if mode == 'offline':
        if not wheelhouse:
            raise ValueError('Offline release requires a wheelhouse')
        wheels = sorted(wheelhouse.glob('*.whl'))
        if not wheels:
            raise ValueError('Wheelhouse is empty')
        sources.update({f'wheelhouse/{path.name}': checksum(path) for path in wheels})
    if public_key:
        if len(base64.b64decode(public_key, validate=True)) != 32:
            raise ValueError('An Ed25519 public key (32 bytes, base64) is required')
    return {'format': 1, 'product': PRODUCT, 'version': '0.5.0-dev.1-enterprise-phase1', 'mode': mode,
            'runtime': 'windows-cpython311-x64', 'activation_mode': 'signed' if public_key else 'local',
            'license_public_key': public_key, 'files': sources}


def load_manifest(root):
    path = root / 'release-manifest.json'
    if not path.exists():
        # Development source, explicitly not a verified Windows release.
        value = make_manifest(root, 'online')
        value['runtime'] = 'development'
        return value
    value = json.loads(path.read_text(encoding='utf-8'))
    if value.get('format') != 1 or value.get('product') != PRODUCT or value.get('mode') not in ('online', 'offline'):
        raise ValueError('فرمت یا نوع بسته پشتیبانی نمی‌شود.')
    if value.get('activation_mode') not in ('local', 'signed') or not isinstance(value.get('files'), dict):
        raise ValueError('فهرست بسته معتبر نیست.')
    required = {'requirements.txt', 'requirements-tested.txt', 'backend/app/main.py', 'scripts/setup_finalize.py', 'Start-Hospital.cmd'}
    if not required.issubset(value['files']):
        raise ValueError('فایل ضروری در فهرست بسته وجود ندارد.')
    return value


def verify_files(root, manifest):
    for name, expected in manifest['files'].items():
        path = safe_member(root, name)
        if not path.is_file() or checksum(path) != expected:
            raise ValueError('بسته ناقص یا تغییر کرده است؛ دوباره از منبع مورد اعتماد دریافت کنید.')
