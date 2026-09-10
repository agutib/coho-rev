# AGENTS.md — Universal AI Agent Handover Guide
**Project:** COHO OpsHub — UK HMO Property Operations Center  
**Repository:** https://github.com/agutib/coho-rev  
**Production Site:** https://coho.arnoldgutib.pro  

---

## 🎯 What Any AI Agent Joining This Project Must Know

1. **Who uses this:** Rev (Arnold''s wife). This is her actual, day-to-day web app for managing UK HMO (House in Multiple Occupation) properties, rent reconciliation, tenant arrears, and compliance. Keep all code simple, practical, and dependable.
2. **Architecture:**
   - Client-side Single Page Application (vanilla JS, Tailwind CSS CDN, SheetJS).
   - No build tools (no webpack/vite). Edits to `index.html` or `assets/*.js` take effect immediately upon page reload.
   - Node.js backend (`api/server.js`) on port `3001` providing Gemini 3.6 Flash streaming to the built-in chat widget.
3. **Deployment Target:**
   - Host: `sindbad-dev-web-vm` (`34.124.177.92`), custom SSH Port `2363`.
   - Access: Run via WSL Ubuntu distribution as user `bong`.
   - Webroot: `/var/www/coho.arnoldgutib.pro/` (Nginx).
   - Backend repo: `/opt/coho-app/` managed by PM2 (`coho-api`).

---

## 📂 Project Structure

```
COHO-Property-Operations/
├── index.html                   # Main dashboard (Tabs: Reconciler, Radar, Directory, SOP)
├── login.html                   # Password auth gate (WebCrypto SHA-256)
├── start-app.bat                # Windows 1-click launcher
├── CLAUDE.md                    # Claude Code instructions
├── AGENTS.md                    # Universal Agent handover
├── CONTEXT_HANDOVER.md          # Complete chronological project dossier
├── assets/
│   ├── app.js                   # Application state, UI rendering, event listeners
│   ├── parser.js                # CSV & Excel (.xlsx) intake parser for bank & COHO files
│   ├── reconciler.js            # Auto-matching engine (Cleared, Partial, Missing, Overpaid)
│   ├── templates.js             # Message generators (Arrears notices, Landlord summaries)
│   ├── theme.js                 # Dark & Light theme controller (localStorage persistence)
│   └── chat.js                  # In-app AI chat widget + interactive prompt guide
├── api/
│   ├── server.js                # Express API proxy, rate limiter, Gemini SSE streaming, git push
│   ├── package.json             # Dependencies (@google/genai, express, cors, dotenv, etc.)
│   └── coho-system-prompt.js    # HMO personality + 6 Finance Specialists + dynamic rule loader
├── skills/
│   └── coho-property-operations-assistant/
│       ├── SKILL.md             # Master property management skill
│       ├── agents/              # TOML definitions for 6 finance specialists
│       └── references/
│           ├── learned-rules.md # 🧠 Dynamic rule store (auto-updated by Rev's instructions)
│           ├── rent-and-arrears.md
│           ├── reconciliation-and-bookkeeping.md
│           ├── maintenance-and-suppliers.md
│           ├── compliance-administration.md
│           ├── communications.md
│           ├── reporting-and-kpis.md
│           └── approvals-and-escalation.md
├── docs/
│   ├── REVS_DAILY_GUIDE.md      # 5-minute morning routine guide for Rev
│   ├── REVS_AI_CHAT_GUIDE.md    # Guide on how to talk to the AI and teach rules
│   └── USER_FEEDBACK_LOG.md     # 📋 Log of Rev's complaints, bugs, & feature ideas
└── sample-data/                 # Sample bank CSVs and rent rolls for testing
```

---

## 🤖 Built-In AI & Continuous Learning Mechanics

- **Gemini Model:** `gemini-3.6-flash` using `@google/genai` v1.x (`chunk.text` property).
- **6 Finance Specialists Injected:**
  1. *Bookkeeper & Controller:* 3-way matching, month-end close.
  2. *Accounts Payable Specialist:* Work order vs invoice audits, utility bills.
  3. *Financial Analyst:* Gross/net yield, RevPAM, void loss.
  4. *FP&A Analyst:* Cash flow forecast, budget variance.
  5. *Property Tax Strategist:* Repairs vs capital improvements, Section 24.
  6. *CFO:* Sinking funds, capex reserves.
- **Trigger for Teaching:** If Rev starts a chat message with *"Remember this rule: ..."*, the AI outputs `[[LEARNED_RULE: {...}]]`. The backend captures this, writes to `learned-rules.md`, commits, pushes to Git, and injects it into every future conversation.
- **Trigger for Feedback:** If Rev complains or suggests a feature, the AI outputs `[[APP_FEEDBACK: {...}]]`. The backend writes to `USER_FEEDBACK_LOG.md` and commits to Git.

---

## 🔒 Security Best Practices

- **Never put passwords or API keys in git.**
- Server `.env` is stored at `/opt/coho-app/api/.env` with permissions `600`.
- Browser never sees the Gemini API key; calls go to `/api/chat` which Nginx proxies internally to port 3001.
- All scanner exploit probes (`phpunit`, `.env`, `eval-stdin`) are dropped with HTTP 444 by Nginx.
