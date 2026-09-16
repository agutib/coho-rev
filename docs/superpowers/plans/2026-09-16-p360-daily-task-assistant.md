# Implementation Plan: People360 Daily Task Report Assistant & Cherry-Pick Engine

Build an automated **Daily Task Reporting Assistant** inside the **People360 (P360)** workspace for Rev to streamline her daily end-of-day reporting to CEO Mike. The system replaces manual typing with a structured **5-Category Cherry-Pick Task Checklist** (derived from her entire 2026 logs), live **Shift Tracking (`IN` / `OUT` / `EOD`)**, **AI Deduplication**, direct **Outlook Email Dispatch** (`[ Daily Task Report — YYYY-Mm-DD ]`), **1-Click Slack / Teams Copy**, and **Shift History Archiving**.

---

## 🎯 User Review Required

> [!IMPORTANT]
> **Key Design Decisions & Enforcements:**
> 1. **Subject Format:** MUST strictly adhere to `[ Daily Task Report — YYYY-Mm-DD ]` (or date range e.g. `2026-Sep-03 and 04`).
> 2. **Report Structure:** Exactly two sections:
>    - `Progress:` (primary bullets `•` and secondary sub-bullets `o`)
>    - `Plans/To-Do:` (primary bullets `•`)
>    - **Zero narrative intro, zero greetings ("Hi Mike"), zero sign-offs ("Best, Rev").**
> 3. **Outlook Sender:** Rev's own authenticated Outlook account via:
>    - Direct Web Outlook compose deep-link (`https://outlook.office.com/mail/deeplink/compose?subject=...&body=...`).
>    - Desktop `mailto:` fallback.
> 4. **Strict Isolation:** People360 is completely independent from COHO. Absolutely no HMO, landlord, tenant, or rent roll terminology will appear in P360 reports or prompts.

---

## 🏛️ Architecture & Data Flow

```mermaid
graph TD
    A["Rev enters People360 Workspace (#/p360)"] --> B{"Action: Clock In"}
    B -->|Click '[🟢 Clock In]' or chat 'IN'| C["Shift Tracker Active<br/>Timer starts • Hubstaff sync indicator"]
    
    C --> D["Rev selects tasks from Cherry-Pick Catalog<br/>(Invoicing, Reconciliations, Payroll, Onboarding, Financials)"]
    C --> E["Rev adds ad-hoc notes / pastes Hubstaff activity"]
    
    D & E --> F{"Action: Clock Out / EOD"}
    F -->|Click '[🔴 Clock Out / EOD]' or chat 'EOD' / 'OUT'| G["Shift Timer Stops"]
    
    G --> H["AI Deduplication & Normalization Engine<br/>(Gemini 3.6 Flash + Deterministic Local Fallback)"]
    H --> I["Editable Report Preview Card<br/>(Strict Progress & Plans/To-Do format)"]
    
    I --> J1["[📧 Send via Outlook]<br/>Deep-link with subject '[ Daily Task Report — YYYY-Mm-DD ]'"]
    I --> J2["[📋 Copy for Slack / Teams]<br/>Instant clipboard copy with toast"]
    I --> J3["[💾 Save to Shift History]<br/>Persisted to LocalStorage archive table"]
```

---

## 📂 5-Category Pre-Saved Recurring Task Catalog (From Rev's 2026 Logs)

1. **Invoicing & Accounts Receivable (Stripe, Xero, ClickUp):**
   - Review Outstanding Invoices Report and monitor Stripe open invoices.
   - Generate VA shift reports from Connecteam for invoicing reference.
   - Finalize invoice, email in Stripe, and record in Xero (`SHERMAN`, `SIF`, `MEC`, `COACHIT`, `GRINDHAUS`, `MAIA`, `HALSTEDLAW`, `KAPEXP`, `BLISSP`, `VMSPORTS`, `DRURYDES`, `EDGEN`, `WARRIOR`, `BELLADIA`, `RV6`, `VHG`).
   - Mark invoices as paid in Xero & Stripe; send payment receipts.
   - Apply client deposits or issue credit notes / buyout invoices in Stripe & Xero.
   - Update Customer Invoice Monitoring Sheet & ClickUp Invoice Table.

2. **Bank & Ledger Reconciliation (Wells Fargo, Wise, Stripe):**
   - Record and reconcile transactions under `Business Checking Wells Fargo 6470`.
   - Record and reconcile transactions under `Credit Card Wells Fargo Signify 6187`.
   - Record and reconcile transactions under `Stripe Business People 360`.
   - Record and reconcile transactions under `Wise Business People 360`.
   - Download, import, and reconcile monthly/weekly Wise statements in Xero.
   - Record Stripe processing fees and Stripe payouts to Wells Fargo.

3. **Payroll Processing & Disbursements (Wise, Connecteam, Hubstaff):**
   - Work on semi-monthly payroll (1st–15th and 16th–end-of-month periods).
   - Review and audit VA/staff timesheets in Connecteam and Hubstaff; approve timesheets.
   - Prepare Wise batch payment filewriters (`People 360` PHP recipients & `Napoli/Trampetti` USD recipients).
   - Process payroll batch payments in Wise; update payroll working files with actual USD charges.
   - Upload employee payslips to Connecteam and folder paths.
   - Endorse to Mike: dollar amounts for Wise accounts top-up and payroll approvals.

4. **Personnel Onboarding & Credential Tracking:**
   - Add new hires: Wise recipient, Xero contact, payroll data monitoring file and payroll notes.
   - Archive resigned/inactive staff in Connecteam and adjust rosters.
   - Adjust Hubstaff weekly/daily hour limits or idle time for staff.
   - Address staff queries re payslips, rates, and schedule adjustments.

5. **Financial Reporting & Owner Dividends:**
   - Compute and endorse to Mike: Owner's Dividend / Trampetti Referral Fees.
   - Record bills and process payments in Wise for Owner's Dividend.
   - Generate and publish monthly Profit & Loss and Balance Sheet in Xero.
   - Post adjusting entries for monthly service revenue.

---

## 🛠️ Proposed File Changes

### 1. Backend & AI Rules
#### [NEW] [`skills/.../learned-rules-p360.md`](file:///c:/Users/Bong/Desktop/Automation/COHO-Property-Operations/skills/coho-property-operations-assistant/references/learned-rules-p360.md)
- Store People360 operational context, systems, bank accounts, clients, and Mike's strict report guidelines.

#### [MODIFY] [`api/coho-system-prompt.js`](file:///c:/Users/Bong/Desktop/Automation/COHO-Property-Operations/api/coho-system-prompt.js)
- When `clientContext === 'p360'`, inject the exact `daily-task-report` prompt logic:
  - Recognize `IN` (clock in confirmation) and `EOD`/`OUT` (compilation trigger).
  - Treat task notes dropped during the day as passive logs (lightweight ack).
  - Enforce two-bucket output (`Progress:` and `Plans/To-Do:`), correct bullet hierarchy (`•` and `o`), and deduplication.

### 2. Frontend View & Components
#### [MODIFY] [`index.html`](file:///c:/Users/Bong/Desktop/Automation/COHO-Property-Operations/index.html)
- In `#view-workspace-p360`, replace the placeholder onboarding card with:
  - **Shift Tracker Bar**: Live digital timer, Status pill (`🟢 TRACKER ACTIVE` / `⚪ TRACKER OFF`), `Clock In (IN)` & `Clock Out / EOD (OUT)` buttons, Hubstaff background indicator.
  - **Cherry-Pick Task Catalog**: 5 interactive accordions with checkboxes and client pills for fast one-click selection.
  - **Ad-Hoc / Custom Notes Area**: Textarea for pasting raw notes, specific invoice numbers, or Hubstaff activity dumps.
  - **Plans / Next Actions Input**: Textarea for follow-ups.
  - **Live Report Preview Card**: Rich editable textarea displaying the compiled text, copy buttons, and Outlook launcher.
  - **Shift History Archive**: Persistent table showing date, shift hours, duration, and past reports with view/re-copy actions.

### 3. Frontend Logic & Dispatch Suite
#### [MODIFY] [`assets/app.js`](file:///c:/Users/Bong/Desktop/Automation/COHO-Property-Operations/assets/app.js)
- Implement `P360` object module:
  - `state`: `clockedIn`, `startTime`, `elapsedSeconds`, `checkedTasks`, `customNotes`, `plansNotes`, `compiledReport`.
  - `clockIn()`: Sets clock, starts interval timer, persists in `localStorage.p360_shift_state`.
  - `clockOut()`: Stops interval timer, automatically compiles the report.
  - `compile()`: Collects all checked tasks and notes, deduplicates repeating entries, formats two buckets, and puts into preview box.
  - `sendOutlook()`: Builds URL `https://outlook.office.com/mail/deeplink/compose?subject=...&body=...` and fallback `mailto:` with subject `[ Daily Task Report — YYYY-Mm-DD ]`.
  - `copySlack()`: Formats with markdown and copies to clipboard.
  - `saveToHistory()`: Appends report to `localStorage.p360_history` and re-renders table.

#### [MODIFY] [`assets/chat.js`](file:///c:/Users/Bong/Desktop/Automation/COHO-Property-Operations/assets/chat.js)
- In Copilot, when `currentClientContext === 'p360'`:
  - If user sends `IN`: Automatically trigger `P360.clockIn()` in the UI and show affirmative response.
  - If user sends `EOD` or `OUT`: Automatically trigger `P360.clockOut()`, compile report, and populate the preview card.
  - Update quick prompt pills to show People360 action shortcuts.

### 4. Automated Testing
#### [NEW] [`tests/p360-report.test.js`](file:///c:/Users/Bong/Desktop/Automation/COHO-Property-Operations/tests/p360-report.test.js)
- Test suite verifying:
  - Subject line formatting (`[ Daily Task Report — YYYY-Mm-DD ]`).
  - Strict two-bucket output (`Progress:` and `Plans/To-Do:`).
  - Deduplication between raw notes and checked tasks.
  - Zero COHO/HMO leakage.

---

## 🧪 Verification Plan

### Automated Tests
- Run `tests/p360-report.test.js` in WSL Ubuntu (`node tests/p360-report.test.js` or `python3`).
- Run security/lint checks to verify zero DOM XSS vulnerabilities.

### Manual Verification
1. **Clock In Test:** Click `[🟢 Clock In]` or type `IN` in P360 Copilot -> Verify status becomes `TRACKER ACTIVE`, live timer increments every second.
2. **Task Selection Test:** Check 3 pre-saved tasks (e.g. "Review Stripe invoices", "Reconcile Wells Fargo 6470", "Process Wise payroll") -> Verify selections update state.
3. **Compilation & Deduplication Test:** Enter custom note "checked open stripe invoices today", click `[⚡ Compile Report]` -> Verify "Reviewed Outstanding Invoices Report and monitored Stripe open invoices" appears once under `Progress:`.
4. **Outlook Dispatch Test:** Click `[📧 Send via Outlook]` -> Verify browser opens Outlook compose with subject `[ Daily Task Report — 2026-Sep-16 ]` and populated body.
5. **Slack Copy Test:** Click `[📋 Copy for Slack]` -> Verify toast notification and clipboard content.
6. **Shift History Test:** Click `[💾 Save to Shift History]` -> Verify entry appears in the history table.
7. **Deploy Test:** Deploy to `sindbad-dev-web-vm` and test on live URL `https://rev.arnoldgutib.pro/#/p360`.
