# COHO OpsHub: UK Property & HMO Operations Web Application

A dedicated, local-first web application designed specifically for UK HMO & property management operations and property bookkeeping.

Built to automate daily cross-referencing between **COHO Rent Schedules**, **Bank Statements**, **Statutory Compliance Registers**, and **Tenant/Landlord Communications**.

---

## Key Features

1. **Intelligent File Intake:**
   - Drag & drop CSV or Excel files (`.csv`, `.xlsx`, `.xls`).
   - Auto-detects whether the file is a Bank Statement, a COHO Rent Roll, or a Compliance Tracker.
   - All data is parsed locally in the browser—client bank details never leave the computer.

2. **Automated Rent Reconciler:**
   - Auto-matches bank transactions to tenancies using fuzzy tenant names, room identifiers, and payment amount windows.
   - Detects Cleared, Partial, Missing, and Overpaid rent.
   - Separate **Suspense Account Box** for unallocated bank credits with unknown references.

3. **Statutory HMO Compliance Radar:**
   - Monitors Gas Safety (CP12), EICR, EPC, HMO Licence capacity limits, and the statutory 30-day DPS deposit protection countdown.
   - Automatic warnings for items expiring within 30 days.

4. **1-Click Message Generator:**
   - Auto-generates neutral, professional arrears reminders, move-in welcome packs, and landlord monthly summaries.
   - One-click copy to clipboard for instant pasting into COHO, Email, or WhatsApp.

5. **"Nothing-Slips" 8-Question Audit Engine:**
   - Generates instant operational audit logs (`Who, Where, What, When, How Much, Why, Does it Tie, What Next`) for any tenancy record.

6. **Local Persistence:**
   - Records persist in browser storage (`localStorage`) across browser refreshes and restarts.
   - One-click **"Load Demo Data"** button for practice and demonstration.

---

## Directory Structure

```
COHO-Property-Operations/
├── index.html                   # Main web application
├── start-app.bat                # 1-Click Windows desktop launcher
├── README.md                    # Technical documentation
├── assets/
│   ├── app.js                   # Application state & UI controller
│   ├── reconciler.js            # Bank-to-COHO matching algorithm
│   ├── parser.js                # CSV/Excel parsing & normalizer
│   └── templates.js             # Tenant & Landlord message generator
├── sample-data/
│   ├── sample_coho_rent_roll.csv
│   ├── sample_bank_statement.csv
│   └── sample_compliance_tracker.csv
└── docs/
    └── REVS_DAILY_GUIDE.md      # Rev's 5-minute everyday operating manual
```

7. **Built-in AI Operations & Finance Suite:**
   - Powered by Google Gemini 3.6 Flash via internal streaming proxy.
   - Includes 6 Finance Specialists: Bookkeeper/Controller, AP Specialist, Financial Analyst, FP&A Analyst, Property Tax Strategist, and CFO.
   - Continuous Learning: Intercepts *"Remember this rule: ..."* and updates property skills on GitHub automatically.
   - User Feedback Logger: Automatically routes Rev's bug reports and feature ideas to `docs/USER_FEEDBACK_LOG.md`.

8. **Simple Dark & Light Theme:**
   - Toggle button in header (`🌙` / `☀️`) with zero-FOUC and local preference persistence.

---

## 🤖 Handover Guides for Other AI Tools (Claude, Codex, Cursor, etc.)

If you are switching AI assistants or hit rate limits, point your new AI tool to these handover files:
- **`CLAUDE.md`** — Dedicated rules and operational manual for **Claude Code**.
- **`AGENTS.md`** — Universal architectural handover for **OpenAI Codex, Cursor, Windsurf, Copilot**.
- **`CONTEXT_HANDOVER.md`** — Complete session chronology, lessons learned, and exact server commands.

---

## Quick Start
1. Live Production Site: [https://coho.arnoldgutib.pro](https://coho.arnoldgutib.pro) (Password: `coho@2026!`).
2. Local Development: Double-click `start-app.bat` (or open `index.html` in Chrome or Edge).
3. Click **"⚡ Load Demo Data"** to test the full portfolio and bank match.
4. Drop your real bank or COHO export files to start daily operations!

