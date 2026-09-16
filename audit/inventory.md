# Application Audit Inventory & Attack Surface Tracker
**Project:** Rev OPS Hub — Multi-Client Operations Command Center  
**Target:** `https://rev.arnoldgutib.pro` (Redirect: `https://coho.arnoldgutib.pro` → 301) | `sindbad-dev-web-vm` (`34.142.222.26:2363`)  
**Audit Framework:** `prelaunch-qa-vapt-gate` & Multi-Specialist Agent Suite  
**Date:** 2026-09-13  

---

## 1. Routes & Pages
- [x] `/` (Nginx HTTP to HTTPS 301 redirect)
- [x] `/home` (Main Single Page Application Executive Portal, HTTP 200)
- [x] `/index.html` (Canonical SPA HTML; Nginx 301 redirects to `/home`; `history.replaceState` canonicalization)
- [x] `/login.html` (Authentication Gateway, WebCrypto SHA-256 password challenge)
- [x] `#/hub` (Rev OPS Hub Executive Portal: 3 Client Cards & Cross-Client Gemini AI Copilot)
- [x] `#/coho` (COHO Operations Center: HMO Reconciler, Radar, Directory, SOP, Copilot)
- [x] `#/p360` (People360 Operations: Workforce, Scheduling, HR, Payroll, Copilot)
- [x] `#/isi` (Innovuze Solutions Inc Operations: Tech Services, SLAs, Deliverables, Copilot)
- [x] `#pane-ai-copilot` (Antigravity AI Copilot Workspace tab inside COHO)
- [x] `#pane-reconciler` (Rent Reconciler & Arrears Schedule tab)
- [x] `#pane-compliance` (HMO Compliance Radar tab)
- [x] `#pane-tenancies` (Tenancy Directory tab)
- [x] `#pane-nothing-slips` ("Nothing-Slips" SOP Reference tab)

---

## 2. API Endpoints
- [x] `POST /api/chat`
  - **Transport:** HTTP/2 (Nginx reverse proxy to Node.js `127.0.0.1:3001`)
  - **Auth Requirement:** Bearer Token required (`COHO_AUTH_TOKEN` header validation)
  - **Rate Limiting:** `express-rate-limit` (30 req/min per IP)
  - **Input Schema:** JSON `{ message: string, history?: Array<{role, text}>, clientContext?: string }`
  - **Output:** Server-Sent Events (`text/event-stream`) streaming Gemini response chunks + multi-tenant learning tags
- [x] `GET /api/health`
  - **Transport:** HTTP/2 (Nginx reverse proxy to Node.js `127.0.0.1:3001`)
  - **Auth Requirement:** None (Public)
  - **Output:** JSON `{ status: "ok", service: "coho-chat-api", learningEngine: "active", financeSpecialists: 6 }`
  - **Transport:** HTTP/2 (Nginx reverse proxy to Node.js `127.0.0.1:3001`)
  - **Auth Requirement:** None (Public)
  - **Output:** JSON `{ status: "ok", service: "coho-chat-api", learningEngine: "active", financeSpecialists: 6 }`

---

## 3. Storage & State Persistence
- [x] **Browser `localStorage`:**
  - `coho_theme`: UI theme preference (`light` or `dark`)
  - `coho_rent_roll`: Active tenant roll JSON array
  - `coho_bank_txns`: Active bank statement transactions JSON array
  - `coho_compliance`: HMO compliance register JSON array
- [x] **Browser `sessionStorage`:**
  - `coho_auth`: Client-side authentication flag (`'true'`)
  - `coho_auth_time`: Timestamp of successful login
- [x] **Server Flat-File Repositories:**
  - `skills/coho-property-operations-assistant/references/learned-rules-coho.md`: COHO HMO learning rule store
  - `skills/coho-property-operations-assistant/references/learned-rules-p360.md`: People360 learning rule store
  - `skills/coho-property-operations-assistant/references/learned-rules-isi.md`: Innovuze Solutions Inc learning rule store
  - `docs/USER_FEEDBACK_LOG.md`: User complaints, bugs, and feature request log

---

## 4. Forms & Client Inputs
- [x] **Login Form (`login.html`):**
  - `#password`: Password input with SHA-256 client hash check against hardcoded hash
- [x] **File Intake Handlers:**
  - `#file-input`: Hidden file input on main dashboard (accepts `.csv`, `.xlsx`, `.xls`)
  - `#copilot-file-input`: Hidden file input in AI Copilot Workspace
  - `#copilot-workspace` Drag & Drop Overlay: Ingests dropped CSV/Excel files directly
- [x] **Filters & Search Inputs:**
  - `#table-search`: Real-time text filter across property, room, tenant name, and status
  - `#status-filter`: Dropdown select (`ALL`, `CLEARED`, `PARTIAL`, `MISSING`, `OVERPAID`)
- [x] **AI Chat Form:**
  - `#copilot-input`: Multi-line textarea for prompt input and auto-resizing
  - `#copilot-specialist-select`: Select dropdown for 6 Finance Specialists
  - `#copilot-skill-select`: Select dropdown for 8 COHO SOP Workflows

---

## 5. Third-Party Integrations & CDN Dependencies
- [x] **Google Gemini API (`@google/genai` v1.x):**
  - Upstream Model: `gemini-3.6-flash`
  - Streaming: `generateContentStream` with dynamic system prompt injection
- [x] **Tailwind CSS CDN:**
  - `https://cdn.tailwindcss.com` (Runtime styling engine)
- [x] **SheetJS (xlsx):**
  - `https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js` (Excel workbook parsing & export)
- [x] **Google Fonts:**
  - `https://fonts.googleapis.com` & `https://fonts.gstatic.com` (Inter & JetBrains Mono)
- [x] **GitHub Integration:**
  - Push sync via `GITHUB_PAT` to `https://github.com/agutib/coho-rev.git`

---

## 6. Environment Variables & Credentials
- [x] `PORT`: Express server listen port (default: 3001)
- [x] `GEMINI_API_KEY`: Google Gemini API key (stored in `/opt/coho-app/api/.env`, perm 600)
- [x] `GITHUB_PAT`: GitHub Personal Access Token for auto-committing learned rules
- [x] Server SSH Access: Port `2363`, key-authenticated user `bong`

---

## 7. Background Workers & Services
- [x] **PM2 Process:** `coho-api`
  - Script: `/opt/coho-app/api/server.js`
  - Interpreter: Node.js v20.14.0
  - Autostart: systemd / PM2 resurrect
- [x] **Nginx Web Server:**
  - Version: 1.18.0 (Ubuntu)
  - Vhost: `/etc/nginx/sites-enabled/*` (`coho.arnoldgutib.pro`)
  - Webroot: `/var/www/coho.arnoldgutib.pro/`
