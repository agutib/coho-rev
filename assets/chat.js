/**
 * COHO OpsHub — Full Antigravity-Style AI Copilot Engine
 * Powered by Gemini 3.6 Flash + 6 Finance Specialists + Drag-and-Drop Ingestion + Live OpsHub Sync
 */

const Chat = (() => {
  let history = []; // { role: "user"|"model", text: string }
  let isStreaming = false;
  let activeSpecialist = "all";
  let isWorkspaceGuideOpen = false;
  let stagedFileInfo = null; // { name: string, type: string, count: number, summary: string }

  const SPECIALIST_CONFIGS = {
    all: { name: "All-Round Operations", prefix: "" },
    controller: { name: "Bookkeeper & Controller", prefix: "[Consulting as Bookkeeper & Controller Specialist]: " },
    ap: { name: "Accounts Payable Specialist", prefix: "[Consulting as Accounts Payable Specialist]: " },
    analyst: { name: "Financial Analyst (Yield & Void)", prefix: "[Consulting as Financial Analyst]: " },
    fpa: { name: "FP&A Cash Flow Analyst", prefix: "[Consulting as FP&A Analyst]: " },
    tax: { name: "Property Tax Strategist", prefix: "[Consulting as Property Tax Strategist]: " },
    cfo: { name: "CFO & Capex Planner", prefix: "[Consulting as Chief Financial Officer]: " }
  };

  function init() {
    renderWorkspaceWelcome();
    bindWorkspaceEvents();
  }

  // ── Drag & Drop File Intake directly in AI Copilot Workspace ───
  function bindWorkspaceEvents() {
    const workspace = document.getElementById("copilot-workspace");
    const dropOverlay = document.getElementById("copilot-drop-overlay");
    const fileInput = document.getElementById("copilot-file-input");

    if (workspace && dropOverlay) {
      let dragCounter = 0;

      workspace.addEventListener("dragenter", (e) => {
        e.preventDefault();
        dragCounter++;
        dropOverlay.classList.remove("hidden");
      });

      workspace.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      workspace.addEventListener("dragleave", (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter <= 0) {
          dragCounter = 0;
          dropOverlay.classList.add("hidden");
        }
      });

      workspace.addEventListener("drop", (e) => {
        e.preventDefault();
        dragCounter = 0;
        dropOverlay.classList.add("hidden");
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleChatFileUpload(e.dataTransfer.files[0]);
        }
      });
    }

    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleChatFileUpload(e.target.files[0]);
          e.target.value = "";
        }
      });
    }

    // Keyboard shortcut Ctrl+/ to switch to AI Copilot
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        App.switchTab("ai-copilot");
        focusWorkspace();
      }
    });
  }

  // Handle file dropped or attached in the Chat Workspace
  function handleChatFileUpload(file) {
    const reader = new FileReader();
    const fileName = file.name;
    const lowerName = fileName.toLowerCase();

    reader.onload = (e) => {
      const content = e.target.result;
      let rawRecords = [];

      try {
        if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
          if (typeof XLSX !== "undefined") {
            const workbook = XLSX.read(content, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            rawRecords = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
          } else {
            alert("SheetJS library not ready. Please use CSV format.");
            return;
          }
        } else {
          rawRecords = Parser.parseCSV(content);
        }

        if (!rawRecords || rawRecords.length === 0) {
          alert("No readable data rows found in this file.");
          return;
        }

        const detectedType = Parser.detectFileType(rawRecords);
        let count = 0;
        let typeLabel = "";

        if (detectedType === "rent_roll") {
          const normalized = Parser.normalizeRentRoll(rawRecords);
          App.state.rentRoll = normalized;
          count = normalized.length;
          typeLabel = "COHO Rent Roll";
        } else if (detectedType === "bank_statement") {
          const normalized = Parser.normalizeBankStatement(rawRecords);
          App.state.bankTxns = normalized;
          count = normalized.length;
          typeLabel = "Bank Statement Transactions";
        } else if (detectedType === "compliance") {
          const normalized = Parser.normalizeCompliance(rawRecords);
          App.state.compliance = normalized;
          count = normalized.length;
          typeLabel = "Compliance Register";
        } else {
          // Default to rent roll or bank
          const normalized = Parser.normalizeBankStatement(rawRecords);
          App.state.bankTxns = normalized;
          count = normalized.length;
          typeLabel = "Bank Transactions";
        }

        // Live sync into OpsHub state
        App.saveToStorage();
        App.runReconciliation();
        App.render();

        stagedFileInfo = {
          name: fileName,
          type: typeLabel,
          count: count,
          summary: `${count} ${typeLabel} records synced into OpsHub`
        };

        // Show Staged / Loaded Bar
        showLoadedFileBar(fileName, stagedFileInfo.summary);

        // Append system event badge into Chat Feed
        appendEventNotice(`📁 <strong>${fileName}</strong> (${count} records) loaded into OpsHub! Dashboard metrics, reconciler tables, and arrears calculations updated live.`);
        App.showToast(`✓ Loaded ${count} records from ${fileName} into OpsHub!`);

      } catch (err) {
        console.error("Chat file ingestion error:", err);
        alert("Error parsing file: " + err.message);
      }
    };

    if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  }

  function showLoadedFileBar(fileName, summary) {
    const bar = document.getElementById("copilot-loaded-file-bar");
    const nameEl = document.getElementById("copilot-loaded-file-name");
    const sumEl = document.getElementById("copilot-loaded-file-summary");
    if (bar && nameEl && sumEl) {
      nameEl.textContent = fileName;
      sumEl.textContent = `— ${summary}`;
      bar.classList.remove("hidden");
    }
  }

  function dismissLoadedFileBar() {
    const bar = document.getElementById("copilot-loaded-file-bar");
    if (bar) bar.classList.add("hidden");
  }

  function askAboutLoadedFile() {
    if (!stagedFileInfo) return;
    const prompt = `I've loaded ${stagedFileInfo.name} containing ${stagedFileInfo.count} ${stagedFileInfo.type} into OpsHub. Please perform a full 3-way financial audit: identify any missing rents, partial shortfalls, and unallocated credits, and suggest immediate action items.`;
    usePrompt(prompt);
    sendWorkspace();
  }

  // ── Specialist Selection ─────────────────────────────────────
  function selectSpecialist(roleKey) {
    activeSpecialist = roleKey;
    document.querySelectorAll(".specialist-chip").forEach(chip => {
      const spec = chip.getAttribute("data-spec");
      if (spec === roleKey) {
        chip.className = "specialist-chip px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white shadow-2xs whitespace-nowrap transition-colors";
      } else {
        chip.className = "specialist-chip px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 whitespace-nowrap transition-colors";
      }
    });

    const specInfo = SPECIALIST_CONFIGS[roleKey];
    App.showToast(`Switched consultation focus to: ${specInfo ? specInfo.name : roleKey}`);
  }

  // ── User & Learning Guide Controls ───────────────────────────
  function toggleGuideInWorkspace() {
    const guide = document.getElementById("copilot-guide-view");
    if (!guide) return;
    isWorkspaceGuideOpen = !isWorkspaceGuideOpen;
    if (isWorkspaceGuideOpen) {
      guide.classList.remove("hidden");
    } else {
      guide.classList.add("hidden");
    }
  }

  function openGuideInWorkspace() {
    const guide = document.getElementById("copilot-guide-view");
    if (guide && guide.classList.contains("hidden")) {
      guide.classList.remove("hidden");
      isWorkspaceGuideOpen = true;
    }
  }

  function focusWorkspace() {
    setTimeout(() => {
      const input = document.getElementById("copilot-input");
      if (input) input.focus();
    }, 50);
  }

  function usePrompt(text) {
    const input = document.getElementById("copilot-input");
    if (input) {
      input.value = text;
      input.focus();
      autoResize(input);
    }
  }

  // ── Workspace Rendering & Welcome View ───────────────────────
  function renderWorkspaceWelcome() {
    const container = document.getElementById("copilot-messages");
    if (!container) return;

    if (history.length > 0) {
      renderAllHistory();
      return;
    }

    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-8 px-4 text-center max-w-2xl mx-auto space-y-6">
        <div class="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-emerald-500/20 animate-in fade-in zoom-in duration-200">
          ⚡
        </div>
        
        <div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">COHO Antigravity Copilot</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md leading-relaxed">
            Your high-speed UK HMO operations & financial intelligence cockpit. Drag & drop files directly here to update OpsHub and get instant financial analysis.
          </p>
        </div>

        <!-- Interactive Drag-and-Drop Ingestion Card -->
        <div onclick="document.getElementById('copilot-file-input').click()" class="w-full border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 dark:border-emerald-700/60 dark:hover:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-2xl p-5 cursor-pointer transition-all shadow-3xs group">
          <div class="flex items-center justify-center gap-3">
            <span class="text-2xl group-hover:scale-110 transition-transform">📂</span>
            <div class="text-left">
              <div class="text-xs font-bold text-emerald-800 dark:text-emerald-300">Drop Bank CSV or COHO Rent Roll here</div>
              <div class="text-[11px] text-emerald-600 dark:text-emerald-400">Automatically synchronizes into OpsHub Reconciler & stages for Gemini analysis</div>
            </div>
          </div>
        </div>

        <!-- 4 Quick Starter Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
          <button onclick="Chat.usePrompt('Audit all active tenancies against bank credits and flag missing or partial rents.')" class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-xs transition-all">
            <div class="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>⚖️</span> Audit Live Reconciliation
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Review active rent roll against bank credits and identify arrears.</p>
          </button>

          <button onclick="Chat.usePrompt('Audit this plumber quote: £350 to replace a kitchen mixer tap at 14 Oak St. Is it reasonable?')" class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-xs transition-all">
            <div class="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>💳</span> AP Invoice & Quote Audit
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Audit contractor quotes, repairs vs capital improvements, and trade rates.</p>
          </button>

          <button onclick="Chat.usePrompt('Analyze void loss and gross monthly yield for all active HMO properties.')" class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-xs transition-all">
            <div class="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>📊</span> Yield & Void Analysis
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Calculate room yields, RevPAM, and revenue lost to vacant periods.</p>
          </button>

          <button onclick="Chat.usePrompt('Remember this rule: ')" class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-xs transition-all">
            <div class="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <span>🧠</span> Teach a New Rule
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Start with "Remember this rule:" to persist rules permanently in GitHub.</p>
          </button>
        </div>
      </div>
    `;
  }

  function renderAllHistory() {
    const container = document.getElementById("copilot-messages");
    if (!container) return;
    container.innerHTML = "";
    for (const turn of history) {
      appendMessageToWorkspace(turn.role, turn.text);
    }
    scrollWorkspaceToBottom();
  }

  // ── Send Message from Workspace ──────────────────────────────
  async function sendWorkspace() {
    if (isStreaming) return;

    const input = document.getElementById("copilot-input");
    const rawMessage = input ? input.value.trim() : "";
    if (!rawMessage) return;

    input.value = "";
    autoResize(input);
    isStreaming = true;
    setWorkspaceSendBtn(false);

    // If a specific specialist is chosen, prepend consultation tag
    const specInfo = SPECIALIST_CONFIGS[activeSpecialist];
    const fullMessage = (specInfo && specInfo.prefix ? specInfo.prefix : "") + rawMessage;

    // Add Live OpsHub Context snippet so Gemini has actual numbers
    const contextSnippet = buildLiveOpsHubContext();
    const messageWithContext = contextSnippet ? `${contextSnippet}\n\n${fullMessage}` : fullMessage;

    appendMessageToWorkspace("user", rawMessage);
    history.push({ role: "user", text: rawMessage });

    const modelBubble = appendMessageToWorkspace("model", "");
    let rawResponse = "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageWithContext,
          history: history.slice(0, -1)
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        setWorkspaceMessageText(modelBubble, "⚠️ " + (err.error || "Server error. Please try again."));
        isStreaming = false;
        setWorkspaceSendBtn(true);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              rawResponse += parsed.text;
              const cleanedText = rawResponse
                .replace(/\[\[LEARNED_RULE:[\s\S]*?\]\]/g, "")
                .replace(/\[\[APP_FEEDBACK:[\s\S]*?\]\]/g, "")
                .trim();
              setWorkspaceMessageText(modelBubble, cleanedText);
            }
            if (parsed.event === "rule_saved") {
              appendEventNotice("🧠 Rule committed to COHO Skill & pushed to GitHub repo!");
            }
            if (parsed.event === "feedback_saved") {
              appendEventNotice("📋 App feedback recorded in USER_FEEDBACK_LOG.md for dev team!");
            }
            if (parsed.error) {
              setWorkspaceMessageText(modelBubble, "⚠️ " + parsed.error);
            }
          } catch (_) {}
        }
      }

      const finalCleaned = rawResponse
        .replace(/\[\[LEARNED_RULE:[\s\S]*?\]\]/g, "")
        .replace(/\[\[APP_FEEDBACK:[\s\S]*?\]\]/g, "")
        .trim();
      history.push({ role: "model", text: finalCleaned });

    } catch (err) {
      setWorkspaceMessageText(modelBubble, "⚠️ Connection error. Please check your network and try again.");
    }

    isStreaming = false;
    setWorkspaceSendBtn(true);
    if (input) input.focus();
  }

  // Build condensed context of active OpsHub state
  function buildLiveOpsHubContext() {
    try {
      if (!App.state) return "";
      const recon = App.state.reconciliation;
      const totalExpected = recon ? recon.summary.totalExpected : 0;
      const totalReceived = recon ? recon.summary.totalReceived : 0;
      const totalArrears = recon ? recon.summary.totalArrears : 0;
      const totalUnits = App.state.rentRoll ? App.state.rentRoll.length : 0;
      const totalBankTxns = App.state.bankTxns ? App.state.bankTxns.length : 0;
      const unallocCount = recon && recon.unallocatedTxns ? recon.unallocatedTxns.length : 0;

      return `[SYSTEM CONTEXT - Active OpsHub Data: ${totalUnits} tenancies loaded, ${totalBankTxns} bank transactions. Total Expected Rent: £${totalExpected.toFixed(2)}, Collected: £${totalReceived.toFixed(2)}, Arrears Shortfall: £${totalArrears.toFixed(2)}. Unallocated Bank Credits in Suspense: ${unallocCount}]`;
    } catch (_) {
      return "";
    }
  }

  // ── Message Bubbles & Markdown Formatting ────────────────────
  function appendMessageToWorkspace(role, text) {
    const container = document.getElementById("copilot-messages");
    if (!container) return null;

    const isUser = role === "user";
    const row = document.createElement("div");
    row.className = "flex gap-3 " + (isUser ? "justify-end" : "justify-start");

    const avatar = isUser
      ? ""
      : `<div class="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5 shadow-2xs">C</div>`;

    const bubbleContainer = document.createElement("div");
    bubbleContainer.className = "max-w-[85%] space-y-1.5";

    const bubble = document.createElement("div");
    bubble.className = isUser
      ? "bg-emerald-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-xs leading-relaxed shadow-xs"
      : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 text-xs leading-relaxed border border-slate-200 dark:border-slate-700 shadow-2xs";

    if (text) {
      bubble.innerHTML = isUser ? escapeHTML(text).replace(/\n/g, "<br>") : formatMarkdown(text);
    } else {
      bubble.innerHTML = `<span class="inline-block animate-pulse">▌</span>`;
    }

    bubbleContainer.appendChild(bubble);

    // Add Copy Action Button for assistant messages
    if (!isUser && text) {
      const actions = document.createElement("div");
      actions.className = "flex items-center gap-2 text-[10px] text-slate-400 pl-1";
      actions.innerHTML = `
        <button onclick="navigator.clipboard.writeText(this.getAttribute('data-txt')).then(()=>App.showToast('Copied message text!'))" data-txt="${escapeHTML(text)}" class="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1">
          <span>📋</span> Copy
        </button>
      `;
      bubbleContainer.appendChild(actions);
    }

    row.innerHTML = avatar;
    row.appendChild(bubbleContainer);
    container.appendChild(row);
    scrollWorkspaceToBottom();
    return bubble;
  }

  function setWorkspaceMessageText(bubble, text) {
    if (!bubble) return;
    bubble.innerHTML = formatMarkdown(text) || `<span class="inline-block animate-pulse">▌</span>`;
    scrollWorkspaceToBottom();
  }

  function appendEventNotice(htmlContent) {
    const container = document.getElementById("copilot-messages");
    if (!container) return;

    const notice = document.createElement("div");
    notice.className = "flex justify-center my-2";
    notice.innerHTML = `<div class="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs shadow-3xs flex items-center gap-2">${htmlContent}</div>`;
    container.appendChild(notice);
    scrollWorkspaceToBottom();
  }

  function scrollWorkspaceToBottom() {
    const container = document.getElementById("copilot-messages");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  function setWorkspaceSendBtn(enabled) {
    const btn = document.getElementById("copilot-send-btn");
    if (btn) btn.disabled = !enabled;
  }

  function handleWorkspaceKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendWorkspace();
    }
  }

  function clearHistory() {
    if (confirm("Clear AI Copilot chat history?")) {
      history = [];
      stagedFileInfo = null;
      dismissLoadedFileBar();
      renderWorkspaceWelcome();
      App.showToast("Chat history cleared.");
    }
  }

  function autoResize(el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }

  // ── Lightweight Markdown Formatter ───────────────────────────
  function formatMarkdown(text) {
    if (!text) return "";
    
    // 1. Escape HTML
    let out = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // 2. Preformatted Code Blocks ```code```
    out = out.replace(/```([\s\S]*?)```/g, (match, code) => {
      return `<pre class="bg-slate-900 text-emerald-400 p-3 rounded-xl my-2.5 text-[11px] font-mono overflow-x-auto border border-slate-700 leading-relaxed">${code.trim()}</pre>`;
    });

    // 3. Inline Code `code`
    out = out.replace(/`([^`]+)`/g, '<code class="bg-slate-100 dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-mono text-[11px]">$1</code>');

    // 4. Markdown Tables
    out = out.replace(/(?:(?:^|\n)\|[^\n]+\|(?:[^\n]+\|)+)+/g, (tableMatch) => {
      const rows = tableMatch.trim().split("\n");
      if (rows.length < 2) return tableMatch;

      let tableHtml = '<div class="overflow-x-auto my-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs"><table class="w-full text-left text-xs border-collapse">';
      let isHeader = true;

      for (const row of rows) {
        if (/^\|[\s\-:|]+\|$/.test(row.trim())) {
          isHeader = false;
          continue;
        }
        const cells = row.split("|").slice(1, -1);
        if (isHeader) {
          tableHtml += '<thead class="bg-slate-100 dark:bg-slate-700/80 font-bold text-slate-700 dark:text-slate-200 uppercase text-[10px]"><tr>';
          cells.forEach(c => {
            tableHtml += `<th class="py-2 px-3 border-b border-slate-200 dark:border-slate-700">${c.trim()}</th>`;
          });
          tableHtml += "</tr></thead><tbody>";
        } else {
          tableHtml += '<tr class="border-b border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800/40">';
          cells.forEach(c => {
            tableHtml += `<td class="py-2 px-3 text-slate-800 dark:text-slate-200">${c.trim()}</td>`;
          });
          tableHtml += "</tr>";
        }
      }
      tableHtml += "</tbody></table></div>";
      return tableHtml;
    });

    // 5. Bold **text**
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    // 6. Italic *text*
    out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    // 7. Bullet Lists (• or -)
    out = out.replace(/(?:^|\n)(?:•|-|\*)\s+([^\n]+)/g, '<div class="flex items-start gap-1.5 my-1"><span class="text-emerald-500 font-bold">•</span><span>$1</span></div>');

    // 8. Line breaks
    out = out.replace(/\n\n+/g, '<div class="h-2"></div>');
    out = out.replace(/\n/g, "<br>");

    return out;
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  return {
    init,
    sendWorkspace,
    handleWorkspaceKey,
    selectSpecialist,
    toggleGuideInWorkspace,
    openGuideInWorkspace,
    focusWorkspace,
    usePrompt,
    clearHistory,
    autoResize,
    askAboutLoadedFile,
    dismissLoadedFileBar
  };
})();

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", Chat.init);
} else {
  Chat.init();
}
