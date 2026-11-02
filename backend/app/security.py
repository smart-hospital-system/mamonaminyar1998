import hashlib
import hmac
import secrets
import time
from fastapi import Depends, HTTPException, Request
from .database import get_db
from .models import AuditLog, LoginSession, User

COOKIE = 'ash_session'


def hash_password(password):
    salt = secrets.token_bytes(16)
    value = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1)
    return f'scrypt${salt.hex()}${value.hex()}'


def verify_password(password, encoded):
    try:
        scheme, salt, expected = encoded.split('$')
        if scheme != 'scrypt':
            return False
        actual = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1)
        return hmac.compare_digest(actual.hex(), expected)
    except (ValueError, TypeError):
        return False


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def db_dependency(request: Request):
    yield from get_db(request)


def current_user(request: Request, db=Depends(db_dependency)):
    token = request.cookies.get(COOKIE, '')
    session = db.get(LoginSession, digest(token)) if token else None
    if not session or session.expires <= int(time.time()):
        raise HTTPException(401, 'نشست معتبر نیست؛ دوباره وارد شوید.')
    user = db.get(User, session.user_id)
    if not user or not user.active:
        raise HTTPException(401, 'حساب غیرفعال است.')
    if request.method not in ('GET', 'HEAD', 'OPTIONS'):
        if not hmac.compare_digest(request.headers.get('X-CSRF-Token', '').encode(), session.csrf.encode()):
            raise HTTPException(403, 'درخواست بدون توکن محافظتی معتبر است.')
    request.state.session = session
    return user


def roles(*allowed):
    def dependency(user=Depends(current_user)):
        if user.role not in allowed and not is_physician_owner(user):
            raise HTTPException(403, 'این عملیات برای نقش شما مجاز نیست.')
        return user
    return dependency


def audit(db, user, action, resource):
    db.add(AuditLog(actor=user.id if user else None, action=action, resource=str(resource)))


def is_physician_owner(user):
    # Explicit opt-in: an ordinary administrator has no clinical privileges.
    return user.role == 'admin' and user.doctor_profile is not None


def public_user(user):
    return {'id': user.id, 'name': user.name, 'username': user.username, 'role': user.role, 'physician_owner': is_physician_owner(user)}
