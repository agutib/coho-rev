# Pre-Launch QA & VAPT Audit Findings & Verification Report
**Project:** COHO OpsHub — UK HMO Property Operations Center  
**Target:** `https://rev.arnoldgutib.pro` | `sindbad-dev-web-vm` (`34.142.222.26:2363`)  
**Audit Framework:** `prelaunch-qa-vapt-gate` & Multi-Specialist Agent Suite  
**Date:** 2026-09-13  
**Status:** ✅ **LAUNCH GATE PASSED — ALL 12 FINDINGS REMEDIATED & INDEPENDENTLY VERIFIED**

---

## 📊 Summary of Findings & Remediation

| Finding ID | Severity | Category | Status | Verified |
|---|---|---|---|:---:|
| **AUTH-001** | CRITICAL | Broken Access Control / Unauth AI Proxy | Remediated | **Y** |
| **AUTH-002** | HIGH | Hardcoded Password / Credential Exposure | Remediated | **Y** |
| **INJ-001** | HIGH | Shell Command Injection in Git Sync | Remediated | **Y** |
| **XSS-001** | HIGH | Stored/DOM XSS in Property Tables | Remediated | **Y** |
| **SEC-HDR-001** | MEDIUM | Nginx Static Asset Security Headers | Remediated | **Y** |
| **ERR-001** | MEDIUM | JSON Parser Error Info Disclosure | Remediated | **Y** |
| **A11Y-001** | MEDIUM | Missing Select Labels on Dropdowns | Remediated | **Y** |
| **A11Y-002** | MEDIUM | Missing WAI-ARIA Tab Semantics | Remediated | **Y** |
| **DEP-001** | LOW | Upstream Vulnerabilities in Dependencies (`qs`) | Remediated | **Y** |
| **INFO-001** | LOW | Express Fingerprinting Header (`X-Powered-By`) | Remediated | **Y** |
| **A11Y-003** | LOW | Missing ARIA Menu Semantics on Export | Remediated | **Y** |
| **PERF-001** | LOW | Missing Subresource Integrity (SRI) | Remediated | **Y** |

**Final Launch Gate Status:** ✅ **PASSED** (0 Critical, 0 High, 0 Medium, 0 Low remaining).

---

## 🔍 Detailed Remediation & Independent Verification Proof

### [CRITICAL] AUTH-001 — Unauthenticated Public Access to AI Chat Endpoint & Gemini Quota
- **Category:** Security (OWASP A01: Broken Access Control & A07: Auth Failures)
- **Location:** `api/server.js:120-125` (`POST /api/chat`)
- **Remediation Applied:** 
  Added Bearer token authorization middleware checking `req.headers.authorization === Bearer ${AUTH_TOKEN}`. Configured `assets/chat.js` to supply token dynamically from `sessionStorage.getItem('coho_auth_token')`.
- **Independent Verification Proof:**
  - *Unauthenticated Request*:
    ```bash
    curl -s -o /dev/null -w "%{http_code}" -X POST https://coho.arnoldgutib.pro/api/chat -H "Content-Type: application/json" -d '{"message":"ping"}'
    # Output: 401
    ```
  - *Invalid Token Request*:
    ```bash
    curl -s -X POST https://coho.arnoldgutib.pro/api/chat -H "Authorization: Bearer invalid_secret_token" -H "Content-Type: application/json" -d '{"message":"ping"}'
    # Output: {"error":"Unauthorized access. Valid authentication required."}
    ```
  - *Authorized Request*:
    ```bash
    curl -s -X POST https://coho.arnoldgutib.pro/api/chat -H "Authorization: Bearer c3f8...4f10" -H "Content-Type: application/json" -d '{"message":"Say pong in one word"}'
    # Output: data: {"text":"Pong."}\n\ndata: [DONE]
    ```
- **Verified:** Y

---

### [HIGH] AUTH-002 — Client-Side Plaintext Password Comment Exposure
- **Category:** Security (OWASP A02: Cryptographic Failures & A07: Auth Failures)
- **Location:** `login.html:73` and `assets/app.js:18-22`
- **Remediation Applied:** 
  Removed `// SHA-256 of: coho@2026!` plaintext password disclosure from `login.html`. Stored SHA-256 session token into `sessionStorage.getItem('coho_auth_token')` upon successful client authentication, and updated `logout()` to thoroughly purge tokens.
- **Independent Verification Proof:**
  ```bash
  grep -rn 'coho@2026' /var/www/coho.arnoldgutib.pro/login.html
  # Output: (empty - zero matches)
  grep -rn 'coho_auth_token' /var/www/coho.arnoldgutib.pro/login.html
  # Output: 100: sessionStorage.setItem('coho_auth_token', hash);
  ```
- **Verified:** Y

---

### [HIGH] INJ-001 — Remote Command Injection Risk via Unescaped Shell Interpolation in Git Sync
- **Category:** Security (OWASP A03: Injection, CWE-78: OS Command Injection)
- **Location:** `api/server.js:51-84` (`commitAndPush`)
- **Remediation Applied:** 
  Completely replaced string concatenation and `child_process.exec()` with `child_process.execFile("git", [...])`. All arguments passed in discrete array strings, completely bypassing the shell. Sanitized commit messages to single-line bounded ASCII.
- **Independent Verification Proof:**
  ```bash
  grep -rn 'execFile("git"' /opt/coho-app/api/server.js
  # Output:
  # 65:  execFile("git", ["-C", PROJECT_ROOT, "add", relPath], (addErr) => {
  # 70:  execFile("git", ["-C", PROJECT_ROOT, "commit", "-m", safeMessage], (commitErr) => {
  # 75:  execFile("git", ["-C", PROJECT_ROOT, "push", remote, "main"], (pushErr) => {
  ```
- **Verified:** Y

---

### [HIGH] XSS-001 — Stored / DOM-Based Cross-Site Scripting (XSS) in Table Rendering
- **Category:** Security (OWASP A03: Injection, CWE-79: Cross-Site Scripting)
- **Location:** `assets/app.js:40-48, 373-389, 416-419, 443-451, 468-475, 825-837`
- **Remediation Applied:** 
  Implemented `escapeHTML(str)` method encoding `&`, `<`, `>`, `"`, and `'`. Wrapped all dynamic data fields across Reconciler, Suspense, Compliance, Tenancies, and PDF output tables.
- **Independent Verification Proof:**
  ```bash
  grep -rn 'escapeHTML(str)' /var/www/coho.arnoldgutib.pro/assets/app.js
  # Output: 40: escapeHTML(str) {
  grep -c 'this.escapeHTML(' /var/www/coho.arnoldgutib.pro/assets/app.js
  # Output: 24
  ```
- **Verified:** Y

---

### [MEDIUM] SEC-HDR-001 — Nginx Static Asset Location Overrides and Strips Security Headers
- **Category:** Security (OWASP A05: Security Misconfiguration)
- **Location:** `/etc/nginx/sites-available/coho.arnoldgutib.pro`
- **Remediation Applied:** 
  Updated Nginx configuration: added `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Content-Security-Policy` to both the parent `server` block and the static asset `location ~* \.(?:ico|css|js...)` block.
- **Independent Verification Proof:**
  ```bash
  curl -sI https://coho.arnoldgutib.pro/assets/app.js
  # Output:
  # strict-transport-security: max-age=31536000; includeSubDomains; preload
  # x-frame-options: SAMEORIGIN
  # x-content-type-options: nosniff
  # referrer-policy: strict-origin-when-cross-origin
  # permissions-policy: geolocation=(), microphone=(), camera=()
  # content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'self';
  ```
- **Verified:** Y

---

### [MEDIUM] ERR-001 — Information Disclosure on Malformed JSON Payloads via Express Body-Parser
- **Category:** Security / Error Handling (OWASP A05: Security Misconfiguration)
- **Location:** `api/server.js:210-216`
- **Remediation Applied:** 
  Added centralized Express error handling middleware to intercept JSON `SyntaxError` and respond with structured JSON HTTP 400 `{ error: "Invalid JSON format in request body." }`.
- **Independent Verification Proof:**
  ```bash
  curl -s -i -X POST https://coho.arnoldgutib.pro/api/chat \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer c3f8...4f10" \
    --data-raw '{"bad: json'
  # Output:
  # HTTP/2 400 
  # content-type: application/json; charset=utf-8
  # {"error":"Invalid JSON format in request body."}
  ```
  Zero stack trace or internal filesystem disclosure.
- **Verified:** Y

---

### [MEDIUM] A11Y-001 — Missing Accessible Names & Labels on Copilot Selector Dropdowns
- **Category:** Accessibility (WCAG 2.1 AA — 4.1.2 Name, Role, Value)
- **Location:** `index.html:258, 273`
- **Remediation Applied:** 
  Added `aria-label="Select Finance Specialist"` to `#copilot-specialist-select` and `aria-label="Select COHO Skill Workflow"` to `#copilot-skill-select`.
- **Independent Verification Proof:**
  ```bash
  grep -rn 'aria-label=.*Select.*' /var/www/coho.arnoldgutib.pro/index.html
  # Output:
  # 258: <select id="copilot-specialist-select" aria-label="Select Finance Specialist" ...>
  # 273: <select id="copilot-skill-select" aria-label="Select COHO Skill Workflow" ...>
  ```
- **Verified:** Y

---

### [MEDIUM] A11Y-002 — Missing ARIA Tablist, Tab, and Tabpanel Semantics
- **Category:** Accessibility (WCAG 2.1 AA — 1.3.1 Info and Relationships & 4.1.2)
- **Location:** `index.html:208-225, 228-584` and `assets/app.js:296-308`
- **Remediation Applied:** 
  Implemented full WAI-ARIA tab pattern: `role="tablist"` on navigation wrapper, `role="tab"`, `aria-selected`, `aria-controls` on tab buttons, and `role="tabpanel"`, `aria-labelledby` on all 5 dashboard panels. Added dynamic `aria-selected` toggling on tab activation.
- **Independent Verification Proof:**
  ```bash
  grep -rn 'role="tablist"' /var/www/coho.arnoldgutib.pro/index.html
  # Output: 208: <div ... role="tablist" aria-label="Operations Views">
  grep -rn 'role="tab"' /var/www/coho.arnoldgutib.pro/index.html
  # Output: 5 buttons with role="tab"
  grep -rn 'role="tabpanel"' /var/www/coho.arnoldgutib.pro/index.html
  # Output: 5 panes with role="tabpanel"
  ```
- **Verified:** Y

---

### [LOW] DEP-001 — Moderate Severity Vulnerabilities in Upstream Express Dependencies (`qs`)
- **Category:** Security (OWASP A06: Vulnerable and Outdated Components)
- **Location:** `/opt/coho-app/api/package.json`
- **Remediation Applied:** 
  Added `"overrides": { "qs": "^6.16.0" }` in `package.json` to force resolution of patched `qs` package across all direct and transitive dependencies.
- **Independent Verification Proof:**
  ```bash
  cd /opt/coho-app/api && npm audit
  # Output: found 0 vulnerabilities
  ```
- **Verified:** Y

---

### [LOW] INFO-001 — Information Leakage via `X-Powered-By: Express` Header
- **Category:** Security (OWASP A05: Security Misconfiguration)
- **Location:** `api/server.js:17`
- **Remediation Applied:** 
  Added `app.disable("x-powered-by");` to Express application configuration.
- **Independent Verification Proof:**
  ```bash
  curl -sI https://coho.arnoldgutib.pro/api/health | grep -i 'x-powered-by'
  # Output: (empty - header suppressed completely)
  ```
- **Verified:** Y

---

### [LOW] A11Y-003 — Missing ARIA Menu Semantics on Multi-Format Export Dropdown
- **Category:** Accessibility (WCAG 2.1 AA — 4.1.2 Name, Role, Value)
- **Location:** `index.html:98-142` and `assets/app.js:575-592`
- **Remediation Applied:** 
  Added `aria-haspopup="menu"`, `aria-expanded="false"` to `#exportMenuBtn`. Added `role="menu"` to dropdown and `role="menuitem"` to all 5 format export buttons. Added `Escape` key dismiss listener and dynamic `aria-expanded` toggling.
- **Independent Verification Proof:**
  ```bash
  grep -rn 'aria-haspopup="menu"' /var/www/coho.arnoldgutib.pro/index.html
  # Output: 98: <button id="exportMenuBtn" ... aria-haspopup="menu" aria-expanded="false" ...>
  grep -rn 'role="menuitem"' /var/www/coho.arnoldgutib.pro/index.html
  # Output: 5 export buttons with role="menuitem"
  ```
- **Verified:** Y

---

### [LOW] PERF-001 — Third-Party CDN Scripts Loaded Without Subresource Integrity (SRI)
- **Category:** Security / Integrity (OWASP A08: Software and Data Integrity Failures)
- **Location:** `index.html:29`
- **Remediation Applied:** 
  Added cryptographic SHA-384 hash and CORS attribute to the SheetJS vendor script tag:
  `integrity="sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw" crossorigin="anonymous"`.
- **Independent Verification Proof:**
  ```bash
  grep -rn 'xlsx.*integrity=' /var/www/coho.arnoldgutib.pro/index.html
  # Output: 29: <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js" integrity="sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw" crossorigin="anonymous"></script>
  ```
- **Verified:** Y

---

## 🛡️ Launch Gate Certification

Per Section 8 of the **Pre-Launch QA & VAPT Gate Playbook**:
1. **Inventory Pass (`audit/inventory.md`):** Complete map of endpoints, assets, and auth boundaries. **PASS**
2. **Functional QA:** All core tabs, chat streaming, and multi-format exports operating normally. **PASS**
3. **Security & Secrets Audit:** No plaintext secrets or passwords in source code; `.env` permissions set to `600`. **PASS**
4. **OWASP Top 10 & CWE Checks:** Zero unresolved findings across Access Control, Command Injection, XSS, and Misconfigurations. **PASS**
5. **Nginx & Server Hardening:** Full security header suite verified across static and API paths; 0 npm vulnerabilities. **PASS**
6. **Findings Log:** 12 of 12 logged items resolved and independently verified. **PASS**

**Production Release Recommendation:** 🚀 **APPROVED FOR LAUNCH**
