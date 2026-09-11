/**
 * COHO OpsHub - Reconciliation Engine
 * Core algorithm for matching Bank Transactions to COHO Rent Schedules.
 * Detects:
 * 1. Cleared payments
 * 2. Partial payments (Arrears)
 * 3. Missing payments (Full Arrears)
 * 4. Overpayments / Credit balances
 * 5. Unallocated bank credits (Suspense account)
 */

const Reconciler = {
  reconcile(rentRoll, bankTxns) {
    if (!rentRoll || rentRoll.length === 0) {
      return {
        matchedRecords: [],
        unallocatedTxns: bankTxns || [],
        summary: { totalExpected: 0, totalReceived: 0, totalArrears: 0, clearedCount: 0, exceptionCount: 0, collectionRate: 0.0 }
      };
    }

    const matchedTxnIds = new Set();
    const results = [];

    rentRoll.forEach(tenancy => {
      const expected = tenancy.monthlyRent || 0;
      const tenantName = (tenancy.tenantName || '').toLowerCase().trim();
      const nameParts = tenantName.split(' ').filter(p => p.length > 2);
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0] || '';
      const firstName = nameParts[0] || '';

      const propertyStr = (tenancy.property || '').toLowerCase();
      const roomStr = (tenancy.room || '').toLowerCase();
      
      // Extract room number/letter (e.g. "Room 2" -> "2", "Flat 1" -> "1")
      const roomNumMatch = roomStr.match(/\d+/);
      const roomNum = roomNumMatch ? roomNumMatch[0] : '';

      // Find matching bank transactions
      const matched = [];

      bankTxns.forEach(txn => {
        if (matchedTxnIds.has(txn.id)) return; // prevent duplicate allocation to multiple rooms

        const textToSearch = `${txn.description || ''} ${txn.reference || ''}`.toLowerCase();
        let isMatch = false;
        let matchReason = '';

        // 1. Direct Tenancy ID match
        if (tenancy.id && textToSearch.includes(tenancy.id.toLowerCase())) {
          isMatch = true;
          matchReason = 'Exact Tenancy ID in reference';
        }
        // 2. Tenant Last Name match
        else if (lastName && textToSearch.includes(lastName)) {
          isMatch = true;
          matchReason = `Payer matched last name "${lastName.toUpperCase()}"`;
        }
        // 3. Full Name match
        else if (firstName && textToSearch.includes(firstName) && textToSearch.includes(roomNum)) {
          isMatch = true;
          matchReason = `Matched first name and room "${roomStr}"`;
        }
        // 4. Room & Property shorthand (e.g. "24eg r2", "8vt r1")
        else if (roomNum && textToSearch.includes(`r${roomNum}`) || textToSearch.includes(`room ${roomNum}`) || textToSearch.includes(`flat ${roomNum}`)) {
          // Verify property initial if possible
          const propInitials = propertyStr.split(' ').map(w => w[0]).join('');
          if (textToSearch.includes(propInitials) || Math.abs(txn.amount - expected) < 0.01) {
            isMatch = true;
            matchReason = `Matched room code and amount for ${tenancy.room}`;
          }
        }
        // 5. Exact amount match on or near due day (only if no other strong candidates)
        else if (Math.abs(txn.amount - expected) < 0.01 && txn.date) {
          const txnDate = new Date(txn.date);
          const txnDay = txnDate.getDate();
          if (Math.abs(txnDay - tenancy.dueDay) <= 3 && !textToSearch.includes('unknown') && !textToSearch.includes('transfer')) {
            isMatch = true;
            matchReason = `Exact amount match (£${expected}) near due date`;
          }
        }

        if (isMatch) {
          matched.push({ ...txn, matchReason });
          matchedTxnIds.add(txn.id);
        }
      });

      // Calculate totals
      const received = matched.reduce((sum, t) => sum + (t.amount || 0), 0);
      const balance = expected - received;

      let status = 'CLEARED';
      let statusClass = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      let actionNeeded = 'None — account in good standing';

      if (received === 0) {
        status = 'MISSING';
        statusClass = 'bg-rose-500/10 text-rose-600 border-rose-500/20';
        actionNeeded = 'Send 24hr missing rent notification to tenant';
      } else if (balance > 0.01) {
        status = 'PARTIAL';
        statusClass = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
        actionNeeded = `Request £${balance.toFixed(2)} shortfall payment`;
      } else if (balance < -0.01) {
        status = 'OVERPAID';
        statusClass = 'bg-purple-500/10 text-purple-600 border-purple-500/20';
        actionNeeded = `Investigate £${Math.abs(balance).toFixed(2)} excess (possible deposit/advance)`;
      }

      results.push({
        tenancy,
        expected,
        received,
        balance,
        status,
        statusClass,
        actionNeeded,
        matchedTxns: matched
      });
    });

    // Unallocated bank transactions (credits with no tenancy match)
    const unallocated = bankTxns.filter(t => !matchedTxnIds.has(t.id));

    // Summary KPIs
    const totalExpected = results.reduce((sum, r) => sum + r.expected, 0);
    const totalReceived = results.reduce((sum, r) => sum + r.received, 0);
    const totalArrears = results.reduce((sum, r) => sum + (r.balance > 0 ? r.balance : 0), 0);
    const clearedCount = results.filter(r => r.status === 'CLEARED').length;
    const exceptionCount = results.filter(r => r.status !== 'CLEARED').length;

    return {
      matchedRecords: results,
      unallocatedTxns: unallocated,
      summary: {
        totalExpected,
        totalReceived,
        totalArrears,
        clearedCount,
        exceptionCount,
        collectionRate: totalExpected > 0 ? ((totalReceived / totalExpected) * 100).toFixed(1) : 0
      }
    };
  }
};

if (typeof module !== 'undefined') {
  module.exports = Reconciler;
}
