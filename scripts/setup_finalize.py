"""Private installer worker: credentials arrive on stdin, never argv or a log file."""
import json
from pathlib import Path
import re
import sys
import time
from backend.app.activation import verify_license
from backend.app.schemas import HospitalInput
from scripts.manage import initialize


def provision(target, payload, manifest, installation_id):
    username = payload.get('username', '').strip().lower()
    name = payload.get('admin_name', '').strip()
    password = payload.get('password', '')
    if not re.fullmatch(r'[a-z0-9@._+-]{3,120}', username) or not 2 <= len(name) <= 160:
        raise ValueError('نام یا نام کاربری مدیر معتبر نیست.')
    if not isinstance(password, str) or not 12 <= len(password) <= 200 or password != payload.get('password_repeat'):
        raise ValueError('رمز حداقل ۱۲ حرف و تکرار آن یکسان باشد.')
    hospital = HospitalInput(**payload.get('hospital', {})).model_dump()
    activation = {'mode': 'local', 'installation_id': installation_id, 'activated_at': int(time.time())}
    if manifest.get('activation_mode') == 'signed':
        try:
            license_value = json.loads(payload.get('license', ''))
        except (ValueError, TypeError) as error:
            raise ValueError('فایل فعال‌سازی را انتخاب کنید.') from error
        verify_license(license_value, manifest.get('license_public_key', ''), installation_id)
        activation.update(mode='signed', license=license_value, public_key=manifest['license_public_key'])
    # All validation is done before creating a schema or administrator.
    path = target / '.data' / 'ash.sqlite3'
    initialize(path, username, name, password, hospital=hospital, activation=activation, physician_owner=payload.get('physician_owner') is True)
    return {'ok': True, 'activation_mode': activation['mode']}


def main():
    try:
        data = json.loads(sys.stdin.buffer.read(65537))
        result = provision(Path.cwd(), data['payload'], data['manifest'], data['installation_id'])
        print(json.dumps(result))
    except ValueError as error:
        # Validation errors may be Pydantic objects containing password input: never log them.
        message = str(error) if type(error) is ValueError and len(str(error)) < 180 else 'اطلاعات واردشده معتبر نیست.'
        print(json.dumps({'ok': False, 'message': message}, ensure_ascii=True))
        sys.exit(2)
    except Exception:
        print(json.dumps({'ok': False, 'message': 'ساخت حساب تکمیل نشد؛ دیتابیس موجود بازنویسی نمی‌شود.'}, ensure_ascii=True))
        sys.exit(3)


if __name__ == '__main__':
    main()
