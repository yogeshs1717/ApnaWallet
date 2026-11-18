# ApnaWallet Architecture

## Components

- React/Vite/Tailwind frontend
- Django REST Framework API
- Neon PostgreSQL database
- Brevo SMTP integration
- Render backend and static frontend hosting

## API Flow

1. React calls the API using `VITE_API_BASE_URL`.
2. Django initializes a CSRF cookie for state-changing requests.
3. Session authentication identifies the current user.
4. API services load only records owned by that user.
5. Financial services use transactions and account row locks.
6. Reports read the isolated ledger and generate CSV or PDF responses.

## Database Ownership

Users own financial accounts. Accounts own transactions, lending, credit, savings, investments, budgets and related records. Django foreign keys and unique constraints protect ownership and critical scopes.
