/**
 * COHO OpsHub - Main Application State & UI Controller
 */

const App = {
  state: {
    rentRoll: [],
    bankTxns: [],
    compliance: [],
    reconciliation: null,
    activeTab: 'reconciler',
    statusFilter: 'ALL',
    searchQuery: '',
    selectedRecordForMsg: null
  },

  init() {
    this.loadFromStorage();
    this.bindEvents();
    this.render();
  },

  // Save state to local storage for zero-loss persistence
  saveToStorage() {
    try {
      localStorage.setItem('coho_rent_roll', JSON.stringify(this.state.rentRoll));
      localStorage.setItem('coho_bank_txns', JSON.stringify(this.state.bankTxns));
      localStorage.setItem('coho_compliance', JSON.stringify(this.state.compliance));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  },

  // Load saved records from storage
  loadFromStorage() {
    try {
      const savedRent = localStorage.getItem('coho_rent_roll');
      const savedTxns = localStorage.getItem('coho_bank_txns');
      const savedComp = localStorage.getItem('coho_compliance');

      if (savedRent) this.state.rentRoll = JSON.parse(savedRent);
      if (savedTxns) this.state.bankTxns = JSON.parse(savedTxns);
      if (savedComp) this.state.compliance = JSON.parse(savedComp);

      this.runReconciliation();
    } catch (e) {
      console.error('Failed to load from storage:', e);
    }
  },

  // Run matching engine whenever data changes
  runReconciliation() {
    this.state.reconciliation = Reconciler.reconcile(this.state.rentRoll, this.state.bankTxns);
  },

  // Load realistic Demo Data for immediate testing
  loadDemoData() {
    const sampleRent = [
      { id: 'TEN-2026-039', property: '24 Elm Grove', room: 'Room 1', tenantName: 'Marcus Vance', monthlyRent: 625.00, dueDay: 1, startDate: '2026-03-01', endDate: '2027-02-28', depositAmount: 625.00, depositStatus: 'Protected (DPS)' },
      { id: 'TEN-2026-041', property: '24 Elm Grove', room: 'Room 2', tenantName: 'Jordan Lee', monthlyRent: 650.00, dueDay: 15, startDate: '2026-09-15', endDate: '2027-03-14', depositAmount: 650.00, depositStatus: 'Protected (DPS)' },
      { id: 'TEN-2026-022', property: '24 Elm Grove', room: 'Room 3', tenantName: 'Sophie Taylor', monthlyRent: 600.00, dueDay: 1, startDate: '2025-11-01', endDate: '2026-10-31', depositAmount: 600.00, depositStatus: 'Protected (TDS)' },
      { id: 'TEN-2026-033', property: '24 Elm Grove', room: 'Room 4', tenantName: 'David Chen', monthlyRent: 750.00, dueDay: 5, startDate: '2026-01-05', endDate: '2027-01-04', depositAmount: 750.00, depositStatus: 'Protected (DPS)' },
      { id: 'TEN-2026-045', property: '24 Elm Grove', room: 'Room 5', tenantName: 'Elena Rostova', monthlyRent: 575.00, dueDay: 1, startDate: '2026-08-01', endDate: '2027-01-31', depositAmount: 575.00, depositStatus: 'Protected (DPS)' },
      { id: 'TEN-2026-012', property: '12 Highfield Road', room: 'Flat 1', tenantName: "Liam O'Connor", monthlyRent: 950.00, dueDay: 1, startDate: '2025-06-01', endDate: '2027-05-31', depositAmount: 950.00, depositStatus: 'Protected (DPS)' },
      { id: 'TEN-2026-018', property: '12 Highfield Road', room: 'Flat 2', tenantName: 'Hannah Abbott', monthlyRent: 875.00, dueDay: 15, startDate: '2025-09-15', endDate: '2026-09-14', depositAmount: 875.00, depositStatus: 'Protected (DPS)' },
      { id: 'TEN-2026-004', property: '8 Victoria Terrace', room: 'Room 1', tenantName: 'Amara Patel', monthlyRent: 550.00, dueDay: 1, startDate: '2026-02-01', endDate: '2027-01-31', depositAmount: 550.00, depositStatus: 'Protected (MyDeposits)' },
      { id: 'TEN-2026-007', property: '8 Victoria Terrace', room: 'Room 2', tenantName: 'Benjamin Hughes', monthlyRent: 580.00, dueDay: 1, startDate: '2026-04-01', endDate: '2027-03-31', depositAmount: 580.00, depositStatus: 'Protected (DPS)' },
      { id: 'TEN-2026-009', property: '8 Victoria Terrace', room: 'Room 3', tenantName: 'Chloe Davies', monthlyRent: 520.00, dueDay: 10, startDate: '2026-05-10', endDate: '2026-11-09', depositAmount: 520.00, depositStatus: 'Protected (DPS)' }
    ];

    const sampleTxns = [
      { id: 'TXN-1', date: '2026-09-01', description: 'Faster Payments Incoming', reference: 'M VANCE 24EG R1', amount: 625.00, balance: 14250.00 },
      { id: 'TXN-2', date: '2026-09-01', description: 'Direct Debit Incoming', reference: 'S TAYLOR 24 ELM GRV', amount: 600.00, balance: 14850.00 },
      { id: 'TXN-3', date: '2026-09-01', description: 'Standing Order', reference: 'L OCONNOR RENT', amount: 950.00, balance: 15800.00 },
      { id: 'TXN-4', date: '2026-09-01', description: 'Faster Payments Incoming', reference: 'A PATEL 8VT R1', amount: 550.00, balance: 16350.00 },
      { id: 'TXN-5', date: '2026-09-02', description: 'Standing Order', reference: 'BEN HUGHES RENT', amount: 580.00, balance: 16930.00 },
      { id: 'TXN-6', date: '2026-09-05', description: 'Faster Payments Incoming', reference: 'D CHEN ROOM 4', amount: 500.00, balance: 17430.00 },
      { id: 'TXN-7', date: '2026-09-10', description: 'Standing Order', reference: 'C DAVIES 8VT R3', amount: 520.00, balance: 17950.00 },
      { id: 'TXN-8', date: '2026-09-13', description: 'Faster Payments Incoming', reference: '24EG-R2-LEE', amount: 1150.00, balance: 19100.00 },
      { id: 'TXN-9', date: '2026-09-14', description: 'Faster Payments Incoming', reference: 'UNKNOWN PAYMENT REF 9928', amount: 450.00, balance: 19550.00 },
      { id: 'TXN-10', date: '2026-09-15', description: 'Standing Order', reference: 'H ABBOTT FLAT 2', amount: 875.00, balance: 20425.00 }
    ];

    const sampleComp = [
      { id: 'COMP-1', property: '24 Elm Grove', room: 'Whole Property', requirement: 'Gas Safety (CP12)', reference: 'CP12-88219', effectiveDate: '2026-02-02', expiryDate: '2027-02-01', status: 'Current', provider: 'British Gas', notes: 'All 5 room radiators inspected' },
      { id: 'COMP-2', property: '24 Elm Grove', room: 'Whole Property', requirement: 'EICR (5-Year)', reference: 'EC-2024-1102', effectiveDate: '2024-05-14', expiryDate: '2029-05-13', status: 'Current', provider: 'Apex Electrical', notes: 'Distribution board test passed' },
      { id: 'COMP-3', property: '24 Elm Grove', room: 'Whole Property', requirement: 'Energy Performance (EPC)', reference: '0981-2241-7712', effectiveDate: '2021-11-10', expiryDate: '2031-11-09', status: 'Current', provider: 'Gov Register', notes: 'Rating C (72 points)' },
      { id: 'COMP-4', property: '24 Elm Grove', room: 'Whole Property', requirement: 'HMO Licence', reference: 'HMO-MAN-2023-088', effectiveDate: '2023-06-01', expiryDate: '2028-05-31', status: 'Current', provider: 'Manchester City Council', notes: 'Max 5 persons permitted' },
      { id: 'COMP-5', property: '24 Elm Grove', room: 'Room 2', requirement: 'Deposit Protection', reference: 'DPS-1994820', effectiveDate: '2026-09-14', expiryDate: '2026-10-14', status: 'Due Soon', provider: 'Deposit Protection Service', notes: 'Serve Prescribed Info within 30 days' },
      { id: 'COMP-6', property: '12 Highfield Road', room: 'Whole Property', requirement: 'Gas Safety (CP12)', reference: 'CP12-76102', effectiveDate: '2025-09-28', expiryDate: '2026-09-27', status: 'Due Soon', provider: 'PlumbRight NW', notes: 'Renewal inspection due in 17 days' },
      { id: 'COMP-7', property: '8 Victoria Terrace', room: 'Whole Property', requirement: 'Gas Safety (CP12)', reference: 'CP12-90112', effectiveDate: '2025-08-15', expiryDate: '2026-08-14', status: 'Expired', provider: 'SafeHeat UK', notes: 'URGENT: Expired by 27 days - book engineer immediately' }
    ];

    this.state.rentRoll = sampleRent;
    this.state.bankTxns = sampleTxns;
    this.state.compliance = sampleComp;

    this.saveToStorage();
    this.runReconciliation();
    this.render();
    this.showToast('Demo data loaded successfully! 10 tenancies & 10 bank transactions active.');
  },

  clearAllData() {
    if (confirm('Are you sure you want to clear all loaded data? This will reset the workspace.')) {
      this.state.rentRoll = [];
      this.state.bankTxns = [];
      this.state.compliance = [];
      this.saveToStorage();
      this.runReconciliation();
      this.render();
      this.showToast('All records cleared.');
    }
  },

  // File Upload Handlers
  handleFileUpload(file) {
    const reader = new FileReader();
    const fileName = file.name.toLowerCase();

    reader.onload = (e) => {
      const content = e.target.result;
      let rawRecords = [];

      // Check if XLSX/XLS or CSV
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        if (typeof XLSX !== 'undefined') {
          const workbook = XLSX.read(content, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          rawRecords = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        } else {
          alert('Excel library not loaded. Please convert file to CSV or ensure online connection.');
          return;
        }
      } else {
        rawRecords = Parser.parseCSV(content);
      }

      if (rawRecords.length === 0) {
        alert('No readable data rows found in the uploaded file.');
        return;
      }

      const detectedType = Parser.detectFileType(rawRecords);

      if (detectedType === 'rent_roll') {
        const normalized = Parser.normalizeRentRoll(rawRecords);
        this.state.rentRoll = normalized;
        this.showToast(`Imported ${normalized.length} COHO Rent Roll records!`);
      } else if (detectedType === 'bank_statement') {
        const normalized = Parser.normalizeBankStatement(rawRecords);
        this.state.bankTxns = normalized;
        this.showToast(`Imported ${normalized.length} Bank Statement transactions!`);
      } else if (detectedType === 'compliance') {
        const normalized = Parser.normalizeCompliance(rawRecords);
        this.state.compliance = normalized;
        this.showToast(`Imported ${normalized.length} Compliance records!`);
      } else {
        // Ask user to specify
        const choice = prompt(`We couldn't automatically determine the file type for "${file.name}".\nPlease choose: 1 for Rent Roll, 2 for Bank Statement, 3 for Compliance:`, '1');
        if (choice === '1') {
          this.state.rentRoll = Parser.normalizeRentRoll(rawRecords);
          this.showToast(`Imported ${this.state.rentRoll.length} records as Rent Roll.`);
        } else if (choice === '2') {
          this.state.bankTxns = Parser.normalizeBankStatement(rawRecords);
          this.showToast(`Imported ${this.state.bankTxns.length} records as Bank Statement.`);
        } else if (choice === '3') {
          this.state.compliance = Parser.normalizeCompliance(rawRecords);
          this.showToast(`Imported ${this.state.compliance.length} records as Compliance.`);
        }
      }

      this.saveToStorage();
      this.runReconciliation();
      this.render();
    };

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  },

  // UI Event Bindings
  bindEvents() {
    // Dropzone
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');

    if (dropzone && fileInput) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-emerald-500', 'bg-emerald-500/5');
      });
      dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-emerald-500', 'bg-emerald-500/5');
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-emerald-500', 'bg-emerald-500/5');
        if (e.dataTransfer.files.length > 0) {
          this.handleFileUpload(e.dataTransfer.files[0]);
        }
      });
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleFileUpload(e.target.files[0]);
          e.target.value = '';
        }
      });
    }

    // Tab buttons
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = btn.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Search and Status filters
    const searchInput = document.getElementById('table-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.state.searchQuery = e.target.value.toLowerCase();
        this.renderReconcilerTable();
      });
    }

    const filterSelect = document.getElementById('status-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.state.statusFilter = e.target.value;
        this.renderReconcilerTable();
      });
    }
  },

  switchTab(tabId) {
    this.state.activeTab = tabId;
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.classList.remove('border-emerald-500', 'text-emerald-600', 'dark:text-emerald-400', 'font-bold');
      btn.classList.add('border-transparent', 'text-[var(--muted-foreground)]');
    });

    const pane = document.getElementById(`pane-${tabId}`);
    const btn = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);

    if (pane) pane.classList.remove('hidden');
    if (btn) {
      btn.classList.remove('border-transparent', 'text-[var(--muted-foreground)]');
      btn.classList.add('border-emerald-500', 'text-emerald-600', 'dark:text-emerald-400', 'font-bold');
    }

    this.render();
  },

  // Render Whole View
  render() {
    this.renderStats();
    if (this.state.activeTab === 'reconciler') {
      this.renderReconcilerTable();
      this.renderUnallocatedTable();
    } else if (this.state.activeTab === 'compliance') {
      this.renderComplianceTable();
    } else if (this.state.activeTab === 'tenancies') {
      this.renderTenancyTable();
    }
  },

  renderStats() {
    const recon = this.state.reconciliation;
    if (!recon) return;

    document.getElementById('stat-total-expected').innerText = `£${recon.summary.totalExpected.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
    document.getElementById('stat-total-collected').innerText = `£${recon.summary.totalReceived.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
    document.getElementById('stat-total-arrears').innerText = `£${recon.summary.totalArrears.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
    document.getElementById('stat-collection-rate').innerText = `${recon.summary.collectionRate}%`;

    const expiredComp = this.state.compliance.filter(c => c.status === 'Expired').length;
    const dueComp = this.state.compliance.filter(c => c.status === 'Due Soon').length;
    document.getElementById('stat-compliance-alerts').innerText = `${expiredComp} Expired / ${dueComp} Due`;
  },

  renderReconcilerTable() {
    const tbody = document.getElementById('reconciliation-tbody');
    if (!tbody) return;

    if (!this.state.reconciliation || this.state.reconciliation.matchedRecords.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-[var(--muted-foreground)] font-sans">No tenancies or bank records loaded. Drag & drop a CSV or click <strong>"Load Demo Data"</strong> above.</td></tr>`;
      return;
    }

    let records = this.state.reconciliation.matchedRecords;

    // Apply Filter
    if (this.state.statusFilter !== 'ALL') {
      records = records.filter(r => r.status === this.state.statusFilter);
    }

    // Apply Search
    if (this.state.searchQuery) {
      const q = this.state.searchQuery;
      records = records.filter(r => 
        r.tenancy.property.toLowerCase().includes(q) ||
        r.tenancy.room.toLowerCase().includes(q) ||
        r.tenancy.tenantName.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
      );
    }

    if (records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-[var(--muted-foreground)] font-sans">No matching records found for this filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = records.map((rec, idx) => {
      const t = rec.tenancy;
      const matchedInfo = rec.matchedTxns.length > 0
        ? rec.matchedTxns.map(m => `<span class="inline-block bg-[var(--accent)] px-1.5 py-0.5 rounded text-[10px]">${m.date || 'Rec'} £${m.amount.toFixed(2)} (${m.reference || m.description})</span>`).join(' ')
        : '<span class="text-rose-500 italic text-xs">No bank match</span>';

      return `
        <tr class="hover:bg-[var(--accent)]/30 transition-colors border-b border-[var(--border)]">
          <td class="py-3 px-3">
            <div class="font-semibold text-xs text-[var(--foreground)]">${t.property}</div>
            <div class="text-[11px] text-[var(--muted-foreground)]">${t.room}</div>
          </td>
          <td class="py-3 px-3">
            <div class="font-medium text-xs text-[var(--foreground)]">${t.tenantName}</div>
            <div class="text-[10px] text-[var(--muted-foreground)] font-mono">${t.id}</div>
          </td>
          <td class="py-3 px-3 text-center text-xs font-mono">${t.dueDay}th</td>
          <td class="py-3 px-3 text-right text-xs font-mono font-semibold">£${rec.expected.toFixed(2)}</td>
          <td class="py-3 px-3 text-right text-xs font-mono font-semibold text-emerald-600">£${rec.received.toFixed(2)}</td>
          <td class="py-3 px-3 text-right text-xs font-mono font-bold ${rec.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}">
            £${rec.balance.toFixed(2)}
          </td>
          <td class="py-3 px-3 text-center">
            <span class="px-2 py-0.5 text-[11px] font-semibold rounded-full border ${rec.statusClass}">
              ${rec.status}
            </span>
          </td>
          <td class="py-3 px-3 text-right space-x-1 whitespace-nowrap">
            <button onclick="App.openAuditModal(${idx})" class="px-2 py-1 text-[11px] rounded bg-[var(--card)] hover:bg-[var(--accent)] border border-[var(--border)] text-[var(--foreground)] transition-colors shadow-xs" title="View 8-Question Audit">
              Audit
            </button>
            <button onclick="App.openMessageModal(${idx})" class="px-2 py-1 text-[11px] font-medium rounded ${rec.balance > 0 ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'} transition-colors shadow-xs" title="Generate Message">
              ${rec.balance > 0 ? 'Remind' : 'Message'}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderUnallocatedTable() {
    const tbody = document.getElementById('unallocated-tbody');
    if (!tbody) return;

    const unalloc = this.state.reconciliation ? this.state.reconciliation.unallocatedTxns : [];
    if (unalloc.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-xs text-emerald-600 font-sans">✓ All bank credits are matched. No unallocated funds in suspense!</td></tr>`;
      return;
    }

    tbody.innerHTML = unalloc.map(t => `
      <tr class="hover:bg-[var(--accent)]/30 transition-colors border-b border-[var(--border)] text-xs font-mono">
        <td class="py-2.5 px-3">${t.date || 'N/A'}</td>
        <td class="py-2.5 px-3 font-sans">${t.description || 'Incoming Credit'}</td>
        <td class="py-2.5 px-3 text-[var(--muted-foreground)] font-bold">${t.reference || 'None'}</td>
        <td class="py-2.5 px-3 text-right text-purple-600 font-bold">£${(t.amount || 0).toFixed(2)}</td>
        <td class="py-2.5 px-3 text-right">
          <span class="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 text-[10px] font-semibold border border-purple-500/20">Suspense Account</span>
        </td>
      </tr>
    `).join('');
  },

  renderComplianceTable() {
    const tbody = document.getElementById('compliance-tbody');
    if (!tbody) return;

    if (this.state.compliance.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-[var(--muted-foreground)] font-sans">No compliance records loaded. Drag & drop compliance tracker CSV or click "Load Demo Data".</td></tr>`;
      return;
    }

    tbody.innerHTML = this.state.compliance.map(c => {
      let badgeClass = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      if (c.status === 'Expired') badgeClass = 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      if (c.status === 'Due Soon') badgeClass = 'bg-amber-500/10 text-amber-600 border-amber-500/20';

      return `
        <tr class="hover:bg-[var(--accent)]/30 transition-colors border-b border-[var(--border)] text-xs">
          <td class="py-3 px-3 font-semibold text-[var(--foreground)]">${c.property}</td>
          <td class="py-3 px-3 text-[var(--muted-foreground)]">${c.room}</td>
          <td class="py-3 px-3 font-medium text-[var(--foreground)]">${c.requirement}</td>
          <td class="py-3 px-3 font-mono text-[var(--muted-foreground)]">${c.reference}</td>
          <td class="py-3 px-3 font-mono">${c.expiryDate || 'Continuous'}</td>
          <td class="py-3 px-3 text-center">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badgeClass}">${c.status}</span>
          </td>
          <td class="py-3 px-3 text-[var(--muted-foreground)] text-[11px]">${c.notes || c.provider}</td>
        </tr>
      `;
    }).join('');
  },

  renderTenancyTable() {
    const tbody = document.getElementById('tenancies-tbody');
    if (!tbody) return;

    if (this.state.rentRoll.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-[var(--muted-foreground)] font-sans">No tenancy directory records loaded.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.state.rentRoll.map(t => `
      <tr class="hover:bg-[var(--accent)]/30 transition-colors border-b border-[var(--border)] text-xs">
        <td class="py-3 px-3 font-semibold text-[var(--foreground)]">${t.property}</td>
        <td class="py-3 px-3 text-[var(--muted-foreground)]">${t.room}</td>
        <td class="py-3 px-3 font-medium text-[var(--foreground)]">${t.tenantName}</td>
        <td class="py-3 px-3 font-mono text-right font-semibold">£${(t.monthlyRent || 0).toFixed(2)}</td>
        <td class="py-3 px-3 font-mono text-center">${t.dueDay}th</td>
        <td class="py-3 px-3 font-mono text-right">£${(t.depositAmount || 0).toFixed(2)}</td>
        <td class="py-3 px-3 text-[var(--muted-foreground)]">${t.depositStatus}</td>
      </tr>
    `).join('');
  },

  // Modal Handlers
  openMessageModal(recordIndex) {
    const rec = this.state.reconciliation.matchedRecords[recordIndex];
    if (!rec) return;

    this.state.selectedRecordForMsg = rec;
    let comms;

    if (rec.balance > 0) {
      comms = CommsTemplates.generateArrearsNotice(rec);
    } else {
      comms = CommsTemplates.generateWelcomePack(rec.tenancy);
    }

    document.getElementById('msg-recipient').innerText = comms.recipient;
    document.getElementById('msg-subject').innerText = comms.subject;
    document.getElementById('msg-body').innerText = comms.body;

    document.getElementById('message-modal').classList.remove('hidden');
  },

  closeMessageModal() {
    document.getElementById('message-modal').classList.add('hidden');
  },

  copyModalMessage() {
    const body = document.getElementById('msg-body').innerText;
    navigator.clipboard.writeText(body).then(() => {
      this.showToast('Message copied to clipboard! Ready to paste into email, WhatsApp, or COHO.');
      this.closeMessageModal();
    });
  },

  openAuditModal(recordIndex) {
    const rec = this.state.reconciliation.matchedRecords[recordIndex];
    if (!rec) return;

    const auditText = CommsTemplates.generateNothingSlipsAudit(rec);
    document.getElementById('audit-text-content').innerText = auditText;
    document.getElementById('audit-modal').classList.remove('hidden');
  },

  closeAuditModal() {
    document.getElementById('audit-modal').classList.add('hidden');
  },

  copyAuditText() {
    const text = document.getElementById('audit-text-content').innerText;
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('8-Question Audit record copied to clipboard!');
      this.closeAuditModal();
    });
  },

  // Landlord Report Generator
  generateLandlordReport() {
    if (!this.state.reconciliation || this.state.reconciliation.matchedRecords.length === 0) {
      alert('Please load or import tenancies and bank data first.');
      return;
    }
    const propName = prompt('Enter the property name to generate landlord report for (e.g. 24 Elm Grove):', '24 Elm Grove');
    if (!propName) return;

    const comms = CommsTemplates.generateLandlordSummary(propName, this.state.reconciliation.matchedRecords, this.state.reconciliation.unallocatedTxns);

    document.getElementById('msg-recipient').innerText = comms.recipient;
    document.getElementById('msg-subject').innerText = comms.subject;
    document.getElementById('msg-body').innerText = comms.body;
    document.getElementById('message-modal').classList.remove('hidden');
  },

  // Export to CSV
  exportReconciledCSV() {
    if (!this.state.reconciliation || this.state.reconciliation.matchedRecords.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = ['Property', 'Room', 'Tenant ID', 'Tenant Name', 'Due Day', 'Expected Rent', 'Received Rent', 'Balance Arrears', 'Status', 'Action Needed'];
    const rows = this.state.reconciliation.matchedRecords.map(r => [
      `"${r.tenancy.property}"`,
      `"${r.tenancy.room}"`,
      `"${r.tenancy.id}"`,
      `"${r.tenancy.tenantName}"`,
      r.tenancy.dueDay,
      r.expected.toFixed(2),
      r.received.toFixed(2),
      r.balance.toFixed(2),
      `"${r.status}"`,
      `"${r.actionNeeded}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `COHO_Reconciled_Rent_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  },

  // Toast notification
  showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = message;
    toast.classList.remove('opacity-0', 'translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');
    setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', 'translate-y-2');
    }, 3200);
  }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
