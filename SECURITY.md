# Security policy

This repository holds automated tests only (no production code and no user data).

## Reporting a problem
If you find a security problem in this repository or in the application it tests, please do **not** open a public issue.
Use GitHub's **Report a vulnerability** button (Security tab → Advisories) or contact the owner privately through the
email on the GitHub profile.

## Secrets
No secret belongs in this repository. Credentials live only in *Settings → Secrets and variables → Actions*.
If you ever see one committed, tell the owner immediately so it can be **rotated** (replaced) — deleting the commit is not enough.
