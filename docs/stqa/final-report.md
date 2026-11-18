# ApnaWallet Prompt 11–12 Final STQA Report

## Testing Methodology

The existing Django test suite was used as the primary source of financial and security evidence. Frontend build, lint, migration, static collection and browser automation were used for regression and UI evidence.

## Results

- Backend: 92/92 tests passed.
- Frontend build: passed.
- Frontend lint: completed with warnings, no errors.
- Migration check: passed.
- Static collection: passed.
- Responsive browser: passed at six required widths.
- Authentication browser smoke: passed for invalid-login feedback.
- Production deployment smoke: Not Run.

## Defects

- Production security defaults were hardcoded and have been converted to environment variables.
- Reporting unused variables were removed.
- PDF and production server dependencies were added.

## Limitations

No Render, Neon or Brevo account access was available in this execution. No production deployment URL was created and no live financial test data was written.
