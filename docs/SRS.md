# Software Requirements Specification

## Functional Requirements

- FR-01: Users can register, log in, log out and recover passwords.
- FR-02: Users can manage financial accounts and isolated transactions.
- FR-03: Add Cash, Expense and Transfer operations maintain balance integrity.
- FR-04: Lending supports creation, partial repayment and full repayment.
- FR-05: Credit supports debt recording, borrowed-fund receipt and repayment.
- FR-06: Savings goals support deposits and withdrawals.
- FR-07: Investments support purchases, partial sales and cost-basis tracking.
- FR-08: Monthly budgets and recurring expenses can be configured.
- FR-09: Daily, credit and recurring notifications can be generated and dismissed.
- FR-10: Reports support period/account/category filters and CSV/PDF exports.

## Financial Rules

- Available Balance = Cash Balance + Bank Balance.
- Transfers do not create income or expense.
- Lending repayments are not income.
- Credit principal repayments are not ordinary expenses.
- Savings movements are not expenses.
- Investment purchases are not expenses.
- Monetary values use Decimal arithmetic and atomic database operations.

## Non-Functional Requirements

- Cross-user authorization must be enforced.
- Password reset links expire and cannot be reused after success.
- Exported CSV values must neutralize spreadsheet formulas.
- The interface must remain usable at mobile widths.
- Production credentials must remain server-side.
- Database operations should use transactions and row locks for financial integrity.
