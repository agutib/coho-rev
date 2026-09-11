# Complete Project Context & Handover Dossier
**Generated:** September 10, 2026  
**Project:** COHO OpsHub (UK HMO Property Operations Center)  
**Author / Maintainer:** Arnold Gutib (agutib)  
**Primary End-User:** Rev (Arnold''s wife) — Property Operations Manager  
**Production Site:** https://coho.arnoldgutib.pro  
**GitHub Repository:** https://github.com/agutib/coho-rev  

---

## 1. Executive Summary & Purpose

COHO OpsHub is a purpose-built web application designed to save Rev hours of manual work in her day-to-day role managing UK HMO (Houses in Multiple Occupation) properties. 

Rev uses it to:
1. Drag and drop morning bank statement CSVs and COHO rent schedule exports.
2. Automatically reconcile payments to tenants and rooms (Cleared, Partial arrears, Missing, Overpaid).
3. Generate 1-click polite arrears reminder messages and executive landlord collection summaries.
4. Track statutory HMO compliance expirations (Gas Safety CP12, EICR, EPC, HMO Licence, Deposit Protection 30-day deadlines).
5. Interact with a built-in AI Assistant that embodies 6 specialized Finance Division agents, learns property rules continuously when taught, and records app feedback for development.

---

## 2. Infrastructure & Deployment Topology

```
Internet (Browser)
       │
       ▼ (HTTPS :443)
[Let's Encrypt SSL (Shared SAN cert: arnoldgutib.pro)]
       │
       ▼
[Nginx 1.18 Reverse Proxy on sindbad-dev-web-vm (34.124.177.92)]
 ├── /          ──► Serves Static Web SPA from /var/www/coho.arnoldgutib.pro/
 └── /api/chat  ──► Proxies (HTTP 1.1, no-buffer) to 127.0.0.1:3001
                          │
                          ▼
             [Node.js Express Backend]
             (Runs under PM2: coho-api in /opt/coho-app/api)
                          │
                          ▼
             [Google Gemini 3.6 Flash]
```

### Server Specification:
- **Server Name:** `sindbad-dev-web-vm`
- **Public IP:** `34.124.177.92`
- **SSH Port:** `2363`
- **GCP Project:** `sindbad-web-project` (Zone: `asia-southeast1-c`)
- **OS:** Ubuntu 20.04 LTS
- **Node.js:** v20.14.0 (managed via nvm at `/usr/local/.nvm/versions/node/v20.14.0/bin`)
- **Webroot:** `/var/www/coho.arnoldgutib.pro/`
- **App Repo on VM:** `/opt/coho-app/`

---

## 3. Important Historical Fixes & Lessons Learned

If you are maintaining this system in any AI tool, keep these critical points in mind:

1. **SSL Certificate Path:**
   - **Crucial:** `coho.arnoldgutib.pro` uses the shared SAN certificate located at `/etc/letsencrypt/live/arnoldgutib.pro/fullchain.pem` (and `privkey.pem`).
   - Do NOT point to `/etc/letsencrypt/live/coho.arnoldgutib.pro/` — doing so caused HTTP/2 connection pooling certificate mismatches.
2. **Gemini SDK Method vs. Property:**
   - In `@google/genai` v1.x: streaming chunk text is accessed via property `chunk.text`, NOT method `chunk.text()`. Calling `chunk.text()` causes runtime TypeError.
3. **Model Versioning:**
   - `gemini-2.0-flash` was deprecated/sunset. Always use `gemini-3.6-flash`.
4. **PM2 Environment & Path:**
   - PM2 is installed at `/usr/local/.nvm/versions/node/v20.14.0/bin/pm2`.
   - Before executing pm2 or node commands in non-interactive SSH sessions, always export:  
     `export PATH=/usr/local/.nvm/versions/node/v20.14.0/bin:$PATH`
5. **PowerShell Quoting in Windows:**
   - Chaining commands with `&&` in PowerShell fails; run them sequentially.
   - When passing multiline JSON or scripts through `wsl ... ssh`, write to a temp file and SCP it rather than inline quoting to avoid PowerShell argument mangling.

---

## 4. Key Credentials & Security Policy

- **Site Password:** `coho@2026!` (Validated client-side via SHA-256 WebCrypto: `c3f89002f28c39474375003faf4f51cccce5a77b515696194ba280c3b5ee4f10`).
- **Gemini API Key:** Stored on the server at `/opt/coho-app/api/.env` with `chmod 600`.
- **GitHub PAT:** Optional environment variable `GITHUB_PAT` in `/opt/coho-app/api/.env` enables automatic remote push of learned rules.

---

## 5. Summary of Built Features

| Feature | Where it Lives | Description |
|---|---|---|
| **Reconciler & Rent Roll** | `assets/reconciler.js`, `assets/app.js` | Fuzzy and exact matcher between bank CSV and COHO rent schedule. |
| **Compliance Radar** | `assets/app.js`, `index.html` | Expiry tracking with color badges for HMO regulations. |
| **6 Finance Specialists** | `api/coho-system-prompt.js`, `skills/` | Deep financial reasoning: Controller, AP, Yield, FP&A, Tax, CFO. |
| **Continuous Learning** | `api/server.js`, `learned-rules.md` | Intercepts *"Remember this rule:"*, saves to disk, feeds into future prompts. |
| **User Feedback Logger** | `api/server.js`, `docs/USER_FEEDBACK_LOG.md` | Logs Rev''s complaints and suggestions for iterative development. |
| **User Guide Modal** | `assets/chat.js`, `docs/REVS_AI_CHAT_GUIDE.md` | Clickable prompt cards inside the chat for instant testing. |
| **Dark & Light Theme** | `assets/theme.js`, `index.html` | Zero-FOUC theme toggle with `localStorage` persistence. |
| **Antigravity AI Copilot** | `assets/chat.js`, `index.html` | Full first-class workspace tab with drag-and-drop file intake, live OpsHub synchronization, 6 specialist switcher, and rich markdown rendering. |
| **5-Format Export Suite** | `assets/app.js`, `index.html` | Multi-format operational exports: Excel (.xlsx via SheetJS), Executive PDF Report (.pdf), Word Document (.doc), Standard CSV (.csv), and Google Sheets (TSV clipboard copy). |

