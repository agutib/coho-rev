const assert = require('assert');

// Mock or require the compiler logic
const { 
  formatSubject, 
  compileLocalReport, 
  deduplicateTasks, 
  buildOutlookUrl 
} = require('../assets/p360-engine.js');

console.log('🧪 Starting P360 Daily Task Report Test Suite...');

// 1. Subject Format Tests
console.log('Test 1: Subject Line Format');
const singleDaySubject = formatSubject('2026-09-16');
assert.strictEqual(singleDaySubject, '[ Daily Task Report — 2026-Sep-16 ]', 'Single day subject format mismatch');

const rangeSubject = formatSubject('2026-09-03', '04');
assert.strictEqual(rangeSubject, '[ Daily Task Report — 2026-Sep-03 and 04 ]', 'Range subject format mismatch');
console.log('  ✅ Passed Subject Line Format');

// 2. Report Structure Tests
console.log('Test 2: Two-Bucket Report Structure');
const sampleChecked = [
  { text: 'Reviewed Outstanding Invoices Report and monitored Stripe open invoices.', details: [] },
  { text: 'Finalized invoice, emailed via Stripe, and recorded in Xero', details: ['SHERMAN (#1042)', 'SIF (#1043)'] },
  { text: 'Recorded and reconciled transactions under Business Checking Wells Fargo 6470', details: [] }
];
const sampleCustomNotes = 'Responded to Mike email re Hubstaff timesheet approvals.';
const samplePlans = 'Follow up with Vinnie re Edge Nation payment reminder.';

const report = compileLocalReport({
  dateStr: '2026-Sep-16',
  checkedTasks: sampleChecked,
  customNotes: sampleCustomNotes,
  plansNotes: samplePlans
});

// Check header
assert(report.includes('Daily Task Report — 2026-Sep-16'), 'Report header missing');
// Check two buckets
assert(report.includes('Progress:'), 'Missing Progress: section');
assert(report.includes('Plans/To-Do:'), 'Missing Plans/To-Do: section');
// Check no greetings or sign-offs
assert(!report.toLowerCase().includes('hi mike'), 'Report must NOT contain greetings');
assert(!report.toLowerCase().includes('good morning'), 'Report must NOT contain greetings');
assert(!report.toLowerCase().includes('best,'), 'Report must NOT contain sign-offs');
assert(!report.toLowerCase().includes('regards'), 'Report must NOT contain sign-offs');
// Check bullets
assert(report.includes('• Reviewed Outstanding Invoices Report'), 'Missing primary bullet');
assert(report.includes('o SHERMAN (#1042)'), 'Missing sub-bullet o format');
assert(report.includes('o SIF (#1043)'), 'Missing sub-bullet o format');
assert(report.includes('• Follow up with Vinnie'), 'Missing plan bullet');
console.log('  ✅ Passed Two-Bucket Report Structure');

// 3. Deduplication Tests
console.log('Test 3: Deduplication Logic');
const rawNotesList = [
  'Reviewed Outstanding Invoices Report and monitored Stripe open invoices.',
  'monitored Stripe open invoices',
  'Approved timesheets in Connecteam'
];
const deduped = deduplicateTasks(sampleChecked, rawNotesList);
// Should not contain duplicate Stripe bullet
const stripeMatches = deduped.progress.filter(t => (t.text || t).toLowerCase().includes('stripe open invoices'));
assert.strictEqual(stripeMatches.length, 1, 'Duplicate Stripe invoice task was not deduplicated');
console.log('  ✅ Passed Deduplication Logic');

// 4. Outlook URL Generation Tests
console.log('Test 4: Outlook URL Generation');
const outlookObj = buildOutlookUrl({
  to: 'mike@people360.com',
  subject: '[ Daily Task Report — 2026-Sep-16 ]',
  body: report
});
assert(outlookObj.webUrl.startsWith('https://outlook.office.com/mail/deeplink/compose'), 'Invalid web Outlook deeplink URL');
assert(outlookObj.webUrl.includes('subject=%5B%20Daily%20Task%20Report%20%E2%80%94%202026-Sep-16%20%5D') || outlookObj.webUrl.includes(encodeURIComponent('[ Daily Task Report — 2026-Sep-16 ]')), 'Subject encoding error');
assert(outlookObj.mailtoUrl.startsWith('mailto:mike@people360.com'), 'Invalid mailto URL');
console.log('  ✅ Passed Outlook URL Generation');

// 5. Zero COHO Leakage Test
console.log('Test 5: Zero COHO HMO Leakage');
const cohoKeywords = ['hmo', 'coho', 'tenancy', 'landlord', 'rent roll', 'ast', 'cp12', 'eicr'];
for (const kw of cohoKeywords) {
  assert(!report.toLowerCase().includes(kw), 'Report must not leak COHO keyword: ' + kw);
}
console.log('  ✅ Passed Zero COHO HMO Leakage');

console.log('\n🎉 ALL P360 DAILY TASK REPORT TESTS PASSED 100%!');

