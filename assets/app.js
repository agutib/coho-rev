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
    currentWorkspace: 'hub',
    statusFilter: 'ALL',
    searchQuery: '',
    selectedRecordForMsg: null
  },

  init() {
    // Auth gate — redirect to login if no valid session
    if (sessionStorage.getItem('coho_auth') !== 'true') {
      window.location.replace('login.html');
      return;
    }
    // Clean URL: rewrite /index.html or / to /home
    if (window.location.pathname === '/index.html' || window.location.pathname === '/') {
      window.history.replaceState(null, '', '/home' + (window.location.hash || ''));
    }
    this.loadFromStorage();
    this.bindEvents();
    this.render();

    if (typeof P360 !== 'undefined' && P360.init) {
      P360.init();
    }

    // Check initial hash route
    const hash = (window.location.hash || '').replace('#/', '').replace('#', '').toLowerCase();
    if (hash === 'coho' || hash === 'p360' || hash === 'isi') {
      this.switchWorkspace(hash, false);
    } else {
      this.switchWorkspace('hub', false);
    }

    // Bind hash change listener
    window.addEventListener('hashchange', () => {
      const h = (window.location.hash || '').replace('#/', '').replace('#', '').toLowerCase();
      if (h === 'coho' || h === 'p360' || h === 'isi' || h === 'hub') {
        this.switchWorkspace(h, false);
      }
    });
  },

  logout() {
    sessionStorage.removeItem('coho_auth');
    sessionStorage.removeItem('coho_auth_token');
    sessionStorage.removeItem('coho_auth_time');
    window.location.replace('login.html');
  },

  // HTML sanitization helper (Remediates XSS-001)
  escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
    // File input for manual upload
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleFileUpload(e.target.files[0]);
          e.target.value = '';
        }
      });
    }

    // Optional legacy dropzone if present
    const dropzone = document.getElementById('dropzone');
    if (dropzone) {
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
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      const exportContainer = document.getElementById('exportDropdownContainer');
      const exportDropdown = document.getElementById('exportMenuDropdown');
      if (exportDropdown && !exportDropdown.classList.contains('hidden')) {
        if (exportContainer && !exportContainer.contains(e.target)) {
          this.closeExportMenu();
        }
      }

      const clientContainer = document.getElementById('clientDropdownContainer');
      const clientDropdown = document.getElementById('clientMenuDropdown');
      if (clientDropdown && !clientDropdown.classList.contains('hidden')) {
        if (clientContainer && !clientContainer.contains(e.target)) {
          this.closeClientMenu();
        }
      }
    });

    // Close dropdowns and modals on Escape key (Remediates A11Y-003)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeExportMenu();
        this.closeClientMenu();
        this.closeMessageModal();
        this.closeAuditModal();
      }
    });

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
      btn.classList.remove('border-emerald-600', 'text-emerald-600', 'dark:text-emerald-400', 'font-bold');
      btn.classList.add('border-transparent', 'text-slate-500', 'dark:text-slate-400');
      btn.setAttribute('aria-selected', 'false');
    });

    const pane = document.getElementById(`pane-${tabId}`);
    const btn = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);

    if (pane) pane.classList.remove('hidden');
    if (btn) {
      btn.classList.remove('border-transparent', 'text-slate-500', 'dark:text-slate-400');
      btn.classList.add('border-emerald-600', 'text-emerald-600', 'dark:text-emerald-400', 'font-bold');
      btn.setAttribute('aria-selected', 'true');
    }

    if (tabId === 'ai-copilot') {
      if (typeof Chat !== 'undefined' && Chat.focusWorkspace) {
        Chat.focusWorkspace();
      }
    }

    this.render();
  },

  switchWorkspace(key, updateHash = true) {
    const validKeys = ['hub', 'coho', 'p360', 'isi'];
    if (!validKeys.includes(key)) key = 'hub';
    this.state.currentWorkspace = key;

    const hubEl = document.getElementById('view-hub-home');
    const cohoEl = document.getElementById('view-workspace-coho');
    const p360El = document.getElementById('view-workspace-p360');
    const isiEl = document.getElementById('view-workspace-isi');

    if (hubEl) hubEl.classList.toggle('hidden', key !== 'hub');
    if (cohoEl) cohoEl.classList.toggle('hidden', key !== 'coho');
    if (p360El) p360El.classList.toggle('hidden', key !== 'p360');
    if (isiEl) isiEl.classList.toggle('hidden', key !== 'isi');

    // Update Header active labels & breadcrumbs
    const clientLabel = document.getElementById('currentClientLabel');
    const clientIcon = document.getElementById('currentClientIcon');
    const clientBtn = document.getElementById('clientMenuBtn');
    const hubBreadcrumb = document.getElementById('hubBreadcrumb');
    const cohoHeaderActions = document.getElementById('cohoHeaderActions');
    const copilotSkillContainer = document.getElementById('copilot-skill-container');

    const meta = {
      hub: { name: 'Rev OPS Hub', icon: '🏢', btnClass: 'bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600' },
      coho: { name: 'COHO Operations', icon: '🏡', btnClass: 'bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
      p360: { name: 'People360', icon: '👥', btnClass: 'bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
      isi: { name: 'Innovuze Solutions', icon: '⚡', btnClass: 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' }
    };

    const info = meta[key] || meta.hub;
    if (clientLabel) clientLabel.textContent = info.name;
    if (clientIcon) clientIcon.textContent = info.icon;
    if (clientBtn) {
      clientBtn.className = `px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap flex-shrink-0 ${info.btnClass}`;
    }
    if (hubBreadcrumb) hubBreadcrumb.classList.toggle('hidden', key === 'hub');

    // Toggle COHO header action buttons (Only on COHO workspace)
    if (cohoHeaderActions) {
      if (key === 'coho') {
        cohoHeaderActions.classList.remove('hidden');
        cohoHeaderActions.classList.add('flex');
      } else {
        cohoHeaderActions.classList.add('hidden');
        cohoHeaderActions.classList.remove('flex');
      }
    }

    // Toggle Copilot COHO skills dropdown (Only on COHO workspace)
    if (copilotSkillContainer) {
      copilotSkillContainer.classList.toggle('hidden', key !== 'coho');
    }

    if (updateHash) {
      window.location.hash = `#/${key}`;
    }

    // Move Copilot Workspace into the active view container
    const copilot = document.getElementById('copilot-workspace');
    if (copilot) {
      let targetContainer = document.getElementById('hub-copilot-container');
      if (key === 'coho') {
        targetContainer = document.getElementById('coho-copilot-container') || targetContainer;
      } else if (key === 'p360') {
        targetContainer = document.getElementById('p360-copilot-container') || targetContainer;
      } else if (key === 'isi') {
        targetContainer = document.getElementById('isi-copilot-container') || targetContainer;
      }
      if (targetContainer && copilot.parentElement !== targetContainer) {
        targetContainer.appendChild(copilot);
      }
    }

    // Set Chat client context
    if (typeof Chat !== 'undefined' && Chat.setClientContext) {
      Chat.setClientContext(key);
    }

    if (key === 'p360' && typeof P360 !== 'undefined' && P360.onWorkspaceEnter) {
      P360.onWorkspaceEnter();
    }

    this.closeClientMenu();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  toggleClientMenu(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('clientMenuDropdown');
    const btn = document.getElementById('clientMenuBtn');
    if (dropdown) {
      const isHidden = dropdown.classList.toggle('hidden');
      if (btn) btn.setAttribute('aria-expanded', (!isHidden).toString());
    }
  },

  closeClientMenu() {
    const dropdown = document.getElementById('clientMenuDropdown');
    const btn = document.getElementById('clientMenuBtn');
    if (dropdown) dropdown.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  },

  openAICopilotWithGuide() {
    if (this.state.currentWorkspace === 'coho') {
      this.switchTab('ai-copilot');
    } else if (this.state.currentWorkspace === 'hub') {
      const el = document.getElementById('hub-copilot-container');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
    if (typeof Chat !== 'undefined' && Chat.openGuideInWorkspace) {
      Chat.openGuideInWorkspace();
    }
    if (typeof Chat !== 'undefined' && Chat.focusWorkspace) {
      Chat.focusWorkspace();
    }
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
    const rate = recon.summary.collectionRate !== undefined && !isNaN(recon.summary.collectionRate)
      ? Number(recon.summary.collectionRate).toFixed(1)
      : '0.0';
    document.getElementById('stat-collection-rate').innerText = `${rate}%`;

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
        ? rec.matchedTxns.map(m => `<span class="inline-block bg-[var(--accent)] px-1.5 py-0.5 rounded text-[10px]">${this.escapeHTML(m.date || 'Rec')} £${m.amount.toFixed(2)} (${this.escapeHTML(m.reference || m.description)})</span>`).join(' ')
        : '<span class="text-rose-500 italic text-xs">No bank match</span>';

      return `
        <tr class="hover:bg-[var(--accent)]/30 transition-colors border-b border-[var(--border)]">
          <td class="py-3 px-3">
            <div class="font-semibold text-xs text-[var(--foreground)]">${this.escapeHTML(t.property)}</div>
            <div class="text-[11px] text-[var(--muted-foreground)]">${this.escapeHTML(t.room)}</div>
          </td>
          <td class="py-3 px-3">
            <div class="font-medium text-xs text-[var(--foreground)]">${this.escapeHTML(t.tenantName)}</div>
            <div class="text-[10px] text-[var(--muted-foreground)] font-mono">${this.escapeHTML(t.id)}</div>
          </td>
          <td class="py-3 px-3 text-center text-xs font-mono">${t.dueDay}th</td>
          <td class="py-3 px-3 text-right text-xs font-mono font-semibold">£${rec.expected.toFixed(2)}</td>
          <td class="py-3 px-3 text-right text-xs font-mono font-semibold text-emerald-600">£${rec.received.toFixed(2)}</td>
          <td class="py-3 px-3 text-right text-xs font-mono font-bold ${rec.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}">
            £${rec.balance.toFixed(2)}
          </td>
          <td class="py-3 px-3 text-center">
            <span class="px-2 py-0.5 text-[11px] font-semibold rounded-full border ${rec.statusClass}">
              ${this.escapeHTML(rec.status)}
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
        <td class="py-2.5 px-3">${this.escapeHTML(t.date || 'N/A')}</td>
        <td class="py-2.5 px-3 font-sans">${this.escapeHTML(t.description || 'Incoming Credit')}</td>
        <td class="py-2.5 px-3 text-[var(--muted-foreground)] font-bold">${this.escapeHTML(t.reference || 'None')}</td>
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
          <td class="py-3 px-3 font-semibold text-[var(--foreground)]">${this.escapeHTML(c.property)}</td>
          <td class="py-3 px-3 text-[var(--muted-foreground)]">${this.escapeHTML(c.room)}</td>
          <td class="py-3 px-3 font-medium text-[var(--foreground)]">${this.escapeHTML(c.requirement)}</td>
          <td class="py-3 px-3 font-mono text-[var(--muted-foreground)]">${this.escapeHTML(c.reference)}</td>
          <td class="py-3 px-3 font-mono">${this.escapeHTML(c.expiryDate || 'Continuous')}</td>
          <td class="py-3 px-3 text-center">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badgeClass}">${this.escapeHTML(c.status)}</span>
          </td>
          <td class="py-3 px-3 text-[var(--muted-foreground)] text-[11px]">${this.escapeHTML(c.notes || c.provider)}</td>
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
        <td class="py-3 px-3 font-semibold text-[var(--foreground)]">${this.escapeHTML(t.property)}</td>
        <td class="py-3 px-3 text-[var(--muted-foreground)]">${this.escapeHTML(t.room)}</td>
        <td class="py-3 px-3 font-medium text-[var(--foreground)]">${this.escapeHTML(t.tenantName)}</td>
        <td class="py-3 px-3 font-mono text-right font-semibold">£${(t.monthlyRent || 0).toFixed(2)}</td>
        <td class="py-3 px-3 font-mono text-center">${t.dueDay}th</td>
        <td class="py-3 px-3 font-mono text-right">£${(t.depositAmount || 0).toFixed(2)}</td>
        <td class="py-3 px-3 text-[var(--muted-foreground)]">${this.escapeHTML(t.depositStatus)}</td>
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

  // Export Menu Controls
  toggleExportMenu(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('exportMenuDropdown');
    const btn = document.getElementById('exportMenuBtn');
    if (dropdown) {
      const isHidden = dropdown.classList.toggle('hidden');
      if (btn) btn.setAttribute('aria-expanded', (!isHidden).toString());
    }
  },

  closeExportMenu() {
    const dropdown = document.getElementById('exportMenuDropdown');
    const btn = document.getElementById('exportMenuBtn');
    if (dropdown) dropdown.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  },

  // 1. Export Excel (.xlsx) Multi-Tab Workbook via SheetJS
  exportExcel() {
    this.closeExportMenu();
    if (!this.state.reconciliation || this.state.reconciliation.matchedRecords.length === 0) {
      alert('No data loaded to export. Please load or drop your records first.');
      return;
    }
    if (typeof XLSX === 'undefined') {
      alert('SheetJS Excel library not available. Please export as CSV.');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Rent Reconciliation
    const reconData = [
      ['Property', 'Room', 'Tenant ID', 'Tenant Name', 'Due Day', 'Expected (£)', 'Received (£)', 'Balance Arrears (£)', 'Status', 'Matched Bank Credits', 'Action Needed'],
      ...this.state.reconciliation.matchedRecords.map(r => [
        r.tenancy.property,
        r.tenancy.room,
        r.tenancy.id,
        r.tenancy.tenantName,
        r.tenancy.dueDay,
        r.expected,
        r.received,
        r.balance,
        r.status,
        r.matchedTxns.map(m => `£${m.amount.toFixed(2)} (${m.date || ''} - ${m.reference || m.description})`).join('; ') || 'None',
        r.actionNeeded
      ])
    ];
    const wsRecon = XLSX.utils.aoa_to_sheet(reconData);
    XLSX.utils.book_append_sheet(wb, wsRecon, 'Rent Reconciliation');

    // Sheet 2: Tenancy Directory
    if (this.state.rentRoll && this.state.rentRoll.length > 0) {
      const tenData = [
        ['Property', 'Room', 'Tenant ID', 'Tenant Name', 'Monthly Rent (£)', 'Due Day', 'Start Date', 'End Date', 'Deposit (£)', 'Deposit Status'],
        ...this.state.rentRoll.map(t => [
          t.property,
          t.room,
          t.id,
          t.tenantName,
          t.monthlyRent,
          t.dueDay,
          t.startDate || '',
          t.endDate || '',
          t.depositAmount || 0,
          t.depositStatus || ''
        ])
      ];
      const wsTen = XLSX.utils.aoa_to_sheet(tenData);
      XLSX.utils.book_append_sheet(wb, wsTen, 'Tenancy Directory');
    }

    // Sheet 3: HMO Compliance
    if (this.state.compliance && this.state.compliance.length > 0) {
      const compData = [
        ['Property', 'Scope / Room', 'Requirement', 'Reference', 'Effective Date', 'Expiry Date', 'Status', 'Provider / Notes'],
        ...this.state.compliance.map(c => [
          c.property,
          c.room,
          c.requirement,
          c.reference,
          c.effectiveDate || '',
          c.expiryDate || '',
          c.status,
          c.notes || c.provider || ''
        ])
      ];
      const wsComp = XLSX.utils.aoa_to_sheet(compData);
      XLSX.utils.book_append_sheet(wb, wsComp, 'HMO Compliance');
    }

    // Sheet 4: Suspense (Unallocated Bank Credits)
    const unalloc = this.state.reconciliation.unallocatedTxns || [];
    if (unalloc.length > 0) {
      const unallocData = [
        ['Date', 'Description', 'Payer Reference', 'Amount (£)', 'Account Status'],
        ...unalloc.map(u => [
          u.date || '',
          u.description || '',
          u.reference || '',
          u.amount || 0,
          'Unallocated (Suspense Account)'
        ])
      ];
      const wsUnalloc = XLSX.utils.aoa_to_sheet(unallocData);
      XLSX.utils.book_append_sheet(wb, wsUnalloc, 'Suspense Credits');
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `COHO_Operations_Master_${dateStr}.xlsx`);
    this.showToast('📗 Exported full multi-sheet Excel Workbook (.xlsx)!');
  },

  // 2. Export Google Sheets (Clipboard TSV + TSV file)
  exportGoogleSheets() {
    this.closeExportMenu();
    if (!this.state.reconciliation || this.state.reconciliation.matchedRecords.length === 0) {
      alert('No data loaded to export.');
      return;
    }

    const headers = ['Property', 'Room', 'Tenant ID', 'Tenant Name', 'Due Day', 'Expected Rent (£)', 'Received Rent (£)', 'Balance Arrears (£)', 'Status', 'Action Needed'];
    const rows = this.state.reconciliation.matchedRecords.map(r => [
      r.tenancy.property,
      r.tenancy.room,
      r.tenancy.id,
      r.tenancy.tenantName,
      r.tenancy.dueDay,
      r.expected.toFixed(2),
      r.received.toFixed(2),
      r.balance.toFixed(2),
      r.status,
      r.actionNeeded
    ]);

    const tsvContent = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsvContent).then(() => {
        this.showToast('📊 Copied to clipboard! Just click any cell in Google Sheets and press Ctrl+V.');
      }).catch(() => {
        this.downloadTSVFile(tsvContent);
      });
    } else {
      this.downloadTSVFile(tsvContent);
    }
  },

  downloadTSVFile(content) {
    const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `COHO_Google_Sheets_Ready_${new Date().toISOString().slice(0, 10)}.tsv`;
    link.click();
    this.showToast('Downloaded Google Sheets TSV file.');
  },

  // 3. Export Standard Accounting CSV (.csv)
  exportReconciledCSV() {
    this.closeExportMenu();
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
    this.showToast('📄 Downloaded Reconciled CSV file.');
  },

  // 4. Export Executive PDF Report (Print-ready document)
  exportPDF() {
    this.closeExportMenu();
    if (!this.state.reconciliation || this.state.reconciliation.matchedRecords.length === 0) {
      alert('No data loaded to generate report.');
      return;
    }

    const recon = this.state.reconciliation;
    const records = recon.matchedRecords;
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>COHO OpsHub — Executive Property Operations Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 30px; font-size: 12px; line-height: 1.4; }
          .header { border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          .logo { font-size: 20px; font-weight: 800; color: #059669; }
          .sublogo { font-size: 11px; color: #64748b; margin-top: 2px; }
          .meta { text-align: right; font-size: 11px; color: #64748b; }
          .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .kpi-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; background: #f8fafc; }
          .kpi-title { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
          .kpi-val { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 2px; }
          .val-green { color: #059669; }
          .val-red { color: #dc2626; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 11px; }
          th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-weight: 700; border-bottom: 2px solid #cbd5e1; font-size: 10px; text-transform: uppercase; color: #475569; }
          td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
          .badge { display: inline-block; padding: 2px 7px; border-radius: 9999px; font-size: 9px; font-weight: 700; }
          .badge-cleared { background: #dcfce7; color: #166534; }
          .badge-partial { background: #fef3c7; color: #92400e; }
          .badge-missing { background: #fee2e2; color: #991b1b; }
          .badge-overpaid { background: #f3e8ff; color: #6b21a8; }
          .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">COHO OpsHub</div>
            <div class="sublogo">UK HMO Property Management & Operations Center</div>
          </div>
          <div class="meta">
            <div><strong>Report Date:</strong> ${dateStr}</div>
            <div><strong>Total Units:</strong> ${records.length} rooms</div>
          </div>
        </div>

        <div class="kpis">
          <div class="kpi-card">
            <div class="kpi-title">Expected Rent</div>
            <div class="kpi-val">£${recon.summary.totalExpected.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Collected Rent</div>
            <div class="kpi-val val-green">£${recon.summary.totalReceived.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Arrears Shortfall</div>
            <div class="kpi-val val-red">£${recon.summary.totalArrears.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Collection Rate</div>
            <div class="kpi-val">${recon.summary.collectionRate}%</div>
          </div>
        </div>

        <h3 style="font-size: 13px; font-weight: 700; margin-bottom: 8px;">Rent Reconciliation & Arrears Schedule</h3>
        <table>
          <thead>
            <tr>
              <th>Property & Room</th>
              <th>Tenant Name</th>
              <th>Due Day</th>
              <th style="text-align: right;">Expected</th>
              <th style="text-align: right;">Received</th>
              <th style="text-align: right;">Balance</th>
              <th style="text-align: center;">Status</th>
              <th>Action Required</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td><strong>${this.escapeHTML(r.tenancy.property)}</strong> - ${this.escapeHTML(r.tenancy.room)}</td>
                <td>${this.escapeHTML(r.tenancy.tenantName)}</td>
                <td>${r.tenancy.dueDay}th</td>
                <td style="text-align: right; font-family: monospace;">£${r.expected.toFixed(2)}</td>
                <td style="text-align: right; font-family: monospace; color: #059669;">£${r.received.toFixed(2)}</td>
                <td style="text-align: right; font-family: monospace; font-weight: bold; color: ${r.balance > 0 ? '#dc2626' : '#059669'};">£${r.balance.toFixed(2)}</td>
                <td style="text-align: center;">
                  <span class="badge ${r.status === 'CLEARED' ? 'badge-cleared' : r.status === 'PARTIAL' ? 'badge-partial' : r.status === 'OVERPAID' ? 'badge-overpaid' : 'badge-missing'}">
                    ${this.escapeHTML(r.status)}
                  </span>
                </td>
                <td style="font-size: 10px; color: #64748b;">${this.escapeHTML(r.actionNeeded)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div>Generated by COHO OpsHub · Private & Confidential Operations Dossier</div>
          <div>Page 1 of 1</div>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=900,height=750');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
      this.showToast('📕 PDF Print window opened! Select "Save as PDF" to save.');
    } else {
      alert('Please allow popups to generate the printable PDF report.');
    }
  },

  // 5. Export Word Document (.doc)
  exportWordDoc() {
    this.closeExportMenu();
    if (!this.state.reconciliation || this.state.reconciliation.matchedRecords.length === 0) {
      alert('No data loaded to export.');
      return;
    }

    const recon = this.state.reconciliation;
    const records = recon.matchedRecords;
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const docContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>COHO OpsHub Operations Summary</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111827; }
          h1 { color: #047857; font-size: 18pt; margin-bottom: 4pt; }
          h2 { color: #374151; font-size: 13pt; margin-top: 14pt; }
          p { margin: 4pt 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10pt; }
          th { background-color: #f3f4f6; border: 1px solid #d1d5db; padding: 6pt; font-weight: bold; text-align: left; font-size: 10pt; }
          td { border: 1px solid #e5e7eb; padding: 6pt; font-size: 10pt; }
          .strong { font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>COHO OpsHub — Property Operations Summary</h1>
        <p><strong>Report Date:</strong> ${dateStr}</p>
        <p><strong>Total Expected Rent:</strong> £${recon.summary.totalExpected.toFixed(2)} | <strong>Collected:</strong> £${recon.summary.totalReceived.toFixed(2)} | <strong>Arrears:</strong> £${recon.summary.totalArrears.toFixed(2)} | <strong>Collection Rate:</strong> ${recon.summary.collectionRate}%</p>

        <h2>Tenancy Reconciliation Schedule</h2>
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Room</th>
              <th>Tenant</th>
              <th>Expected (£)</th>
              <th>Received (£)</th>
              <th>Balance (£)</th>
              <th>Status</th>
              <th>Action Needed</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td>${r.tenancy.property}</td>
                <td>${r.tenancy.room}</td>
                <td>${r.tenancy.tenantName}</td>
                <td>${r.expected.toFixed(2)}</td>
                <td>${r.received.toFixed(2)}</td>
                <td>${r.balance.toFixed(2)}</td>
                <td>${r.status}</td>
                <td>${r.actionNeeded}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + docContent], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `COHO_Executive_Summary_${new Date().toISOString().slice(0, 10)}.doc`;
    link.click();
    this.showToast('📘 Downloaded Word Document (.doc)!');
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

/**
 * People360 (P360) Daily Task Report Controller
 * Manages shift timer, 5-category recurring task checklist, deduplication,
 * live report preview, Outlook dispatch, and local history archive.
 */
const P360 = {
  state: {
    isClockedIn: false,
    startTime: null,
    endTime: null,
    elapsedSeconds: 0,
    timerInterval: null,
    reportDate: '',
    checkedTaskIds: new Set(),
    taskDetails: {},
    customNotes: '',
    plansNotes: '',
    compiledReport: '',
    history: []
  },

  init() {
    // 1. Initialize report date
    const today = new Date();
    const monthNames = (window.P360Engine && window.P360Engine.MONTH_NAMES)
      ? window.P360Engine.MONTH_NAMES
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    this.state.reportDate = `${today.getFullYear()}-${monthNames[today.getMonth()]}-${String(today.getDate()).padStart(2, '0')}`;
    
    const dateInput = document.getElementById('p360ReportDate');
    if (dateInput) {
      dateInput.value = this.state.reportDate;
    }

    // 2. Load saved history first
    this.loadHistory();

    // 3. Restore shift state
    this.loadShiftState();

    // 4. Restore saved draft
    this.loadDraft();

    // 5. If no checkedTaskIds from draft, populate all defaultChecked tasks
    if (this.state.checkedTaskIds.size === 0 && window.P360Engine && window.P360Engine.P360_CATALOG) {
      window.P360Engine.P360_CATALOG.forEach(cat => {
        cat.tasks.forEach(t => {
          if (t.defaultChecked) this.state.checkedTaskIds.add(t.id);
        });
      });
    }

    // 6. Render catalog
    this.renderCatalog();

    // 7. Initial compile if empty
    if (!this.state.compiledReport) {
      this.compile(false);
    }
    this.updateSubjectPreview();
  },

  onWorkspaceEnter() {
    const container = document.getElementById('p360CatalogContainer');
    if (!container || !container.hasChildNodes() || container.children.length === 0) {
      if (this.state.checkedTaskIds.size === 0 && window.P360Engine && window.P360Engine.P360_CATALOG) {
        window.P360Engine.P360_CATALOG.forEach(cat => {
          cat.tasks.forEach(t => {
            if (t.defaultChecked) this.state.checkedTaskIds.add(t.id);
          });
        });
      }
      this.renderCatalog();
    }
    const reportBox = document.getElementById('p360CompiledReport');
    if (!reportBox || !reportBox.value || !reportBox.value.trim()) {
      this.compile(false);
    }
    this.updateSubjectPreview();
    this.updateTimerUI();
    this.renderHistory();
  },

  renderCatalog() {
    const container = document.getElementById('p360CatalogContainer');
    if (!container || !window.P360Engine || !window.P360Engine.P360_CATALOG) return;

    // Guarantee default checked items are registered if set is empty
    if (this.state.checkedTaskIds.size === 0) {
      window.P360Engine.P360_CATALOG.forEach(cat => {
        cat.tasks.forEach(t => {
          if (t.defaultChecked) this.state.checkedTaskIds.add(t.id);
        });
      });
    }

    const catalog = window.P360Engine.P360_CATALOG;
    let html = '';

    catalog.forEach((cat, idx) => {
      const isDefaultOpen = idx < 3; // First 3 categories open by default
      html += `
        <div class="border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
          <button type="button" onclick="P360.toggleCategory('${cat.id}')" class="w-full px-3.5 py-2.5 flex items-center justify-between text-left font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors select-none">
            <div class="flex items-center gap-2">
              <span>${cat.icon}</span>
              <span>${cat.name}</span>
            </div>
            <div class="flex items-center gap-2">
              <span id="p360-cat-badge-${cat.id}" class="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">0 selected</span>
              <svg id="p360-cat-arrow-${cat.id}" class="w-3.5 h-3.5 text-slate-400 transform transition-transform ${isDefaultOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </div>
          </button>
          <div id="p360-cat-body-${cat.id}" class="${isDefaultOpen ? '' : 'hidden'} divide-y divide-slate-100 dark:divide-slate-700/60 bg-white dark:bg-slate-800/90">
      `;

      cat.tasks.forEach(t => {
        const isChecked = this.state.checkedTaskIds.has(t.id);
        const currentDetail = this.state.taskDetails[t.id] || '';

        html += `
          <div class="p-3 space-y-2">
            <label class="flex items-start gap-2.5 cursor-pointer select-none">
              <input type="checkbox" id="task-chk-${t.id}" onchange="P360.handleTaskToggle('${t.id}')" ${isChecked ? 'checked' : ''} class="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer">
              <span class="text-xs text-slate-700 dark:text-slate-200 leading-snug font-medium">${t.label}</span>
            </label>
        `;

        if (t.commonClients && Array.isArray(t.commonClients)) {
          html += `
            <div class="pl-6.5 flex flex-wrap items-center gap-1">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none mr-1">Clients:</span>
              ${t.commonClients.map(c => `
                <button type="button" onclick="P360.toggleClientPill('${t.id}', '${c}')" class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-200 transition-colors shadow-2xs">
                  ${c}
                </button>
              `).join('')}
            </div>
          `;
        }

        if (t.hasDetails) {
          html += `
            <div class="pl-6.5">
              <input type="text" id="detail-${t.id}" value="${App.escapeHTML(currentDetail)}" oninput="P360.handleDetailChange('${t.id}', this.value)" placeholder="${t.detailPlaceholder || 'Enter specific numbers / client names...'}" class="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono">
            </div>
          `;
        }

        html += `</div>`;
      });

      html += `
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    this.updateCategoryBadges();
  },

  loadSampleShift() {
    this.state.checkedTaskIds.clear();
    const sampleIds = [
      'inv-open-monitor',
      'inv-finalize-stripe-xero',
      'bank-wf-recon',
      'payroll-wise-batch',
      'onboard-profile-create'
    ];
    sampleIds.forEach(id => this.state.checkedTaskIds.add(id));

    this.state.taskDetails['inv-finalize-stripe-xero'] = 'SHERMAN, SIF, MEC';
    this.state.taskDetails['bank-wf-recon'] = 'Wells Fargo 6470';

    this.state.customNotes = 'Reviewed Outstanding Invoices Report and monitored Stripe open invoices.\nEmailed Vinnie re Edge Nation invoices via Stripe.\nCalled Vinnie re Edge Nation payment reminder — follow-up text sent.\nProvided update to Dinese and Mike re Edge Nation payment status.\nResponded to Mike\'s email re Hubstaff timesheet approvals.';

    this.state.plansNotes = 'Follow up with Vinnie re Edge Nation payment confirmation.\nAudit next bi-weekly payroll file in Connecteam.\nReview Stripe customer payment responses.';

    const customEl = document.getElementById('p360CustomNotes');
    if (customEl) customEl.value = this.state.customNotes;

    const plansEl = document.getElementById('p360PlansNotes');
    if (plansEl) plansEl.value = this.state.plansNotes;

    this.renderCatalog();
    this.compile(true);
    App.showToast('⚡ Sample People360 shift data loaded and compiled!');
  },

  toggleCategory(catId) {
    const body = document.getElementById(`p360-cat-body-${catId}`);
    const arrow = document.getElementById(`p360-cat-arrow-${catId}`);
    if (body) {
      const isHidden = body.classList.toggle('hidden');
      if (arrow) arrow.classList.toggle('rotate-180', !isHidden);
    }
  },

  toggleClientPill(taskId, clientCode) {
    const chk = document.getElementById(`task-chk-${taskId}`);
    if (chk && !chk.checked) {
      chk.checked = true;
      this.handleTaskToggle(taskId);
    }
    const input = document.getElementById(`detail-${taskId}`);
    if (input) {
      const current = input.value.trim();
      if (!current) {
        input.value = clientCode;
      } else if (!current.includes(clientCode)) {
        input.value = current + ', ' + clientCode;
      }
      this.handleDetailChange(taskId, input.value);
    }
  },

  handleTaskToggle(taskId) {
    const chk = document.getElementById(`task-chk-${taskId}`);
    if (!chk) return;
    if (chk.checked) {
      this.state.checkedTaskIds.add(taskId);
    } else {
      this.state.checkedTaskIds.delete(taskId);
    }
    this.updateCategoryBadges();
    this.saveDraft();
    this.compile(false);
  },

  handleDetailChange(taskId, val) {
    this.state.taskDetails[taskId] = val;
    this.saveDraft();
    this.compile(false);
  },

  handleInputChange() {
    const custom = document.getElementById('p360CustomNotes');
    const plans = document.getElementById('p360PlansNotes');
    if (custom) this.state.customNotes = custom.value;
    if (plans) this.state.plansNotes = plans.value;
    this.saveDraft();
    this.compile(false);
  },

  handleDateChange(val) {
    if (!val) return;
    this.state.reportDate = val.trim();
    this.updateSubjectPreview();
    this.compile(false);
  },

  updateSubjectPreview() {
    const subjectEl = document.getElementById('p360SubjectPreview');
    if (subjectEl && window.P360Engine) {
      subjectEl.textContent = window.P360Engine.formatSubject(this.state.reportDate);
    }
  },

  updateCategoryBadges() {
    if (!window.P360Engine) return;
    window.P360Engine.P360_CATALOG.forEach(cat => {
      let count = 0;
      cat.tasks.forEach(t => {
        if (this.state.checkedTaskIds.has(t.id)) count++;
      });
      const badge = document.getElementById(`p360-cat-badge-${cat.id}`);
      if (badge) {
        badge.textContent = `${count} selected`;
        badge.className = count > 0 
          ? 'text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold'
          : 'text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium';
      }
    });
  },

  selectAllTasks(select) {
    if (!window.P360Engine) return;
    window.P360Engine.P360_CATALOG.forEach(cat => {
      cat.tasks.forEach(t => {
        const chk = document.getElementById(`task-chk-${t.id}`);
        if (chk) chk.checked = select;
        if (select) this.state.checkedTaskIds.add(t.id);
        else this.state.checkedTaskIds.delete(t.id);
      });
    });
    this.updateCategoryBadges();
    this.saveDraft();
    this.compile(false);
  },

  // ── Clock In / Out Triggers ──
  clockIn() {
    if (this.state.isClockedIn) return;
    this.state.isClockedIn = true;
    this.state.startTime = Date.now();
    this.state.endTime = null;
    this.state.elapsedSeconds = 0;

    this.startTimerInterval();
    this.saveShiftState();
    this.updateTimerUI();
    App.showToast('🟢 Shift Started! Hubstaff tracking active. Drop notes anytime.');
  },

  clockOut() {
    if (!this.state.isClockedIn) return;
    this.state.isClockedIn = false;
    this.state.endTime = Date.now();
    if (this.state.timerInterval) {
      clearInterval(this.state.timerInterval);
      this.state.timerInterval = null;
    }
    this.saveShiftState();
    this.updateTimerUI();
    this.compile(true);
    App.showToast('🔴 Clocked Out! Daily task report compiled for Mike.');
  },

  startTimerInterval() {
    if (this.state.timerInterval) clearInterval(this.state.timerInterval);
    this.state.timerInterval = setInterval(() => {
      if (this.state.isClockedIn && this.state.startTime) {
        this.state.elapsedSeconds = Math.floor((Date.now() - this.state.startTime) / 1000);
        this.updateTimerUI();
      }
    }, 1000);
  },

  resetShift() {
    if (!confirm('Are you sure you want to reset the current shift timer?')) return;
    if (this.state.timerInterval) {
      clearInterval(this.state.timerInterval);
      this.state.timerInterval = null;
    }
    this.state.isClockedIn = false;
    this.state.startTime = null;
    this.state.endTime = null;
    this.state.elapsedSeconds = 0;
    this.saveShiftState();
    this.updateTimerUI();
    App.showToast('🔄 Shift timer reset to zero.');
  },

  updateTimerUI() {
    const timerEl = document.getElementById('p360ShiftTimer');
    const badgeEl = document.getElementById('p360ShiftStatusBadge');
    const startLabel = document.getElementById('p360ShiftStartLabel');
    const pulseDot = document.getElementById('p360PulseDot');
    const inBtn = document.getElementById('p360ClockInBtn');
    const outBtn = document.getElementById('p360ClockOutBtn');

    // Format elapsed seconds to HH:MM:SS
    const secs = this.state.elapsedSeconds || 0;
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    if (timerEl) timerEl.textContent = `${h}:${m}:${s}`;

    if (this.state.isClockedIn) {
      if (badgeEl) {
        badgeEl.textContent = '🟢 TRACKER ACTIVE (Hubstaff)';
        badgeEl.className = 'text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 animate-pulse';
      }
      if (pulseDot) {
        pulseDot.className = 'w-4 h-4 rounded-full bg-emerald-500 animate-ping flex-shrink-0';
      }
      if (startLabel && this.state.startTime) {
        const d = new Date(this.state.startTime);
        startLabel.textContent = `Shift: In at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      if (inBtn) inBtn.classList.add('opacity-50', 'pointer-events-none');
      if (outBtn) {
        outBtn.disabled = false;
        outBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    } else {
      if (badgeEl) {
        badgeEl.textContent = this.state.endTime ? '⚪ SHIFT COMPLETED' : '⚪ TRACKER INACTIVE';
        badgeEl.className = 'text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
      }
      if (pulseDot) {
        pulseDot.className = 'w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0';
      }
      if (startLabel) {
        startLabel.textContent = this.state.endTime 
          ? `Shift: Out at ${new Date(this.state.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
          : 'Shift: Not started';
      }
      if (inBtn) inBtn.classList.remove('opacity-50', 'pointer-events-none');
      if (outBtn) {
        outBtn.disabled = true;
        outBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }
    }
  },

  // ── Report Compilation & Quality Gates ──
  compile(showToastNotification = true) {
    if (!window.P360Engine) return;

    // Collect checked tasks
    const checkedList = [];
    window.P360Engine.P360_CATALOG.forEach(cat => {
      cat.tasks.forEach(t => {
        if (this.state.checkedTaskIds.has(t.id)) {
          const detail = (this.state.taskDetails[t.id] || '').trim();
          const detailsArr = detail ? detail.split(',').map(s => s.trim()).filter(Boolean) : [];
          checkedList.push({
            text: t.label,
            details: detailsArr
          });
        }
      });
    });

    const report = window.P360Engine.compileLocalReport({
      dateStr: this.state.reportDate,
      checkedTasks: checkedList,
      customNotes: this.state.customNotes,
      plansNotes: this.state.plansNotes
    });

    this.state.compiledReport = report;
    const reportBox = document.getElementById('p360CompiledReport');
    if (reportBox) {
      reportBox.value = report;
    }

    this.updateSubjectPreview();
    this.saveDraft();

    if (showToastNotification) {
      App.showToast('⚡ Daily Task Report compiled for Mike!');
    }
  },

  // ── Dispatch: Direct Outlook Integration ──
  sendOutlook(mode = 'web') {
    const reportBox = document.getElementById('p360CompiledReport');
    let body = reportBox ? reportBox.value : this.state.compiledReport;
    if (!body || !body.trim()) {
      this.compile(false);
      body = this.state.compiledReport;
    }

    const subject = window.P360Engine.formatSubject(this.state.reportDate);
    const toInput = document.getElementById('p360EmailTo');
    const ccInput = document.getElementById('p360EmailCc');
    const to = (toInput && toInput.value.trim()) ? toInput.value.trim() : 'revemar@trampettimg.com';
    const cc = (ccInput && ccInput.value.trim()) ? ccInput.value.trim() : 'arnold.gutib@gmail.com';

    const urls = window.P360Engine.buildOutlookUrl({
      to: to,
      cc: cc,
      subject: subject,
      body: body
    });

    if (mode === 'mailto') {
      window.location.href = urls.mailtoUrl;
      App.showToast('💻 Opening Desktop Outlook...');
    } else {
      window.open(urls.webUrl, '_blank');
      App.showToast('📧 Opening Outlook Web compose window...');
    }
  },

  copySlack() {
    const reportBox = document.getElementById('p360CompiledReport');
    const raw = reportBox ? reportBox.value : this.state.compiledReport;
    if (!raw) return;

    const subject = window.P360Engine.formatSubject(this.state.reportDate);
    const slackText = `*${subject}*\n\n${raw}`;

    navigator.clipboard.writeText(slackText).then(() => {
      App.showToast('📋 Copied formatted report for Slack / Teams!');
    }).catch(() => {
      App.showToast('⚠️ Could not copy to clipboard.');
    });
  },

  copyPlainText() {
    const reportBox = document.getElementById('p360CompiledReport');
    const raw = reportBox ? reportBox.value : this.state.compiledReport;
    if (!raw) return;

    navigator.clipboard.writeText(raw).then(() => {
      App.showToast('📄 Copied plain text report!');
    }).catch(() => {
      App.showToast('⚠️ Could not copy to clipboard.');
    });
  },

  // ── Shift History & Persistence ──
  saveShiftState() {
    try {
      const data = {
        isClockedIn: this.state.isClockedIn,
        startTime: this.state.startTime,
        endTime: this.state.endTime,
        elapsedSeconds: this.state.elapsedSeconds
      };
      localStorage.setItem('p360_shift_state', JSON.stringify(data));
    } catch (_) {}
  },

  loadShiftState() {
    try {
      const raw = localStorage.getItem('p360_shift_state');
      if (raw) {
        const data = JSON.parse(raw);
        this.state.isClockedIn = !!data.isClockedIn;
        this.state.startTime = data.startTime || null;
        this.state.endTime = data.endTime || null;
        this.state.elapsedSeconds = data.elapsedSeconds || 0;

        if (this.state.isClockedIn && this.state.startTime) {
          this.state.elapsedSeconds = Math.floor((Date.now() - this.state.startTime) / 1000);
          this.startTimerInterval();
        }
        this.updateTimerUI();
      }
    } catch (_) {}
  },

  saveDraft() {
    try {
      const draft = {
        reportDate: this.state.reportDate,
        checkedIds: Array.from(this.state.checkedTaskIds),
        taskDetails: this.state.taskDetails,
        customNotes: this.state.customNotes,
        plansNotes: this.state.plansNotes,
        compiledReport: this.state.compiledReport
      };
      localStorage.setItem('p360_draft', JSON.stringify(draft));
    } catch (_) {}
  },

  loadDraft() {
    try {
      const raw = localStorage.getItem('p360_draft');
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.reportDate) this.state.reportDate = draft.reportDate;
        if (Array.isArray(draft.checkedIds)) {
          this.state.checkedTaskIds = new Set(draft.checkedIds);
        }
        if (draft.taskDetails) this.state.taskDetails = draft.taskDetails;
        if (draft.customNotes) {
          this.state.customNotes = draft.customNotes;
          const el = document.getElementById('p360CustomNotes');
          if (el) el.value = draft.customNotes;
        }
        if (draft.plansNotes) {
          this.state.plansNotes = draft.plansNotes;
          const el = document.getElementById('p360PlansNotes');
          if (el) el.value = draft.plansNotes;
        }
        if (draft.compiledReport) {
          this.state.compiledReport = draft.compiledReport;
          const el = document.getElementById('p360CompiledReport');
          if (el) el.value = draft.compiledReport;
        }
      }
    } catch (_) {}
  },

  saveToHistory() {
    const reportBox = document.getElementById('p360CompiledReport');
    const text = reportBox ? reportBox.value : this.state.compiledReport;
    if (!text || !text.trim()) {
      App.showToast('⚠️ Compile a report first before saving.');
      return;
    }

    const secs = this.state.elapsedSeconds || 0;
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const durationStr = `${h}h ${m}m`;

    const startStr = this.state.startTime ? new Date(this.state.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const endStr = this.state.endTime ? new Date(this.state.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const entry = {
      id: 'p360-' + Date.now(),
      date: this.state.reportDate,
      shiftHours: `${startStr} – ${endStr}`,
      duration: durationStr,
      taskCount: this.state.checkedTaskIds.size,
      subject: window.P360Engine.formatSubject(this.state.reportDate),
      reportText: text,
      savedAt: new Date().toISOString()
    };

    this.state.history.unshift(entry);
    if (this.state.history.length > 50) this.state.history.pop();

    try {
      localStorage.setItem('p360_history', JSON.stringify(this.state.history));
    } catch (_) {}

    this.renderHistory();
    App.showToast('💾 Daily task report saved to history archive!');
  },

  loadHistory() {
    try {
      const raw = localStorage.getItem('p360_history');
      if (raw) {
        this.state.history = JSON.parse(raw);
      }
    } catch (_) {}
    this.renderHistory();
  },

  renderHistory() {
    const tbody = document.getElementById('p360HistoryTableBody');
    const countBadge = document.getElementById('p360HistoryCountBadge');
    if (!tbody) return;

    if (countBadge) {
      countBadge.textContent = `${this.state.history.length} report${this.state.history.length === 1 ? '' : 's'}`;
    }

    if (this.state.history.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="py-6 text-center text-slate-400 dark:text-slate-500">
            No saved shift reports yet. Reports saved with [Save to Shift History] will appear here.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    this.state.history.forEach(item => {
      html += `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
          <td class="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">${App.escapeHTML(item.date)}</td>
          <td class="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">${App.escapeHTML(item.shiftHours)}</td>
          <td class="py-2.5 px-3 font-mono text-blue-600 dark:text-blue-400">${App.escapeHTML(item.duration)}</td>
          <td class="py-2.5 px-3">${item.taskCount} tasks</td>
          <td class="py-2.5 px-3 text-right">
            <div class="inline-flex items-center gap-1">
              <button onclick="P360.loadHistoryItem('${item.id}')" class="px-2 py-1 text-[10px] font-semibold rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors" title="Load into preview editor">
                👁️ View
              </button>
              <button onclick="P360.copyHistoryItem('${item.id}')" class="px-2 py-1 text-[10px] font-semibold rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors" title="Copy report text">
                📋
              </button>
              <button onclick="P360.deleteHistoryItem('${item.id}')" class="px-1.5 py-1 text-[10px] rounded hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 transition-colors" title="Delete from history">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  },

  loadHistoryItem(id) {
    const item = this.state.history.find(h => h.id === id);
    if (!item) return;

    this.state.reportDate = item.date;
    this.state.compiledReport = item.reportText;

    const dateInput = document.getElementById('p360ReportDate');
    if (dateInput) dateInput.value = item.date;

    const reportBox = document.getElementById('p360CompiledReport');
    if (reportBox) reportBox.value = item.reportText;

    this.updateSubjectPreview();
    App.showToast(`👁️ Loaded report for ${item.date} into preview editor.`);
  },

  copyHistoryItem(id) {
    const item = this.state.history.find(h => h.id === id);
    if (!item) return;
    navigator.clipboard.writeText(item.reportText).then(() => {
      App.showToast(`📋 Copied report for ${item.date}!`);
    });
  },

  deleteHistoryItem(id) {
    if (!confirm('Remove this saved report from history?')) return;
    this.state.history = this.state.history.filter(h => h.id !== id);
    try {
      localStorage.setItem('p360_history', JSON.stringify(this.state.history));
    } catch (_) {}
    this.renderHistory();
    App.showToast('🗑️ Report removed from history.');
  }
};

window.P360 = P360;

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
