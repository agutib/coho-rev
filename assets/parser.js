/**
 * COHO OpsHub - Data Parser Module
 * Handles CSV & Excel parsing and automatic header mapping for:
 * 1. COHO Rent Rolls / Tenancy Lists
 * 2. Bank Statements (Lloyds, Barclays, NatWest, Starling, Revolut, generic CSV)
 * 3. Compliance Registers
 */

const Parser = {
  // Simple, robust CSV string parser
  parseCSV(text) {
    const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return [];

    const headers = this.parseCSVLine(lines[0]);
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === headers.length || values.some(v => v.trim() !== '')) {
        const row = {};
        headers.forEach((h, idx) => {
          row[h.trim()] = values[idx] !== undefined ? values[idx].trim() : '';
        });
        records.push(row);
      }
    }
    return records;
  },

  parseCSVLine(line) {
    const values = [];
    let insideQuotes = false;
    let currentValue = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          currentValue += '"';
          i++; // skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue);
    return values;
  },

  // Parse numeric currency strings (£650.00 -> 650)
  parseCurrency(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = val.toString().replace(/[^0-9.-]+/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  },

  // Auto-detect file type from headers
  detectFileType(records) {
    if (!records || records.length === 0) return 'unknown';
    const keys = Object.keys(records[0]).map(k => k.toLowerCase());

    if (keys.some(k => k.includes('monthly rent') || k.includes('due day') || k.includes('rent roll') || k.includes('tenant id'))) {
      return 'rent_roll';
    }
    if (keys.some(k => k.includes('balance') || k.includes('statement') || (k.includes('amount') && (k.includes('description') || k.includes('reference'))))) {
      return 'bank_statement';
    }
    if (keys.some(k => k.includes('expiry') || k.includes('gas safety') || k.includes('eicr') || k.includes('requirement'))) {
      return 'compliance';
    }
    return 'generic';
  },

  // Normalize Rent Roll rows
  normalizeRentRoll(rawRows) {
    return rawRows.map((r, index) => {
      const getVal = (aliases) => {
        for (const a of aliases) {
          const found = Object.keys(r).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === a.toLowerCase().replace(/[^a-z0-9]/g, ''));
          if (found && r[found] !== undefined) return r[found];
        }
        return '';
      };

      const rent = this.parseCurrency(getVal(['monthly rent', 'rent', 'amount', 'rent amount', 'pcm']));
      const deposit = this.parseCurrency(getVal(['deposit amount', 'deposit', 'security deposit']));
      const dueDay = parseInt(getVal(['due day', 'rent day', 'due date', 'day']), 10) || 1;

      return {
        id: getVal(['tenant id', 'tenancy id', 'id']) || `TEN-REC-${index + 1}`,
        property: getVal(['property', 'property name', 'address']) || 'Unspecified Property',
        room: getVal(['room', 'room name', 'unit']) || 'Room 1',
        tenantName: getVal(['tenant name', 'tenant', 'name']) || 'Vacant / Unknown',
        monthlyRent: rent,
        dueDay: dueDay,
        startDate: getVal(['tenancy start', 'start date', 'from']),
        endDate: getVal(['tenancy end', 'end date', 'to']),
        depositAmount: deposit,
        depositStatus: getVal(['deposit status', 'scheme', 'dps']) || 'Unspecified'
      };
    });
  },

  // Normalize Bank Statement rows
  normalizeBankStatement(rawRows) {
    return rawRows.map((r, index) => {
      const getVal = (aliases) => {
        for (const a of aliases) {
          const found = Object.keys(r).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === a.toLowerCase().replace(/[^a-z0-9]/g, ''));
          if (found && r[found] !== undefined) return r[found];
        }
        return '';
      };

      const amount = this.parseCurrency(getVal(['amount', 'paid in', 'credit', 'value']));
      const balance = this.parseCurrency(getVal(['balance', 'running balance']));

      return {
        id: `TXN-${index + 1}`,
        date: getVal(['date', 'transaction date', 'posting date']),
        description: getVal(['description', 'transaction type', 'type', 'narrative']),
        reference: getVal(['reference', 'ref', 'payer reference', 'details', 'memo']),
        amount: amount,
        balance: balance
      };
    });
  },

  // Normalize Compliance rows
  normalizeCompliance(rawRows) {
    return rawRows.map((r, index) => {
      const getVal = (aliases) => {
        for (const a of aliases) {
          const found = Object.keys(r).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === a.toLowerCase().replace(/[^a-z0-9]/g, ''));
          if (found && r[found] !== undefined) return r[found];
        }
        return '';
      };

      const expiryStr = getVal(['expiry date', 'expiry', 'due date', 'valid until']);
      let status = getVal(['status', 'current status']);

      // Auto-compute status if dates exist
      if (expiryStr) {
        const expiryDate = new Date(expiryStr);
        const today = new Date();
        const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          status = 'Expired';
        } else if (diffDays <= 30) {
          status = 'Due Soon';
        } else if (!status) {
          status = 'Current';
        }
      }

      return {
        id: `COMP-${index + 1}`,
        property: getVal(['property', 'property name', 'address']) || 'Whole Property',
        room: getVal(['room', 'unit']) || 'Whole Property',
        requirement: getVal(['requirement', 'document', 'certificate', 'type']) || 'Compliance Item',
        reference: getVal(['reference', 'ref', 'cert number']) || 'N/A',
        effectiveDate: getVal(['effective date', 'issue date', 'date']),
        expiryDate: expiryStr,
        status: status || 'Pending',
        provider: getVal(['provider', 'issuing body', 'contractor']) || 'Not Stated',
        notes: getVal(['notes', 'comments']) || ''
      };
    });
  }
};
