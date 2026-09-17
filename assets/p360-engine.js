/**
 * People360 (P360) Daily Task Report Engine
 * Pure logic for task catalog, report compiling, deduplication, and Outlook URL generation.
 * Compatible with Node.js (CommonJS) and browser (window.P360Engine).
 */

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Format subject strictly as: [ Daily Task Report — YYYY-Mm-DD ]
 * Accepts Date object, ISO string 'YYYY-MM-DD', or pre-formatted '2026-Sep-16'
 */
function formatSubject(dateInput, rangeEndDay) {
  let year, monthStr, dayStr;

  if (typeof dateInput === 'string' && /^\d{4}-[A-Za-z]{3}-\d{2}$/.test(dateInput)) {
    const parts = dateInput.split('-');
    year = parts[0];
    monthStr = parts[1];
    dayStr = parts[2];
  } else {
    const d = dateInput ? new Date(dateInput) : new Date();
    year = d.getFullYear();
    monthStr = MONTH_NAMES[d.getMonth()];
    dayStr = String(d.getDate()).padStart(2, '0');
  }

  if (rangeEndDay) {
    const cleanRangeEnd = String(rangeEndDay).padStart(2, '0');
    return `[ Daily Task Report — ${year}-${monthStr}-${dayStr} and ${cleanRangeEnd} ]`;
  }

  return `[ Daily Task Report — ${year}-${monthStr}-${dayStr} ]`;
}

/**
 * Pre-saved 5-Category Recurring Task Catalog derived from Rev's 2026 logs
 */
const P360_CATALOG = [
  {
    id: 'invoicing',
    name: 'Invoicing & Stripe / Xero / ClickUp',
    icon: '💳',
    tasks: [
      {
        id: 'inv-open-monitor',
        label: 'Reviewed Outstanding Invoices Report and monitored Stripe open invoices.',
        defaultChecked: true
      },
      {
        id: 'inv-connecteam-shift',
        label: 'Generated VA shift reports from Connecteam for invoicing reference.',
        defaultChecked: false
      },
      {
        id: 'inv-finalize-stripe-xero',
        label: 'Finalized invoice, emailed via Stripe, and recorded in Xero',
        hasDetails: true,
        detailPlaceholder: 'e.g. SHERMAN (#1042), SIF (#1043), MEC (#1044)',
        commonClients: ['SHERMAN', 'SIF', 'MEC', 'COACHIT', 'GRINDHAUS', 'MAIA', 'HALSTEDLAW', 'KAPEXP', 'BLISSP', 'VMSPORTS', 'DRURYDES', 'EDGEN', 'WARRIOR', 'BELLADIA', 'RV6', 'VHG']
      },
      {
        id: 'inv-mark-paid-receipt',
        label: 'Marked invoices as paid in Xero & Stripe; sent payment receipts.',
        hasDetails: true,
        detailPlaceholder: 'Client names / invoice numbers'
      },
      {
        id: 'inv-followup-reminders',
        label: 'Followed up with clients re overdue invoice payment reminders.',
        hasDetails: true,
        detailPlaceholder: 'e.g. Vinnie re Edge Nation / VM Sports, Tammy re MAIA'
      },
      {
        id: 'inv-deposit-credit-note',
        label: 'Applied client deposit or issued credit note / buyout invoice in Stripe & Xero.',
        hasDetails: true,
        detailPlaceholder: 'Client name & amount'
      },
      {
        id: 'inv-monitoring-sheet',
        label: 'Updated Customer Invoice Monitoring Sheet and ClickUp Invoice Table.',
        defaultChecked: false
      }
    ]
  },
  {
    id: 'reconciliation',
    name: 'Bank & Ledger Reconciliation',
    icon: '🏦',
    tasks: [
      {
        id: 'rec-wf-checking-6470',
        label: 'Recorded and reconciled transactions under Business Checking Wells Fargo 6470',
        defaultChecked: true
      },
      {
        id: 'rec-wf-cc-6187',
        label: 'Recorded and reconciled transactions under Credit Card Wells Fargo Signify 6187',
        defaultChecked: false
      },
      {
        id: 'rec-stripe-p360',
        label: 'Recorded and reconciled transactions under Stripe Business People 360',
        defaultChecked: true
      },
      {
        id: 'rec-wise-p360',
        label: 'Recorded and reconciled transactions under Wise Business People 360',
        defaultChecked: true
      },
      {
        id: 'rec-wise-statements',
        label: 'Downloaded, imported, and reconciled Wise statements in Xero.',
        defaultChecked: false
      },
      {
        id: 'rec-stripe-fees-payouts',
        label: 'Recorded Stripe processing fees and Stripe payouts to Wells Fargo Checking.',
        defaultChecked: false
      }
    ]
  },
  {
    id: 'payroll',
    name: 'Payroll Processing & Wise Disbursements',
    icon: '💵',
    tasks: [
      {
        id: 'pay-semi-monthly-prep',
        label: 'Worked on semi-monthly payroll files (timesheet hours vs contract rates).',
        hasDetails: true,
        detailPlaceholder: 'e.g. For payroll period September 01-15'
      },
      {
        id: 'pay-timesheet-audit',
        label: 'Audited and approved VA/staff timesheets in Connecteam and Hubstaff.',
        defaultChecked: false
      },
      {
        id: 'pay-wise-batch-prep',
        label: 'Prepared Wise batch payment filewriters (People 360 PHP & Napoli/Trampetti USD).',
        defaultChecked: false
      },
      {
        id: 'pay-wise-disburse',
        label: 'Processed payroll batch payments in Wise; updated payroll working files with actual USD charges.',
        defaultChecked: false
      },
      {
        id: 'pay-payslip-upload',
        label: 'Uploaded employee payslips to Connecteam and staff shared folders.',
        defaultChecked: false
      },
      {
        id: 'pay-endorse-mike',
        label: 'Endorsed dollar amounts to Mike for Wise accounts top-up and payroll release approvals.',
        defaultChecked: false
      }
    ]
  },
  {
    id: 'onboarding',
    name: 'Team Onboarding & Hubstaff Governance',
    icon: '👥',
    tasks: [
      {
        id: 'onb-new-hire-setup',
        label: 'Added new hire: Wise recipient, Xero contact, and payroll data monitoring file.',
        hasDetails: true,
        detailPlaceholder: 'e.g. Lani for SIF'
      },
      {
        id: 'onb-hubstaff-limits',
        label: 'Adjusted Hubstaff weekly/daily hour limits or idle time settings for staff.',
        hasDetails: true,
        detailPlaceholder: 'Staff names'
      },
      {
        id: 'onb-connecteam-archive',
        label: 'Archived resigned/inactive staff in Connecteam and updated active rosters.',
        defaultChecked: false
      },
      {
        id: 'onb-staff-queries',
        label: 'Addressed staff inquiries regarding payslips, schedules, or payment release.',
        defaultChecked: false
      }
    ]
  },
  {
    id: 'financials',
    name: 'Financial Statements & Owner Distributions',
    icon: '📊',
    tasks: [
      {
        id: 'fin-owner-dividend',
        label: 'Computed and endorsed Owner’s Dividend / Trampetti Referral to Mike.',
        defaultChecked: false
      },
      {
        id: 'fin-process-dividend-wise',
        label: 'Recorded bills and processed payments in Wise for Owner’s Dividend.',
        defaultChecked: false
      },
      {
        id: 'fin-xero-pl-bs',
        label: 'Generated and published monthly Profit & Loss and Balance Sheet in Xero.',
        defaultChecked: false
      },
      {
        id: 'fin-adjusting-entries',
        label: 'Posted adjusting journal entries for monthly service revenue.',
        defaultChecked: false
      }
    ]
  }
];

function getSignificantTokens(str) {
  const stopWords = new Set(['and', 'the', 'in', 'to', 'for', 'of', 'a', 'an', 'via', 'with', 're', 'under', 'on', 'today', 'daily', 'all', 'is', 'was']);
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

function isDuplicateTask(tokens1, tokens2) {
  if (tokens1.length === 0 || tokens2.length === 0) return false;
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  const [shorter, longerSet] = set1.size <= set2.size ? [tokens1, set2] : [tokens2, set1];
  let matches = 0;
  for (const t of shorter) {
    if (longerSet.has(t)) matches++;
  }

  const matchRatio = matches / shorter.length;
  return (matchRatio >= 0.65 && matches >= 2) || (matches >= 3 && matchRatio >= 0.5);
}

/**
 * Deduplicate tasks between pre-saved checked tasks and custom raw notes.
 */
function deduplicateTasks(checkedTasks = [], rawNotesList = []) {
  const progress = [];
  const registered = [];

  // Add checked tasks first
  for (const item of checkedTasks) {
    const text = typeof item === 'string' ? item : (item.text || item.label || '');
    const details = (item && Array.isArray(item.details)) ? item.details : [];
    if (!text.trim()) continue;

    const tokens = getSignificantTokens(text);
    let duplicate = false;

    for (const reg of registered) {
      if (isDuplicateTask(tokens, reg.tokens)) {
        duplicate = true;
        // Merge details if any
        if (details.length > 0) {
          reg.item.details = Array.from(new Set([...reg.item.details, ...details]));
        }
        break;
      }
    }

    if (!duplicate) {
      const entry = { text: text.trim(), details: [...details] };
      registered.push({ tokens, item: entry });
      progress.push(entry);
    }
  }

  // Add raw notes if not already covered
  for (const note of rawNotesList) {
    if (!note || typeof note !== 'string') continue;
    const cleanNote = note.replace(/^[•\-\*\s]+/, '').trim();
    if (!cleanNote) continue;

    const tokens = getSignificantTokens(cleanNote);
    let duplicate = false;

    for (const reg of registered) {
      if (isDuplicateTask(tokens, reg.tokens)) {
        duplicate = true;
        break;
      }
    }

    if (!duplicate) {
      const entry = { text: cleanNote, details: [] };
      registered.push({ tokens, item: entry });
      progress.push(entry);
    }
  }

  return { progress };
}

/**
 * Compile deterministic two-bucket report strictly matching Mike's format:
 * Daily Task Report — YYYY-Mm-DD
 *
 * Progress:
 * • Item 1
 * o Detail
 *
 * Plans/To-Do:
 * • Item 1
 */
function compileLocalReport({ dateStr, checkedTasks = [], customNotes = '', plansNotes = '' }) {
  const d = dateStr || formatSubject().replace('[ Daily Task Report — ', '').replace(' ]', '');
  
  // Parse custom notes lines
  const rawNoteLines = (typeof customNotes === 'string' ? customNotes.split('\n') : [])
    .map(l => l.replace(/^[•\-\*\s]+/, '').trim())
    .filter(Boolean);

  const { progress } = deduplicateTasks(checkedTasks, rawNoteLines);

  let output = `Daily Task Report — ${d}\n\nProgress:\n`;

  if (progress.length === 0) {
    output += `• Ongoing daily operations and inbox monitoring.\n`;
  } else {
    for (const item of progress) {
      const cleanText = item.text.replace(/^[•\-\*\s]+/, '').trim();
      output += `• ${cleanText}\n`;
      if (Array.isArray(item.details)) {
        for (const det of item.details) {
          const cleanDet = String(det).replace(/^[o•\-\*\s]+/, '').trim();
          if (cleanDet) {
            output += `    o ${cleanDet}\n`;
          }
        }
      }
    }
  }

  output += `\nPlans/To-Do:\n`;

  const planLines = (typeof plansNotes === 'string' ? plansNotes.split('\n') : [])
    .map(l => l.replace(/^[•\-\*\s]+/, '').trim())
    .filter(Boolean);

  if (planLines.length === 0) {
    output += `• Continue daily invoice monitoring and reconciliation in Stripe and Xero.\n`;
  } else {
    for (const pl of planLines) {
      output += `• ${pl}\n`;
    }
  }

  return output.trim();
}

/**
 * Prepare body text specifically for email URL encoding:
 * Converts leading whitespace on indented sub-bullets (e.g. "    o ") into non-breaking spaces (\u00A0)
 * so web email clients (like Outlook on the Web) cannot collapse or strip leading indentation in their HTML editors.
 * Also standardizes line breaks to CRLF (\r\n) per email URL standards.
 */
function prepareOutlookBody(bodyText) {
  if (!bodyText) return '';
  return bodyText.split(/\r?\n/).map(line => {
    const match = line.match(/^([ \t]+)(.*)$/);
    if (match) {
      const leadingWhitespace = match[1];
      const rest = match[2];
      const count = Math.max(leadingWhitespace.length, 4);
      return '\u00A0'.repeat(count) + rest;
    }
    return line;
  }).join('\r\n');
}

/**
 * Build Outlook web deep-link and mailto URL
 */
function buildOutlookUrl({ to = 'revemar@trampettimg.com', cc = 'arnold.gutib@gmail.com', subject = '', body = '' }) {
  const safeTo = to || 'revemar@trampettimg.com';
  const encodedTo = encodeURIComponent(safeTo);
  const encodedCc = cc ? encodeURIComponent(cc) : '';
  const encodedSubject = encodeURIComponent(subject);

  const safeBody = prepareOutlookBody(body);
  const encodedBody = encodeURIComponent(safeBody);

  const ccWeb = encodedCc ? `&cc=${encodedCc}` : '';
  const ccMailto = encodedCc ? `cc=${encodedCc}&` : '';

  const webUrl = `https://outlook.office.com/mail/deeplink/compose?to=${encodedTo}${ccWeb}&subject=${encodedSubject}&body=${encodedBody}`;
  const mailtoUrl = `mailto:${safeTo}?${ccMailto}subject=${encodedSubject}&body=${encodedBody}`;

  return { webUrl, mailtoUrl, preparedBody: safeBody };
}

// Export for Node.js and Browser
const P360Engine = {
  MONTH_NAMES,
  formatSubject,
  P360_CATALOG,
  deduplicateTasks,
  compileLocalReport,
  prepareOutlookBody,
  buildOutlookUrl
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = P360Engine;
}
if (typeof window !== 'undefined') {
  window.P360Engine = P360Engine;
}
