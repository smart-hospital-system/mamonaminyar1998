"""One-use, loopback-only installer wizard. Runs BEFORE third-party dependencies.

No unauthenticated setup API is added to the hospital server. A random in-memory
capability is passed via URL fragment, never query strings or request logs.
"""
import argparse
import base64
import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import secrets
import shutil
import struct
import subprocess
import sys
import threading
import time
import uuid
import webbrowser

from scripts.distribution import load_manifest, safe_member, verify_files

ROOT = Path(__file__).resolve().parents[1]


class SetupError(ValueError):
    """Only developer-authored, non-secret messages may be returned to the UI."""


def default_destination():
    base = Path(os.environ.get('LOCALAPPDATA', Path.home() / 'Applications'))
    return base / 'ASH-Nexus'


def check_target(source, value):
    if not isinstance(value, str) or not value.strip() or len(value) > 1000:
        raise SetupError('پوشهٔ نصب معتبر انتخاب کنید.')
    target = Path(value).expanduser().resolve()
    if target == Path(target.anchor) or target.is_relative_to(source.resolve()) or source.resolve().is_relative_to(target):
        raise SetupError('پوشهٔ جدیدی بیرون از پوشهٔ بسته انتخاب کنید.')
    if target.exists() and (not target.is_dir() or any(target.iterdir())):
        raise SetupError('مقصد باید خالی باشد؛ نصب قبلی یا اطلاعات موجود بازنویسی نمی‌شود.')
    ancestor = target.parent
    while not ancestor.exists():
        ancestor = ancestor.parent
    if not os.access(ancestor, os.W_OK):
        raise SetupError('اجازهٔ نوشتن در مسیر انتخاب‌شده وجود ندارد.')
    if shutil.disk_usage(ancestor).free < 300 * 1024 * 1024:
        raise SetupError('حداقل ۳۰۰ مگابایت فضای خالی لازم است.')
    return target


def create_shortcut(target):
    if os.name != 'nt':
        return False
    # Encode the entire script and escape literals; no untrusted shell interpolation.
    literal = str(target).replace("'", "''")
    script = ("$w=New-Object -ComObject WScript.Shell; "
              "$d=[Environment]::GetFolderPath('Desktop'); "
              "$s=$w.CreateShortcut((Join-Path $d 'ASH Nexus.lnk')); "
              f"$s.TargetPath='{literal}\\Start-Hospital.cmd'; $s.WorkingDirectory='{literal}'; "
              "$s.Description='ASH Nexus Hospital'; $s.Save()")
    encoded = base64.b64encode(script.encode('utf-16-le')).decode()
    result = subprocess.run(['powershell.exe', '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
                            capture_output=True, timeout=30)
    return result.returncode == 0


class SetupState:
    def __init__(self, root=ROOT, runner=None):
        self.root = root.resolve()
        self.manifest = load_manifest(self.root)
        self.token = secrets.token_urlsafe(48)
        self.installation_id = str(uuid.uuid4())
        self.lock = threading.Lock()
        self.phase = 'idle'
        self.percent = 0
        self.message = 'آمادهٔ بررسی سیستم'
        self.target = None
        self.warning = ''
        self.runner = runner or subprocess.run
        self.launched = False

    def public(self):
        with self.lock:
            return {'phase': self.phase, 'percent': self.percent, 'message': self.message,
                    'warning': self.warning, 'installation_id': self.installation_id,
                    'mode': self.manifest['mode'], 'activation_mode': self.manifest['activation_mode'],
                    'default_target': str(default_destination()), 'target': str(self.target) if self.target else None,
                    'version': self.manifest['version'], 'python': sys.version.split()[0],
                    'windows_target': self.manifest.get('runtime') != 'development'}

    def progress(self, phase, percent, message):
        with self.lock:
            self.phase, self.percent, self.message = phase, percent, message

    def preflight(self, destination):
        if self.manifest.get('runtime') == 'windows-cpython311-x64':
            if sys.platform != 'win32' or sys.version_info[:2] != (3, 11) or struct.calcsize('P') != 8:
                raise SetupError('این بسته به Windows x64 و CPython 3.11 x64 نیاز دارد؛ Python داخل بسته نیست.')
        elif sys.version_info < (3, 11):
            raise SetupError('Python 3.11 یا بالاتر لازم است.')
        target = check_target(self.root, destination)
        try:
            verify_files(self.root, self.manifest)
        except ValueError as error:
            raise SetupError('فایل‌های بسته ناقص یا تغییر کرده‌اند؛ بسته را دوباره استخراج کنید.') from error
        return {'ok': True, 'target': str(target), 'checks': [
            'نسخه و معماری Python بررسی شد', 'فضا و مسیر نصب مناسب است', 'فایل‌های بسته با فهرست SHA-256 مطابقت دارند',
            'دیتابیس یا نصب قبلی بازنویسی نمی‌شود',
            'نصب فقط از wheelhouse انجام می‌شود' if self.manifest['mode'] == 'offline' else 'این نصب برای دانلود وابستگی‌ها به اینترنت نیاز دارد',
        ]}

    def begin(self, payload):
        if not isinstance(payload, dict):
            raise SetupError('درخواست معتبر نیست.')
        # A failed activation can retry only inside the same wizard and same target.
        with self.lock:
            retry = self.phase == 'needs_activation'
            if self.phase not in ('idle', 'needs_activation'):
                raise SetupError('نصب شروع شده یا تمام شده؛ نصب موازی مجاز نیست.')
            destination = Path(payload.get('target', '')).expanduser().resolve()
            if retry and destination != self.target:
                raise SetupError('برای ادامهٔ فعال‌سازی، مسیر همین نصب را نگه دارید.')
            if not retry:
                self.target = Path(self.preflight(payload.get('target', ''))['target'])
            if len(json.dumps(payload, ensure_ascii=False)) > 40000:
                raise SetupError('درخواست بیش از حد بزرگ است.')
            self.phase, self.message = 'installing', 'آغاز نصب…'
        thread = threading.Thread(target=self.install, args=(payload, retry), daemon=False)
        thread.start()
        return thread

    def run(self, args, **kwargs):
        env = {key: value for key, value in os.environ.items() if key not in ('PYTHONHOME', 'PYTHONPATH', 'ASH_DB_PATH')}
        env['PYTHONUTF8'] = '1'
        result = self.runner(args, cwd=str(self.target), env=env, capture_output=True, text=True,
                             timeout=kwargs.pop('timeout', 600), encoding='utf-8', errors='replace', **kwargs)
        if result.returncode:
            raise RuntimeError('نصب وابستگی‌ها ناموفق بود. اتصال/نسخهٔ Python و کامل‌بودن بسته را بررسی کنید؛ نصب قبلی تغییر نکرده است.')
        return result

    def install(self, payload, retry=False):
        try:
            target = self.target
            python = target / '.venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
            if not retry:
                self.progress('installing', 8, 'بررسی دوباره و کپی فایل‌های برنامه…')
                # Refuse a destination populated between preflight and install.
                check_target(self.root, str(target))
                verify_files(self.root, self.manifest)
                target.mkdir(parents=True, exist_ok=True)
                for name in self.manifest['files']:
                    source, output = safe_member(self.root, name), safe_member(target, name)
                    output.parent.mkdir(parents=True, exist_ok=True)
                    with source.open('rb') as src, output.open('xb') as dst:
                        shutil.copyfileobj(src, dst)
                (target / 'release-manifest.json').write_text(json.dumps(self.manifest, ensure_ascii=False, indent=2), encoding='utf-8')
                self.progress('installing', 25, 'ساخت محیط مستقل برنامه…')
                self.run([sys.executable, '-m', 'venv', str(target / '.venv')])
                pip = [str(python), '-m', 'pip', '--isolated', '--disable-pip-version-check', 'install', '--only-binary=:all:',
                       '-r', 'requirements.txt', '-c', 'requirements-tested.txt']
                if self.manifest['mode'] == 'offline':
                    pip.extend(['--no-index', '--find-links', str(target / 'wheelhouse')])
                else:
                    pip.extend(['--index-url', 'https://pypi.org/simple', '--no-cache-dir'])
                self.progress('installing', 40, 'نصب آفلاین وابستگی‌ها…' if self.manifest['mode'] == 'offline' else 'دریافت و نصب وابستگی‌ها از PyPI…')
                self.run(pip)
                self.run([str(python), '-m', 'pip', '--isolated', 'check'])
            self.progress('installing', 80, 'بررسی فعال‌سازی و ساخت امن حساب مدیر…')
            # Only stdin carries the password; neither argv, logs nor a temporary file does.
            result = self.runner([str(python), '-m', 'scripts.setup_finalize'], cwd=str(target),
                                 env={**{k:v for k,v in os.environ.items() if k not in ('PYTHONHOME','PYTHONPATH','ASH_DB_PATH')}, 'PYTHONUTF8':'1'},
                                 input=json.dumps({'payload': payload, 'manifest': self.manifest, 'installation_id': self.installation_id}),
                                 capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=90)
            try:
                answer = json.loads(result.stdout)
            except ValueError:
                answer = {'ok': False, 'message': 'فعال‌سازی تکمیل نشد؛ هیچ رمزی در گزارش‌ها ذخیره نشده است.'}
            if result.returncode or not answer.get('ok'):
                self.progress('needs_activation', 80, answer.get('message', 'اطلاعات فعال‌سازی را بررسی و دوباره وارد کنید.'))
                return
            self.progress('installing', 95, 'آزمون دیتابیس و آماده‌سازی اجرای برنامه…')
            self.run([str(python), '-c', "from backend.app.models import Base; from sqlalchemy.orm import configure_mappers; configure_mappers(); from backend.app.main import create_app; print('OK')"], timeout=60)
            marker = {'version': self.manifest['version'], 'mode': self.manifest['mode'],
                      'activation_mode': self.manifest['activation_mode'], 'installation_id': self.installation_id,
                      'installed_at': int(time.time()), 'ready': True}
            (target / '.ash-install.json').write_text(json.dumps(marker), encoding='utf-8')
            if payload.get('desktop_shortcut') is True:
                try:
                    if not create_shortcut(target):
                        self.warning = 'نصب موفق است؛ میانبر ساخته نشد. از Start-Hospital.cmd استفاده کنید.'
                except Exception:
                    self.warning = 'نصب موفق است؛ ساخت میانبر ممکن نشد. از Start-Hospital.cmd استفاده کنید.'
            self.progress('ready', 100, 'نصب و راه‌اندازی اولیه با موفقیت تکمیل شد.')
        except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
            # Only our known generic validation strings are surfaced; no raw subprocess output.
            message = str(error) if isinstance(error, (ValueError, RuntimeError)) else 'نصب تکمیل نشد؛ دسترسی فایل‌ها و پیش‌نیازها را بررسی کنید.'
            self.progress('failed', self.percent, message)
        finally:
            payload.clear()

    def launch(self):
        with self.lock:
            if self.phase != 'ready' or self.launched:
                raise SetupError('برنامه هنوز آماده نیست یا قبلاً اجرا شده است.')
            python = self.target / '.venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
            subprocess.Popen([str(python), '-m', 'scripts.launcher'], cwd=str(self.target),
                             creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0)
            self.launched = True


def make_server(state, port=0):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def respond(self, code, value, content_type='application/json; charset=utf-8'):
            data = json.dumps(value, ensure_ascii=False).encode() if content_type.startswith('application/json') else value
            self.send_response(code)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
            self.end_headers()
            self.wfile.write(data)

        def authorized(self):
            host = f'127.0.0.1:{self.server.server_port}'
            if self.headers.get('Host') != host:
                self.respond(403, {'message':'میزبان درخواست معتبر نیست.'})
                return False
            origin = self.headers.get('Origin')
            if (origin and origin != 'http://' + host) or self.headers.get('Sec-Fetch-Site') == 'cross-site':
                self.respond(403, {'message':'درخواست از مبدأ دیگر پذیرفته نمی‌شود.'})
                return False
            if not hmac.compare_digest(self.headers.get('Authorization', '').encode(), ('Bearer ' + state.token).encode()):
                self.respond(401, {'message':'دسترسی ویزارد معتبر نیست؛ آن را از Setup.cmd باز کنید.'})
                return False
            return True

        def do_GET(self):
            if self.path == '/api/status':
                if self.authorized():
                    self.respond(200, state.public())
                return
            assets = {'/': ('index.html', 'text/html; charset=utf-8'),
                      '/setup.css': ('setup.css', 'text/css; charset=utf-8'),
                      '/setup.js': ('setup.js', 'text/javascript; charset=utf-8')}
            entry = assets.get(self.path)
            if not entry:
                self.respond(404, {'message':'پیدا نشد.'})
                return
            # Entry page is public loopback-only, but it never includes a token or credentials.
            self.respond(200, (state.root / 'installer' / entry[0]).read_bytes(), entry[1])

        def do_POST(self):
            if not self.authorized():
                return
            try:
                if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                    raise SetupError('بدنهٔ JSON لازم است.')
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 65536:
                    raise SetupError('اندازهٔ درخواست معتبر نیست.')
                payload = json.loads(self.rfile.read(length))
                if not isinstance(payload, dict):
                    raise SetupError('درخواست معتبر نیست.')
                if self.path == '/api/preflight':
                    self.respond(200, state.preflight(payload.get('target', '')))
                elif self.path == '/api/install':
                    state.begin(payload)
                    self.respond(202, {'ok':True})
                elif self.path == '/api/launch':
                    state.launch()
                    self.respond(200, {'ok':True})
                else:
                    self.respond(404, {'message':'مسیر موجود نیست.'})
            except SetupError as error:
                self.respond(400, {'message':str(error)})
            except (ValueError, TypeError, OSError):
                # Do not echo arbitrary request strings (especially credentials).
                self.respond(400, {'message':'عملیات پذیرفته نشد؛ مسیر، پیش‌نیازها و وضعیت نصب را بررسی کنید.'})

    return ThreadingHTTPServer(('127.0.0.1', port), Handler)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=0)
    parser.add_argument('--no-browser', action='store_true')
    parser.add_argument('--online',action='store_true',help='Unified package: explicitly download dependencies instead of using wheels')
    args = parser.parse_args()
    state = SetupState()
    if args.online:
        state.manifest=dict(state.manifest,mode='online')
    server = make_server(state, args.port)
    url = f'http://127.0.0.1:{server.server_port}/#token={state.token}'
    print('ASH Nexus Setup — keep this window open. Ctrl+C to close.')
    print('Open locally (do not share this one-use link):', url)
    if not args.no_browser:
        webbrowser.open(url)
    # A dormant capability does not remain valid indefinitely; an active install finishes.
    def expire():
        if state.phase != 'installing':
            server.shutdown()
        else:
            timer = threading.Timer(300, expire)
            timer.daemon = True
            timer.start()
    timer = threading.Timer(3600, expire)
    timer.daemon = True
    timer.start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        timer.cancel()
        server.server_close()


if __name__ == '__main__':
    main()
