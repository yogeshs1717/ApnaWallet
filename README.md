# ApnaWallet 💰

A responsive personal finance management web application featuring an orange-and-gold theme.

## Architecture
- **Backend:** Django & Django REST Framework (Python 3.11+)
- **Frontend:** React (Vite) + Tailwind CSS
- **Database:** PostgreSQL (Neon)
- **Email Delivery:** Brevo
- **Production Static Files:** WhiteNoise
- **Production WSGI:** Gunicorn

## Project Structure
- `/backend`: Django REST API service
- `/frontend`: React client application
- `/docs`: SRS, architecture, API, deployment and user documentation
- `/docs/stqa`: Test plan, cases, defect log and final evidence

## Local Development

1. Create `backend/.env` from `backend/.env.example`.
2. Install backend dependencies:
   `cd backend && pip install -r requirements.txt`
3. Start Django:
   `python manage.py runserver 127.0.0.1:8000`
4. Install frontend dependencies:
   `cd frontend && npm ci`
5. Start Vite:
   `npm run dev -- --host 127.0.0.1`

Set `VITE_API_BASE_URL` to `http://127.0.0.1:8000/api` for a local frontend build.

## Verification

- `cd backend && python manage.py test core --keepdb`
- `cd backend && python manage.py check`
- `cd backend && python manage.py makemigrations --check --dry-run`
- `cd frontend && npm run build`
- `cd frontend && npm run lint`
