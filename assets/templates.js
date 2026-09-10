/**
 * COHO OpsHub - Message & Comms Generator
 * Formats polite, factual, professional communications adhering to the COHO
 * Property Operations standard:
 * - Neutral phrasing (no accusations)
 * - Exact dates, amounts, and source references
 * - Clear action request and follow-up deadline
 */

const CommsTemplates = {
  // 1. Rent Arrears Notice (Missing or Partial)
  generateArrearsNotice(rec) {
    const { tenancy, expected, received, balance, matchedTxns } = rec;
    const isPartial = received > 0;
    const dateFormatted = `the ${tenancy.dueDay}th of the month`;

    let txnDetails = 'No matching payment has been recorded in our bank account for this period.';
    if (isPartial && matchedTxns && matchedTxns.length > 0) {
      txnDetails = matchedTxns.map(t => `• £${t.amount.toFixed(2)} received on ${t.date || 'recent date'} (Ref: ${t.reference || t.description})`).join('\n');
    }

    return {
      recipient: tenancy.tenantName,
      subject: `Rent Account Update: ${tenancy.property} - ${tenancy.room}`,
      body: `Hi ${tenancy.tenantName.split(' ')[0]},

We are getting in touch regarding your rent account for ${tenancy.room} at ${tenancy.property}.

Account Summary:
• Expected Monthly Rent: £${expected.toFixed(2)} (Due ${dateFormatted})
• Payments Recorded to Date: £${received.toFixed(2)}
${txnDetails}
• Current Outstanding Balance: £${balance.toFixed(2)}

Could you please check your records and confirm if this payment has been sent? If you have already transferred the remaining balance of £${balance.toFixed(2)}, please reply with the payment date, transfer reference, and bank name so we can match it in our accounts.

If you are experiencing any difficulty or anticipate a delay, please let us know as soon as possible so we can note your account.

Best regards,
Operations & Property Management Team`
    };
  },

  // 2. Tenant Welcome & Move-In Pack
  generateWelcomePack(tenancy) {
    return {
      recipient: tenancy.tenantName,
      subject: `Welcome to ${tenancy.room}, ${tenancy.property} – Move-in Details`,
      body: `Hi ${tenancy.tenantName.split(' ')[0]},

We are delighted to welcome you to ${tenancy.property}!

Your tenancy details and essentials are summarized below:
• Property & Room: ${tenancy.property} (${tenancy.room})
• Tenancy Term: ${tenancy.startDate || 'Move-in date'} to ${tenancy.endDate || '6-month term'}
• Monthly Rent: £${(tenancy.monthlyRent || 0).toFixed(2)} PCM (Due on the ${tenancy.dueDay || 1}th of each month)
• Security Deposit: £${(tenancy.depositAmount || 0).toFixed(2)} (${tenancy.depositStatus || 'Protected'})

Important Move-in Steps:
1. Check-In Inventory: Please review the condition report and photos uploaded to your COHO portal. Kindly submit your digital sign-off or notes within 7 days.
2. Portal & Maintenance: Log all repair or maintenance requests directly through the COHO app for fastest response.
3. Waste & Recycling: Bins are collected weekly. Please see the kitchen noticeboard for details.

We hope you settle in comfortably. If you need any assistance, feel free to contact us via the COHO portal.

Best regards,
Property Operations Team`
    };
  },

  // 3. Landlord Monthly Settlement Summary
  generateLandlordSummary(propertyName, records, unallocated) {
    const propRecords = records.filter(r => r.tenancy.property.toLowerCase().includes(propertyName.toLowerCase()));
    const totalExpected = propRecords.reduce((sum, r) => sum + r.expected, 0);
    const totalCollected = propRecords.reduce((sum, r) => sum + r.received, 0);
    const totalArrears = propRecords.reduce((sum, r) => sum + (r.balance > 0 ? r.balance : 0), 0);
    const roomBreakdown = propRecords.map(r => `• ${r.tenancy.room} (${r.tenancy.tenantName}): Expected £${r.expected.toFixed(2)} | Collected £${r.received.toFixed(2)} [Status: ${r.status}]`).join('\n');

    return {
      recipient: `Owner / Landlord (${propertyName})`,
      subject: `Monthly Operations & Rent Collection Summary: ${propertyName}`,
      body: `Dear Landlord,

Please find the operational rent collection summary for ${propertyName}:

Performance Overview:
• Total Expected Rent: £${totalExpected.toFixed(2)}
• Total Rent Collected: £${totalCollected.toFixed(2)}
• Outstanding Arrears: £${totalArrears.toFixed(2)}
• Collection Rate: ${totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : 0}%

Room-by-Room Breakdown:
${roomBreakdown}

Action Items & Arrears Follow-Up:
${propRecords.filter(r => r.balance > 0).map(r => `• ${r.tenancy.room} (${r.tenancy.tenantName}): £${r.balance.toFixed(2)} outstanding. ${r.actionNeeded}.`).join('\n') || '• All rooms are fully paid and in good standing.'}

Please let us know if you require any specific invoices or maintenance details prior to owner settlement.

Best regards,
Operations Management`
    };
  },

  // 4. "Nothing-Slips" 8-Question Audit Generator
  generateNothingSlipsAudit(rec) {
    const { tenancy, expected, received, balance, matchedTxns, status } = rec;
    return `========================================
NOTHING-SLIPS OPERATIONAL AUDIT CHECKLIST
========================================
1. WHO?
   Tenant: ${tenancy.tenantName} (ID: ${tenancy.id})
   Landlord / Entity: Apex Living Ltd / Property Owner

2. WHERE?
   Property: ${tenancy.property}
   Room / Unit: ${tenancy.room}

3. WHAT HAPPENED?
   Status: ${status}
   Expected Rent: £${expected.toFixed(2)}
   Received Payment: £${received.toFixed(2)}
   Net Balance: £${balance.toFixed(2)}

4. WHEN?
   Rent Due Day: ${tenancy.dueDay}th of current month
   Payment Date(s): ${matchedTxns.map(t => t.date).join(', ') || 'None recorded'}

5. HOW MUCH?
   Financial Impact: ${balance > 0 ? `£${balance.toFixed(2)} Arrears Shortfall` : balance < 0 ? `£${Math.abs(balance).toFixed(2)} Credit Balance` : '£0.00 Balanced'}

6. WHY?
   ${status === 'CLEARED' ? 'Full rent cleared on schedule.' : status === 'PARTIAL' ? 'Tenant paid partial rent; under-allocation or split installment.' : status === 'MISSING' ? 'No bank credit identified with matching reference or payer.' : 'Overpayment or combined rent+deposit payment.'}

7. DOES IT TIE?
   Bank Record: ${matchedTxns.length > 0 ? matchedTxns.map(t => `${t.id} (${t.reference || t.description})`).join(', ') : 'No bank match'}
   Rent Schedule: Tied to ${tenancy.id} active AST schedule.
   COHO Ledger: Prepared for ledger sync.

8. WHAT NEXT?
   ${rec.actionNeeded}
   Follow-up Deadline: Within 24-48 hours.
========================================`;
  }
};
