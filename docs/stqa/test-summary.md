# ApnaWallet STQA Test Summary

## Execution Results

| Category | Passed | Failed | Not Run |
|---|---:|---:|---:|
| Django backend suite | 92 | 0 | 0 |
| Frontend production build | 1 | 0 | 0 |
| Migration/check validation | 2 | 0 | 0 |
| Responsive UI viewport checks | 6 | 0 | 0 |
| Authentication browser smoke | 1 | 0 | 0 |
| Deployment smoke testing | 0 | 0 | 17 |

## Actual Evidence

- `python manage.py test core --keepdb`: 92 tests passed in 1698.994 seconds.
- `python manage.py check`: no issues.
- `python manage.py makemigrations --check --dry-run`: no changes detected.
- `python manage.py collectstatic --noinput`: 154 static files copied and 444 post-processed.
- `npm run build`: production build succeeded.
- `npm run lint`: completed with warnings and no lint errors.
- Browser guest dashboard: no horizontal overflow at 320, 375, 390, 768, 1024 and 1440 px.
- Browser sign-in modal: invalid credentials returned the visible error `Invalid email or password.`

## Limitations

- Production Render, Neon and Brevo accounts were not accessed.
- Deployment URLs and production smoke tests are Not Run.
- External Brevo sender/domain verification was not executed.
- Live Neon write operations were not performed.

## Quality Evaluation

Financial and security behavior has strong automated test coverage in the existing suite. Production preparation improves configuration, but production account access remains the deployment blocker.
