"""Launch the installed app locally, wait for THIS child's health, then open a browser."""
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser

ROOT = Path(__file__).resolve().parents[1]


def main():
    if not (ROOT / '.data' / 'ash.sqlite3').is_file() and not os.environ.get('ASH_DB_PATH'):
        raise SystemExit('Database missing. Complete Setup.cmd first.')
    # The OS picks a free loopback port; another app's fixed port is never reused blindly.
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 0))
        port = probe.getsockname()[1]
    launch_id = secrets.token_urlsafe(24)
    env = {key:value for key,value in os.environ.items() if key not in ('PYTHONPATH','PYTHONHOME')}
    env['PYTHONUTF8'] = '1'
    env['ASH_LAUNCH_ID'] = launch_id
    env['ASH_DB_PATH'] = str(Path(os.environ.get('ASH_DB_PATH', ROOT / '.data' / 'ash.sqlite3')).resolve())
    # This launcher is loopback HTTP. HTTPS installations must use a managed reverse proxy.
    env['ASH_SECURE_COOKIE'] = '0'
    env.pop('ASH_FRAME_ANCESTORS', None)
    command = [sys.executable, '-m', 'uvicorn', 'backend.app.main:app', '--host', '127.0.0.1', '--port', str(port), '--no-access-log']
    process = subprocess.Popen(command, cwd=ROOT, env=env)
    url = f'http://127.0.0.1:{port}'
    try:
        for _ in range(120):
            if process.poll() is not None:
                raise RuntimeError('The hospital server could not start. See the error above.')
            try:
                with urllib.request.urlopen(url + '/healthz', timeout=1) as response:
                    if json.load(response).get('launch_id') == launch_id:
                        webbrowser.open(url)
                        print('ASH Nexus is running:', url)
                        print('Keep this window open. Closing the window stops this application instance.')
                        break
            except (OSError, urllib.error.URLError, ValueError):
                pass
            time.sleep(.25)
        else:
            raise RuntimeError('Server startup timed out. No unrelated service was opened.')
        process.wait()
    except (KeyboardInterrupt, RuntimeError) as error:
        if isinstance(error, RuntimeError):
            print(str(error), file=sys.stderr)
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


if __name__ == '__main__':
    main()
