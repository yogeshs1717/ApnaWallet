# ApnaWallet Deployment Guide

## Render Backend

- Repository root: `backend`
- Build: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate --noinput`
- Start: `gunicorn config.wsgi:application`
- Health path: `/api/health/`

## Render Frontend

- Repository root: `frontend`
- Build: `npm ci && npm run build`
- Publish: `dist`
- SPA rewrite: `/*` to `/index.html`
- Set `VITE_API_BASE_URL` to the HTTPS backend `/api` URL.

## Required Environment Variables

Set `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DATABASE_URL`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, secure-cookie flags and Brevo SMTP variables. Do not commit `.env` values.

## Neon

Use the Neon pooled connection URL with SSL. Run migrations once through the Render build or release step. Never flush or reset the live database. Export a database backup through Neon before risky changes.

## Brevo

Configure SMTP credentials as server-only environment variables. Verify sender identity and domain authentication in Brevo. Password reset links use `FRONTEND_URL`; unknown-email responses remain generic.

## Backup and Recovery

Neon availability and restore limits must be verified in the account dashboard. Maintain point-in-time recovery or scheduled export according to the selected Neon plan. Document restore testing separately; no live restore was performed in this execution.
