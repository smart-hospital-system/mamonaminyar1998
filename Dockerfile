# Development foundation. Resolve/pin reviewed image digests before production deployment.
FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY frontend ./frontend
COPY scripts/check_tailwind.cjs ./scripts/check_tailwind.cjs
RUN npm run build:css && npm run check:css

# Same-major pg_dump/pg_restore are available for protected operational tools.
FROM postgres:17-bookworm AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt requirements-enterprise.txt requirements-tested.txt ./
RUN pip install --no-cache-dir -r requirements-enterprise.txt -c requirements-tested.txt && pip check
COPY backend ./backend
COPY scripts ./scripts
COPY docs ./docs
COPY --from=frontend /build/frontend ./frontend
RUN groupadd --gid 10001 ash && useradd --uid 10001 --gid ash --no-create-home ash \
    && mkdir /backups /imports && chown ash:ash /backups
USER 10001:10001
EXPOSE 8000
ENTRYPOINT []
CMD ["python","-m","uvicorn","backend.app.main:app","--host","0.0.0.0","--port","8000","--workers","1","--no-access-log"]
