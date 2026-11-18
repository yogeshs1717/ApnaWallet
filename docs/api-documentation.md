# API Documentation

Base path: `/api`

## Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/auth/csrf/` | Initialize CSRF cookie |
| POST | `/api/auth/register/` | Register user |
| POST | `/api/auth/login/` | Create session |
| POST | `/api/auth/logout/` | End session |
| GET | `/api/auth/me/` | Get current user |
| POST | `/api/auth/password-reset/` | Request reset email |
| POST | `/api/auth/password-reset/confirm/` | Confirm reset |

## Core Resources

The existing API exposes financial accounts, categories, transactions, lending, credit, savings, investments, budgets, recurring expenses, notifications and report exports. State-changing requests require CSRF and authenticated session cookies. Protected resources must reject cross-user IDs.

## Report Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/reports/summary/` | Report totals |
| GET | `/api/reports/categories/` | Category totals |
| GET | `/api/reports/trends/` | Trend points |
| GET | `/api/reports/export/csv/` | CSV download |
| GET | `/api/reports/export/pdf/` | PDF download |
