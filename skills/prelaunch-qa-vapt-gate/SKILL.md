---
name: prelaunch-qa-vapt-gate
description: Pre-Launch QA & VAPT Gate Playbook. Mandatory verification and security gate before any git push, merge to main/release, or build deployment on websites/web apps.
---

# Pre-Launch QA & VAPT Gate Playbook
### For AI Coding Agents (Claude Code / Codex / Antigravity)

## 0. Prime Directive

You are acting as **QA Engineer + VAPT (Vulnerability Assessment & Penetration Testing) Security Officer** for this codebase, not as a feature-shipping assistant.

**Hard rule: NO `git push` to any remote, NO merge to `main`/`release`, and NO deploy command may be executed until every gate in Section 8 shows PASS.**

- Do not summarize or "spot check." Audit the *entire* application, every route, every form, every table, every config file.
- A single unresolved **Critical** or **High** finding = automatic BLOCK, no exceptions, no "it's probably fine."
- You do not ask the human "should I proceed despite this issue?" — you report the finding, fix what is fixable in-scope, and re-run the gate. Only stop and ask when a fix requires a decision outside your authority (e.g. rotating a real production secret, changing pricing logic, legal/ToS text).
- Every finding gets logged with: **ID, Category, Severity, Location (file:line / route / endpoint), Evidence, Fix Applied / Fix Required, Verified Y/N.** Nothing gets marked resolved without re-verification after the fix.
- Assume nothing was done correctly by default. Verify against evidence (logs, curl output, screenshots, test runs) — not "it looks right in the code."

---

## 1. Inventory Pass (do this first, every time)

Before testing anything, build a map so nothing gets skipped:

1. Enumerate every route/page (SSR pages, SPA routes, admin routes, hidden/dev routes).
2. Enumerate every API endpoint (REST/GraphQL/RPC) — method, auth requirement, input schema.
3. Enumerate every DB table/collection and its relations, and every migration file.
4. Enumerate every form (fields, validation rules, submit target).
5. Enumerate every third-party integration (payment gateway, email, SMS, storage, analytics, OAuth providers).
6. Enumerate every environment variable / secret consumed by the app.
7. Enumerate every cron job / background worker / queue consumer.

Output this as a checklist file (`audit/inventory.md`) before moving to Section 2 — this becomes your coverage tracker. If something is discovered later that wasn't in the inventory, add it and re-run the relevant section against it.

---

## 2. Functional QA — User Flows

Walk every flow end-to-end, both **happy path** and **abuse/edge path**. For each, test as: unauthenticated user, authenticated normal user, authenticated privileged user (admin/staff), and expired/invalid session.

### 2.1 Auth & Account
- Sign up: valid data, duplicate email, weak password, missing fields, SQL/HTML injection in fields, extremely long input, unicode/emoji input.
- Email/phone verification: link expiry, link reuse, token guessability, resend flooding.
- Login: correct creds, wrong password (lockout/rate-limit behavior), disabled account, unverified account, SSO/OAuth callback tampering.
- Logout: session actually invalidated server-side (not just client cookie cleared).
- Password reset: token expiry, token reuse, token enumeration (does response differ for valid vs invalid email — user enumeration bug), reset without old password confirmation.
- Session handling: idle timeout, concurrent sessions, session fixation, "remember me" token security.
- MFA (if present): bypass via direct API call, backup codes, brute-force on OTP.

### 2.2 Payments
- Full checkout: success, decline, insufficient funds, network timeout mid-transaction.
- Idempotency: double-click submit, replayed webhook, duplicate charge.
- Webhook endpoints: signature verification enforced, replay protection, unauthenticated calls rejected.
- Refunds/cancellations: correct state transitions, no negative balances, race conditions on concurrent refund + capture.
- Price/amount tampering: can the client-submitted price/quantity/currency be manipulated? Server must recompute from source of truth, never trust client totals.
- Currency/decimal rounding correctness.
- PCI-relevant: card data never touches your own servers/logs unless you are validated for it — confirm tokenization via gateway SDK, not raw PAN handling.

### 2.3 Forms & Data Entry
- Client-side validation bypass (submit directly via API/curl) — server must independently validate everything.
- File upload forms: file type allow-list (not just extension check — check magic bytes/MIME), size limits, malware/EICAR test file, path traversal in filename, upload directory not web-executable.
- Rich text / comment fields: stored XSS test payloads.
- Multi-step forms: back-button state corruption, skipping steps via direct URL/API.

### 2.4 API & Database
- Every endpoint tested for: missing auth, broken object-level authorization (IDOR — can user A fetch/modify user B's resource by changing an ID?), mass assignment (extra unexpected fields accepted and persisted?).
- Pagination/filter params for injection (SQL, NoSQL operator injection, ORM injection).
- Rate limiting on all state-changing and auth endpoints.
- Error responses don't leak stack traces, SQL, internal paths, or library versions.
- N+1 queries / missing indexes on high-traffic tables — check query plans on the largest expected tables.
- Migrations are reversible and tested on a copy of prod-shaped data, not just an empty dev DB.
- Foreign key / cascade behavior on delete does not orphan or leak data across tenants (multi-tenant isolation check if applicable).

### 2.5 Navigation, Pages & Error States
- Crawl every internal link/button — flag 404s, dead anchors, mismatched route params.
- Every page has a defined: loading state, empty state, error state, and permission-denied state — none should render a blank screen or unstyled crash trace.
- Deep-link directly into every route (not via nav clicks) to catch client-routing-only bugs.
- 404 and 500 pages exist, are branded, and don't leak stack traces in production mode.
- Back/forward browser navigation doesn't resurrect stale or unauthorized state.

### 2.6 Mobile & Responsiveness
- Test at minimum: 360px, 390px, 768px, 1024px, 1440px widths.
- Tap targets ≥44px, no horizontal scroll/overflow, forms usable with on-screen keyboard (inputs not hidden behind keyboard).
- Test on actual iOS Safari and Android Chrome behavior differences (viewport units, date/file inputs, safe-area insets on notch devices).
- Orientation change (portrait/landscape) doesn't break layout or lose form state.

---

## 3. Security Audit — Secrets & Sensitive Data Exposure

1. **Full repo secret scan** — run a secrets scanner (e.g. `trufflehog`, `gitleaks`) across the *entire git history*, not just current HEAD (a key removed in a later commit is still exposed).
2. Confirm `.env`, `.env.*`, credential files, private keys are in `.gitignore` **and were never committed** — if they were, treat every such secret as compromised: it must be rotated, not just removed from the file.
3. Grep source and built/bundled frontend assets for: API keys, DB connection strings, JWT signing secrets, cloud provider keys (AWS/GCP/Azure), third-party API tokens hardcoded client-side (anything shipped to the browser is public — verify nothing sensitive is bundled into frontend JS).
4. Check CI/CD config (Jenkinsfile, GitHub Actions, GitLab CI) for secrets in plaintext instead of secret-manager references, and confirm build logs don't echo secret values.
5. Check cloud storage buckets / DB instances for public read/write access, default credentials, or open ports to `0.0.0.0/0`.
6. Verify server error responses and logging never write full request bodies, passwords, tokens, or PII to logs in plaintext.
7. Confirm backups are encrypted at rest and access-restricted.

---

## 4. OWASP Top 10 Checklist (2021, verify against current list at test time)

| # | Category | Check |
|---|---|---|
| A01 | Broken Access Control | IDOR tests done (2.4), role checks enforced server-side not just UI-hidden, directory listing disabled |
| A02 | Cryptographic Failures | TLS enforced everywhere, passwords hashed with bcrypt/argon2 (never MD5/SHA1/plaintext), sensitive data encrypted at rest |
| A03 | Injection | SQL/NoSQL/command/LDAP injection tested on every input, parameterized queries/ORM used exclusively, no string-concatenated queries |
| A04 | Insecure Design | Business logic abuse cases tested (e.g. negative quantities, coupon stacking, race conditions on limited resources) |
| A05 | Security Misconfiguration | Default admin panels/credentials removed, debug mode off in prod, unnecessary services/ports closed, directory browsing off |
| A06 | Vulnerable & Outdated Components | `npm audit` / `pip-audit` / equivalent run, all Critical/High CVEs patched or mitigated, dependency versions pinned |
| A07 | Identification & Auth Failures | Covered in 2.1 — brute force protection, session fixation, credential stuffing rate limits |
| A08 | Software & Data Integrity Failures | CI/CD pipeline artifact integrity (signed builds/lockfiles), no unpinned third-party script tags loading arbitrary remote JS |
| A09 | Security Logging & Monitoring Failures | Auth failures, privilege escalations, and payment events are logged and alertable; logs tamper-resistant |
| A10 | Server-Side Request Forgery (SSRF) | Any feature that fetches a URL on user input (webhooks, image proxy, PDF import) validated against internal IP ranges / metadata endpoints (e.g. 169.254.169.254) |

Also explicitly test:
- **CSRF** on all state-changing endpoints (tokens or SameSite cookie enforcement).
- **Clickjacking** — `X-Frame-Options`/`frame-ancestors` set.
- **CORS** — no `Access-Control-Allow-Origin: *` combined with credentials; allow-list is explicit and minimal.
- **XXE** if any XML parsing exists — external entity resolution disabled.

---

## 5. Nginx Hardening (target: OWASP Secure Headers + SOC2-passable baseline)

Verify (and add if missing) in the server/site config:

```nginx
# TLS
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5:!3DES;
ssl_prefer_server_ciphers on;
ssl_session_tickets off;

# HSTS (only enable once TLS is confirmed correct everywhere — misconfig locks users out)
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# Clickjacking / MIME sniffing / XSS legacy protections
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

# Content-Security-Policy — build this from the actual asset origins in use, do not paste a generic wildcard policy
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';" always;

# Hide server details
server_tokens off;

# Request limits (tune to app, this is a baseline)
client_max_body_size 10m;
client_body_timeout 12s;
client_header_timeout 12s;

# Rate limiting zone (define in http{} block, apply to login/payment/api locations)
limit_req_zone $binary_remote_addr zone=login_zone:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=api_zone:10m rate=20r/s;

# Block access to sensitive files
location ~ /\.(?!well-known) { deny all; }
location ~* \.(env|git|sql|bak|log|ini)$ { deny all; }
```

Additional checks:
- Reverse proxy passes `X-Forwarded-For`/`X-Real-IP` correctly and the app trusts them **only** from the actual proxy IP (not user-controllable spoofing).
- No default nginx welcome page or example config left enabled.
- Access/error logs rotated, retained per your compliance policy, shipped to a log aggregator (SOC2 requires log retention + monitoring, not just local files).
- Separate rate-limit zones for auth, payment, and general API — auth/payment should be the strictest.
- WAF or `ngx_http_limit_conn_module` in place against basic DoS/brute-force.
- If serving as origin behind a CDN, confirm origin is not directly reachable bypassing the CDN's protections.

---

## 6. Mapping to SOC2 Trust Service Criteria (operational checklist, not a certification)

- **Security**: access control least-privilege reviewed (2.4, A01), encryption in transit/at rest (A02), vulnerability management process (A06), incident logging (A09).
- **Availability**: health checks, graceful degradation, rate limiting/DoS protection (Section 5), rollback plan documented (Section 8).
- **Processing Integrity**: input validation (2.3), idempotent payment processing (2.2), data validation on ingestion.
- **Confidentiality**: secrets handling (Section 3), data classification honored in logs/backups.
- **Privacy**: PII minimization, consent flows if applicable, data retention/deletion capability.

This is a pre-launch operational alignment check, not a substitute for a formal SOC2 audit — flag this distinction to the human if they intend to claim SOC2 compliance externally.

---

## 7. Reporting Format

Produce `audit/findings.md` with every issue, grouped and sorted by severity within category:

```
## [CRITICAL] AUTH-003 — Password reset token does not expire
Category: Functional / Security (A07)
Location: src/api/auth/reset.ts:42
Evidence: Token generated 2024-01-01 still accepted 30 days later (curl output attached)
Fix Applied: Added 15-minute TTL + single-use invalidation, migration added token_used_at column
Verified: Y — re-tested with curl, expired token now returns 410
```

Severity definitions:
- **Critical**: data breach, auth bypass, payment manipulation, RCE, exposed prod secrets → blocks launch, no exceptions.
- **High**: IDOR, missing rate limiting on sensitive endpoints, stored XSS, broken core user flow → blocks launch.
- **Medium**: minor logic bugs, non-sensitive info leaks, missing security headers, moderate a11y/responsiveness breaks → must be fixed or explicitly accepted with sign-off before launch.
- **Low**: cosmetic issues, non-blocking edge cases → can ship with a tracked follow-up ticket.

---

## 8. Launch Gate (all must be TRUE before any push/deploy)

- [ ] Full inventory (Section 1) completed and every item tested at least once
- [ ] Every user flow in Section 2 tested happy-path + abuse-path
- [ ] Zero unresolved Critical findings
- [ ] Zero unresolved High findings
- [ ] Every OWASP Top 10 category (Section 4) explicitly checked with evidence, not assumed
- [ ] Secrets scan (Section 3) run against full git history, clean or all findings rotated
- [ ] Dependency audit run, zero unpatched Critical/High CVEs
- [ ] Nginx config diffed against Section 5 baseline and applied
- [ ] All fixes re-verified independently (not just "should be fixed now")
- [ ] `audit/findings.md` generated and attached to the release/PR

If any box is unchecked: **do not push, do not merge, do not deploy.** State clearly which gate item failed and what is required to close it, then continue working the list — do not wait for permission to keep fixing blocking issues.
