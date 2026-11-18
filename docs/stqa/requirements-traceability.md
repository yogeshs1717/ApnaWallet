# ApnaWallet Requirements Traceability

| Requirement | Implementation Evidence | Test Evidence |
|---|---|---|
| User registration and login | DRF authentication APIs and AuthModal | AUTH-01 to AUTH-05 |
| Password reset | Password-reset and confirm endpoints | AUTH-10 to AUTH-14 |
| User isolation | Account ownership filters and API permissions | FIN-12, LEND-13, CREDIT-11, cross-user tests |
| Available balance | Cash balance plus bank balance | FIN-01 to FIN-05 |
| Add Cash/Expense/Transfer | Django financial services | FIN-01 to FIN-18 |
| Lending and repayments | Lending services and constraints | LEND-01 to LEND-14 |
| Credit and repayments | Credit services and constraints | CREDIT-01 to CREDIT-13 |
| Savings and goals | Savings services and database constraint | Savings tests |
| Investment and cost basis | Investment and sale services | Investment tests |
| Budgets | Monthly budget model/services | BUD-01 to BUD-08 |
| Recurring expenses | Recurring template/occurrence models | REC-01 to REC-10 |
| Notifications | Notification generation and identity constraints | NOT-01 to NOT-14 |
| Reports and exports | Reporting module and CSV/PDF builders | RPT-01 to RPT-14 |
