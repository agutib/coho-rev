# CLAUDE.md — Project & Agent Handover Manual
**Project:** Rev OPS Hub — Multi-Client Operations Command Center (COHO, People360, Innovuze Solutions Inc)  
**Target User:** Rev (Arnold's wife) — Multi-Client Operations Manager  
**Live URL:** https://rev.arnoldgutib.pro  
*(Redirected Legacy Domain: https://coho.arnoldgutib.pro → HTTP 301)*  
**GitHub Repository:** https://github.com/agutib/coho-rev  

---

## ⚡ Superpowers Integration (Claude Code)
Superpowers skills library is installed globally and in `.claude/skills`:
- **Global & Workspace Skills:** `~/.claude/skills/` and `.claude/skills/`
- **Core Workflows:** Invoke `using-superpowers`, `brainstorming`, `writing-plans`, `executing-plans`, `test-driven-development` (TDD), and `systematic-debugging`.
- **Methodology:** Brainstorm before planning; write failing test before code; systematic debugging before guessing.

---

## 🚨 Essential Environment & Server Access Rules

1. **WSL Execution Rule:**
   - Always run remote/SSH commands through WSL **Ubuntu** distribution as user **bong**:
   ```bash
   wsl -d Ubuntu -u bong -- bash -c "ssh -i /home/bong/.ssh/google_compute_engine -p 2363 -o StrictHostKeyChecking=no bong@34.124.177.92 '<command>'"
   ```
2. **Server Details (`sindbad-dev-web-vm`):**
   - **IP:** `34.124.177.92`
   - **SSH Port:** `2363` (Custom port)
   - **GCP Project:** `sindbad-web-project` (Zone: `asia-southeast1-c`)
   - **Active GCloud User:** `arnold@sindbad.tech` (never `development@sindbad.tech`)
3. **Paths on the Server:**
   - **Web Frontend Root:** `/var/www/coho.arnoldgutib.pro/` (owned by `www-data:www-data`)
   - **Unified Git & Backend App Root:** `/opt/coho-app/` (owned by `bong:bong`)
   - **Node.js API Directory:** `/opt/coho-app/api/`
   - **Node / PM2 Binary Path:** `/usr/local/.nvm/versions/node/v20.14.0/bin`
   - **PM2 Service Name:** `coho-api` (runs on `127.0.0.1:3001`, Nginx proxies `/api/`)
   - **Nginx Config:** `/etc/nginx/sites-available/coho.arnoldgutib.pro`
   - **SSL Certificate:** `/etc/letsencrypt/live/arnoldgutib.pro/fullchain.pem` (Shared SAN covering `coho.arnoldgutib.pro` — do NOT change cert path)
4. **Authentication & Passwords:**
   - **Site Login:** Single password via `login.html` (SHA-256: `c3f89002f28c39474375003faf4f51cccce5a77b515696194ba280c3b5ee4f10`)
   - **Gemini API Key:** Stored strictly in `/opt/coho-app/api/.env` as `GEMINI_API_KEY=...` (never commit `.env`)

---

## 🏗️ Architecture & Technology Stack

- **Frontend:** Vanilla JavaScript SPA, Tailwind CSS (via CDN), SheetJS (`xlsx.full.min.js`), Google Fonts (Inter & JetBrains Mono).
- **No Build Step Required:** Direct browser execution (`index.html`, `login.html`, `assets/`).
- **Backend:** Node.js Express server (`api/server.js`) on port `3001` with SSE (Server-Sent Events) streaming.
- **AI Model:** Google Gemini 3.6 Flash (`gemini-3.6-flash` via `@google/genai` v1.x SDK).
- **Process Manager:** PM2 keeps `api/server.js` running 24/7 with auto-restart on boot.

---

## 🌟 Core System Features & Where They Live

### 1. Daily Property Operations (`assets/app.js`, `assets/reconciler.js`)
- **Bank-to-Rent Reconciliation:** Matches bank credits against tenant rent schedules (Cleared, Partial, Missing, Overpaid).
- **Unallocated Suspense Account:** Catches unidentified bank credits for investigation.
- **HMO Compliance Radar:** Tracks CP12 Gas Safety, EICR, EPC, HMO Licences, and DPS deposit registrations.
- **Communication Templates:** One-click message generator for rent arrears reminders and landlord reports.

### 2. Built-in AI Chat Assistant (`assets/chat.js`, `api/server.js`, `api/coho-system-prompt.js`)
- Floating bubble (bottom-right) + sliding panel with streaming responses.
- Shortcut: `Ctrl + /` to toggle chat.
- Contains the **6 Finance Division Specialists**:
  1. *Bookkeeper & Controller:* 3-way matching, month-end close checklists, audit readiness.
  2. *Accounts Payable (AP):* Contractor invoice audits against work orders, HMO utility bill checks.
  3. *Financial Analyst:* Gross/net yield, RevPAM/RevPAR, void cost analysis.
  4. *FP&A Analyst:* Cash flow forecasting, budget vs actuals variance.
  5. *Property Tax Strategist:* Revenue repairs vs capital improvements, Section 24 mortgage interest relief.
  6. *CFO:* Sinking funds, reserve planning for boilers/roofs, landlord distribution safety buffers.

### 3. Continuous Learning Engine
- Whenever Rev says *"Remember this rule: ..."*, *"Save this: ..."*, or *"Add to skill: ..."*:
  - The AI captures the rule and appends it to:  
    `skills/coho-property-operations-assistant/references/learned-rules.md`
  - The AI **immediately remembers it in all future chats without server restart**.
  - Asynchronously commits and pushes to GitHub `agutib/coho-rev`.

### 4. Rev's App Feedback Logger
- Whenever Rev complains about friction or suggests an improvement:
  - The AI captures it and appends it to:  
    `docs/USER_FEEDBACK_LOG.md` under `Pending Assessment`.
  - Pushes to GitHub so the dev team can review and build it.

### 5. Interactive User Guide Modal (`assets/chat.js`, `docs/REVS_AI_CHAT_GUIDE.md`)
- Clicking `💡 AI Guide` in the top toolbar or chat header opens a guide with one-click prompt cards.
- Clicking any card pre-fills Rev''s chat input automatically.

### 6. Simple Dark & Light Theme (`assets/theme.js`)
- Toggle button `🌙` / `☀️` in header and login page.
- Persistent via `localStorage.getItem('coho_theme')`.
- Zero-FOUC (Flash of Unstyled Content) via synchronous `<head>` script.

---

## 🛠️ Common Maintenance & Deployment Commands

### ⚠️ MANDATORY PRE-CHECK: Pre-Launch QA & VAPT Gate
**Hard rule: NO `git push`, NO merge, and NO deploy command may be run until all Section 8 gates PASS.**
- Check `audit/inventory.md` coverage.
- Confirm zero unresolved Critical/High findings in `audit/findings.md`.
- Run secret scans and verify no `.env` or sensitive keys are staged.
- Full details in `docs/PRELAUNCH_QA_VAPT_GATE_PLAYBOOK.md`.

### Git Push from Windows (Powershell)
```powershell
# In c:\Users\Bong\Desktop\Automation\COHO-Property-Operations
git add -A
git commit -m "feat: your change description"
git push origin main
```


### Deploy Latest Code to Server (`sindbad-dev-web-vm`)
```bash
wsl -d Ubuntu -u bong -- bash -c "ssh -i /home/bong/.ssh/google_compute_engine -p 2363 -o StrictHostKeyChecking=no bong@34.124.177.92 '
  cd /opt/coho-app && git pull origin main
  sudo cp /opt/coho-app/index.html /var/www/coho.arnoldgutib.pro/
  sudo cp /opt/coho-app/login.html /var/www/coho.arnoldgutib.pro/
  sudo cp -r /opt/coho-app/assets /var/www/coho.arnoldgutib.pro/
  sudo chown -R www-data:www-data /var/www/coho.arnoldgutib.pro
  export PATH=/usr/local/.nvm/versions/node/v20.14.0/bin:\$PATH
  pm2 restart coho-api
  echo DEPLOY_SUCCESS
'"
```

### Check Backend Health & PM2 Status
```bash
wsl -d Ubuntu -u bong -- bash -c "ssh -i /home/bong/.ssh/google_compute_engine -p 2363 -o StrictHostKeyChecking=no bong@34.124.177.92 '
  export PATH=/usr/local/.nvm/versions/node/v20.14.0/bin:\$PATH
  pm2 list
  curl -s http://127.0.0.1:3001/api/health
'"
```
