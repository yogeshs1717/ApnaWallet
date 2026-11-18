# ApnaWallet Defect Log

| ID | Severity | Defect | Root Cause | Fix | Retest |
|---|---|---|---|---|---|
| DEF-001 | High | Production secrets could remain hardcoded and DEBUG could remain enabled | Django settings used literal secret, `DEBUG=True` and empty hosts | Added environment-based secret, DEBUG, allowed hosts, HTTPS cookies, SSL redirect and HSTS settings | System deployment check improved; remaining warnings require production environment values |
| DEF-002 | Low | Reporting trend functions contained unused variables | `bucket_count` variables were assigned but not used | Removed unused assignments | 92-test suite passed |
| DEF-003 | Medium | PDF export dependency was missing from Python requirements | ReportLab was imported but not declared | Added ReportLab, Gunicorn and WhiteNoise dependencies | Dependencies installed and build/static checks passed |
| DEF-004 | Low | Frontend lint reported unused imports and React effect warnings | Existing code quality warnings | Not changed; no correctness failure was reproduced | Frontend build passes; lint exit is successful with warnings |
