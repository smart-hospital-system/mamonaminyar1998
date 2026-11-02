import secrets
import time
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import delete, select
from ..models import Doctor, LoginAttempt, LoginSession, User
from ..schemas import Login, PasswordChange, UserInput
from ..security import COOKIE, audit, current_user, db_dependency, digest, hash_password, public_user, roles, verify_password

router = APIRouter(prefix='/api/auth', tags=['Authentication'])


@router.post('/login')
def login(body: Login, request: Request, response: Response, db=Depends(db_dependency)):
    # A custom header blocks cross-origin HTML form login; CORS is intentionally disabled.
    if request.headers.get('X-ASH-Client') != 'web':
        raise HTTPException(403, 'درخواست ورود معتبر نیست.')
    now = int(time.time())
    # Account-based limiter resists spoofed proxy IPs. Also cap attempts per peer.
    keys = [digest('account:' + body.username.lower().strip()), digest('peer:' + (request.client.host if request.client else 'local'))]
    for key in keys:
        attempt = db.get(LoginAttempt, key)
        if attempt and now - attempt.started < 900 and attempt.count >= 10:
            raise HTTPException(429, 'تلاش زیاد؛ ۱۵ دقیقه بعد دوباره کوشش کنید.')
    user = db.scalar(select(User).where(User.username == body.username.lower().strip()))
    # Use a precomputed dummy hash for unknown accounts to reduce account enumeration.
    valid = verify_password(body.password, user.password_hash if user else request.app.state.dummy_hash)
    if not user or not user.active or not valid:
        for key in keys:
            attempt = db.get(LoginAttempt, key)
            if not attempt:
                db.add(LoginAttempt(key=key, count=1, started=now))
            elif now - attempt.started >= 900:
                attempt.count, attempt.started = 1, now
            else:
                attempt.count += 1
        audit(db, None, 'login_failed', 'auth')
        db.commit()
        raise HTTPException(401, 'نام کاربری یا رمز درست نیست.')
    db.execute(delete(LoginAttempt).where(LoginAttempt.key == keys[0]))
    db.execute(delete(LoginAttempt).where(LoginAttempt.started < now - 86400))
    db.execute(delete(LoginSession).where(LoginSession.expires <= now))
    old = request.cookies.get(COOKIE)
    if old:
        db.execute(delete(LoginSession).where(LoginSession.digest == digest(old)))
    token, csrf = secrets.token_urlsafe(48), secrets.token_urlsafe(32)
    db.add(LoginSession(digest=digest(token), csrf=csrf, user_id=user.id, expires=now + 8 * 3600))
    audit(db, user, 'login', 'auth')
    db.commit()
    response.set_cookie(COOKIE, token, httponly=True, secure=request.app.state.secure_cookie,
                        samesite='strict', max_age=8 * 3600, path='/')
    return {'user': public_user(user), 'csrf': csrf}


@router.get('/me')
def me(request: Request, user=Depends(current_user)):
    return {'user': public_user(user), 'csrf': request.state.session.csrf}


@router.post('/logout')
def logout(request: Request, response: Response, user=Depends(current_user), db=Depends(db_dependency)):
    db.delete(request.state.session)
    audit(db, user, 'logout', 'auth')
    db.commit()
    response.delete_cookie(COOKIE, path='/')
    return {'ok': True}


@router.get('/users')
def users(user=Depends(roles('admin')), db=Depends(db_dependency)):
    return [public_user(row) | {'active': row.active} for row in db.scalars(select(User).order_by(User.id)).all()]


@router.post('/users', status_code=201)
def add_user(body: UserInput, user=Depends(roles('admin')), db=Depends(db_dependency)):
    username = body.username.lower()
    if db.scalar(select(User).where(User.username == username)):
        raise HTTPException(409, 'این نام کاربری موجود است.')
    row = User(username=username, name=body.name, role=body.role, password_hash=hash_password(body.password))
    db.add(row)
    db.flush()
    if row.role == 'doctor':
        db.add(Doctor(user_id=row.id))
    audit(db, user, 'user_created', row.id)
    db.commit()
    return public_user(row)


@router.post('/users/{user_id}/deactivate')
def deactivate(user_id: int, user=Depends(roles('admin')), db=Depends(db_dependency)):
    row = db.get(User, user_id)
    if not row:
        raise HTTPException(404, 'کاربر پیدا نشد.')
    if row.id == user.id or row.role == 'admin':
        raise HTTPException(409, 'غیرفعال‌کردن مدیر از این مسیر مجاز نیست.')
    row.active = False
    db.execute(delete(LoginSession).where(LoginSession.user_id == row.id))
    audit(db, user, 'user_deactivated', row.id)
    db.commit()
    return {'ok': True}


@router.post('/password')
def change_password(body: PasswordChange,
                    response: Response, user=Depends(current_user), db=Depends(db_dependency)):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(400, 'رمز فعلی درست نیست.')
    if verify_password(body.new_password, user.password_hash):
        raise HTTPException(422, 'رمز جدید باید متفاوت باشد.')
    user.password_hash = hash_password(body.new_password)
    db.execute(delete(LoginSession).where(LoginSession.user_id == user.id))
    audit(db, user, 'password_changed', user.id)
    db.commit()
    response.delete_cookie(COOKIE, path='/')
    return {'ok': True, 'login_required': True}
