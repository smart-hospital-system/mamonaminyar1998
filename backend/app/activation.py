"""Local setup status and OPTIONAL Ed25519-signed licenses. No fixed demo serials.

A signature is proof of issuance, not tamper-proof DRM. Existing records remain
accessible even if a license expires. No medical capability is activated by a license.
"""
import base64
import json
import time
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

PRODUCT = 'ASH-NEXUS-HMS'


def canonical(payload):
    return json.dumps(payload, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode('utf-8')


def verify_license(envelope, public_key, installation_id, now=None):
    now = int(time.time()) if now is None else now
    try:
        if not isinstance(envelope, dict) or set(envelope) != {'payload', 'signature'}:
            raise ValueError('Invalid envelope')
        payload = envelope['payload']
        expected = {'version', 'product', 'license_id', 'organization', 'issued_at', 'expires_at', 'installation_id'}
        if not isinstance(payload, dict) or set(payload) != expected:
            raise ValueError('Invalid payload')
        if payload['version'] != 1 or payload['product'] != PRODUCT:
            raise ValueError('Wrong product/version')
        for field in ('license_id', 'organization'):
            if not isinstance(payload[field], str) or not 1 <= len(payload[field]) <= 200:
                raise ValueError('Invalid license identity')
        if type(payload['issued_at']) is not int or payload['issued_at'] > now + 300:
            raise ValueError('Invalid issuance date')
        expiry = payload['expires_at']
        if expiry is not None and (type(expiry) is not int or expiry <= now or expiry <= payload['issued_at']):
            raise ValueError('License expired or invalid expiry')
        binding = payload['installation_id']
        if binding is not None and (not isinstance(binding, str) or binding != installation_id):
            raise ValueError('License belongs to another installation')
        key = Ed25519PublicKey.from_public_bytes(base64.b64decode(public_key, validate=True))
        key.verify(base64.b64decode(envelope['signature'], validate=True), canonical(payload))
        return payload
    except (ValueError, TypeError, KeyError, InvalidSignature) as error:
        raise ValueError('فایل فعال‌سازی معتبر نیست، منقضی شده یا متعلق به نصب دیگری است.') from error


def activation_status(value):
    if not value:
        return {'mode': 'local', 'status': 'ready', 'commercial_license': False,
                'message': 'راه‌اندازی محلی با حساب مدیر؛ این وضعیت لایسنس تجاری نیست.'}
    mode = value.get('mode', 'local')
    result = {'mode': mode, 'installation_id': value.get('installation_id'), 'commercial_license': mode == 'signed',
              'activated_at': value.get('activated_at'), 'status': 'ready'}
    if mode == 'signed':
        try:
            payload = verify_license(value['license'], value['public_key'], value['installation_id'])
            result.update(organization=payload['organization'], license_id=payload['license_id'], expires_at=payload['expires_at'])
        except (ValueError, KeyError):
            result.update(status='needs_review', message='فعال‌سازی نیاز به بازبینی دارد؛ دسترسی به سوابق مریضان قطع نشده است.')
    else:
        result['message'] = 'راه‌اندازی اولیه تکمیل شده؛ این بسته لایسنس تجاری اجباری ندارد.'
    return result
