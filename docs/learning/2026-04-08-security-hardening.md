# Learning Notes - 2026-04-08 (Security Hardening)

## Context

- Performed an incremental OWASP-oriented hardening pass on the backend.
- Objective: improve practical security controls without introducing high merge risk.

## Key Decisions

1. **Ship security as multiple small PRs**
   - **Why**: tighter review scope and safer rollback.
   - **Tradeoff**: more PR coordination overhead.

2. **Merge by operational risk**
   - Logging sanitization → auth controls → HTTP hardening → token hashing.

3. **Keep compatibility while improving token storage**
   - Added hashed token matching with temporary fallback for legacy plaintext records.

## Technologies Used

- `helmet` for secure HTTP defaults.
- NestJS DTO validation + throttling for refresh/logout endpoints.
- SHA-256 token hashing for refresh token storage at rest.
- Structured logger in global exception handling.

## Concepts Reinforced

- OWASP A05 (Security Misconfiguration)
- OWASP A02 (Cryptographic Failures)
- OWASP A07 (Identification/Authentication Failures)
- OWASP A09 (Logging/Monitoring Failures)

## How to Explain This Work

### Short version

We improved backend security in small, low-risk increments: hardened HTTP defaults, tightened auth endpoint controls, removed plaintext refresh-token storage, and sanitized global exception logging.

### Technical version

We implemented four scoped remediations: (1) `helmet` + CORS config + environment-gated Swagger, (2) validated DTO and endpoint throttling for refresh/logout, (3) SHA-256 hashing for refresh tokens at rest with temporary compatibility fallback, and (4) structured/sanitized exception logging. Each change was isolated in its own branch and validated before merge.

## Next Steps

- Remove legacy plaintext refresh-token fallback after migration window.
- Add dedicated E2E coverage for refresh/logout abuse limits.
- Introduce a lightweight OWASP checklist in PR templates for sensitive endpoints.
