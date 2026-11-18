# ApnaWallet Test Cases

| ID | Area | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|
| TC-AUTH-01 | Authentication | Run existing AUTH tests | Registration, login, logout and reset behavior pass | Covered by 92-test suite | Pass |
| TC-ISO-01 | Isolation | Access another user's resources | Cross-user access denied | Covered by suite | Pass |
| TC-FIN-01 | Add Cash | Add cash to cash/bank balances | Only destination balance increases | Covered by suite | Pass |
| TC-FIN-02 | Expense | Spend within available balance | Source balance decreases once | Covered by suite | Pass |
| TC-FIN-03 | Transfer | Transfer cash to bank | Available balance remains unchanged | Covered by suite | Pass |
| TC-LEND-01 | Lending | Create lending and partial/full repayments | Outstanding decreases; repayments are not income | Covered by suite | Pass |
| TC-CRED-01 | Credit | Record debt and repayments | Liability decreases; repayments are not expenses | Covered by suite | Pass |
| TC-SAV-01 | Savings | Deposit and withdraw | Balance and goal update atomically | Covered by suite | Pass |
| TC-INV-01 | Investment | Purchase and sell | Cost basis and gain/loss update correctly | Covered by suite | Pass |
| TC-BUD-01 | Budget | Create and recalculate budget | Status reflects expense usage | Covered by suite | Pass |
| TC-REC-01 | Recurring expense | Record and reject duplicates | One transaction per occurrence | Covered by suite | Pass |
| TC-NOT-01 | Notifications | Generate, read and dismiss notifications | State is isolated and persistent | Covered by suite | Pass |
| TC-RPT-01 | Reports | Calculate totals, categories and exports | Period/account filters and export formats are correct | Covered by suite | Pass |
| TC-CSV-01 | CSV export | Insert formula-like text | Formula injection is neutralized | Covered by suite | Pass |
| TC-PDF-01 | PDF export | Generate report PDF | Valid report bytes are returned | Covered by suite | Pass |
| TC-UI-01 | Responsive UI | Inspect at 320, 375, 390, 768, 1024 and 1440 px | No horizontal overflow | Passed for guest dashboard | Pass |
| TC-UI-02 | Auth modal | Open sign-in and submit invalid credentials | Modal opens and shows invalid-login error | Passed at 375 px | Pass |
| TC-BLD-01 | Frontend build | Run npm production build | Build succeeds | 2113 modules transformed | Pass |
| TC-BLD-02 | Backend migration | Run migration check | No unapplied model changes | No changes detected | Pass |
| TC-DEP-01 | Deployment smoke | Deploy and test production environment | Service URLs and HTTPS operational | Not run; account approval and credentials required | Not Run |

## Executed Commands

- `python manage.py test core --keepdb`
- `python manage.py check`
- `python manage.py makemigrations --check --dry-run`
- `python manage.py collectstatic --noinput`
- `npm run build`
- `npm run lint`
