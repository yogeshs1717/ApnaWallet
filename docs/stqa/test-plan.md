# ApnaWallet STQA Test Plan

## Scope

Backend authentication, authorization, financial operations, reports, notifications, database constraints and frontend production build/runtime.

## Objectives

- Verify financial accounting rules and balance integrity.
- Verify user isolation and reset-token behavior.
- Verify reports and exports.
- Detect security and UI defects.
- Produce traceable evidence for academic submission.

## Environment

- Backend: Django 5.2.19, DRF 3.18.3, Python 3.11.9
- Database: isolated Django test database backed by PostgreSQL
- Frontend: React 19.3.1, Vite 8.3.8
- Browser: Playwright browser automation
- Execution date: 2026-11-18

## Approach

- Execute the existing 92-test Django suite.
- Run Django system, migration and deployment checks.
- Run frontend build and lint.
- Use browser automation for guest view, viewport overflow and sign-in validation.
- Retest defects and preserve failing behavior as evidence.

## Entry and Exit Criteria

Entry: repository available, dependencies installed and test database usable.
Exit: all automated backend tests pass, builds complete, defects retested, and limitations documented.
