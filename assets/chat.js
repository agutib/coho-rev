/**
 * COHO OpsHub — Built-in AI Chat Assistant
 * Powered by Gemini 3.6 Flash + 6 Finance Specialists + Continuous Learning Engine
 */

const Chat = (() => {
  let isOpen = false;
  let history = []; // { role: "user"|"model", text: string }
  let isStreaming = false;

  function init() {
    injectHTML();
    bindEvents();
  }

  function injectHTML() {
    const html = `
      <!-- Floating Chat Bubble -->
      <button id="chatBubble" onclick="Chat.toggle()" title="Ask COHO Operations & Finance Assistant (Ctrl+/)"
        class="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
        <span id="chatBubbleIcon" class="text-2xl leading-none">💬</span>
        <span id="chatUnread" class="hidden absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">1</span>
      </button>

      <!-- Chat Panel -->
      <div id="chatPanel"
        class="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right"
        style="display:none; height: 580px; max-height: calc(100vh - 8rem);">

        <!-- Header -->
        <div class="bg-emerald-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold text-white shadow-xs">C</div>
            <div>
              <div class="flex items-center gap-1.5">
                <p class="text-sm font-bold text-white leading-none">COHO Assistant</p>
                <span class="text-[9px] bg-emerald-700 text-emerald-100 px-1.5 py-0.5 rounded font-medium">Finance Suite</span>
              </div>
              <p class="text-[11px] text-emerald-100 mt-0.5">UK HMO Operations & Financial Controller</p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button onclick="Chat.clearHistory()" title="Clear conversation" class="p-1.5 rounded-lg text-emerald-100 hover:bg-white/10 transition-colors text-xs">🗑️</button>
            <button onclick="Chat.toggle()" title="Close" class="p-1.5 rounded-lg text-emerald-100 hover:bg-white/10 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <!-- Quick Finance & Learning Chips -->
        <div class="px-3 py-2 bg-slate-100/90 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto text-[11px] flex-shrink-0 no-scrollbar">
          <button onclick="Chat.usePrompt('Analyze room yield and void costs for ')" class="px-2 py-0.5 rounded-full bg-white text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 whitespace-nowrap shadow-3xs transition-colors">📊 Yield</button>
          <button onclick="Chat.usePrompt('Audit this contractor repair quote like an AP Specialist: ')" class="px-2 py-0.5 rounded-full bg-white text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 whitespace-nowrap shadow-3xs transition-colors">🧾 Audit Invoice</button>
          <button onclick="Chat.usePrompt('Guide me through month-end bank reconciliation close for ')" class="px-2 py-0.5 rounded-full bg-white text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 whitespace-nowrap shadow-3xs transition-colors">📒 Month-End</button>
          <button onclick="Chat.usePrompt('Remember this rule: ')" class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 whitespace-nowrap shadow-3xs font-medium transition-colors">🧠 Teach Rule</button>
        </div>

        <!-- Messages Area -->
        <div id="chatMessages" class="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          <div class="flex gap-2">
            <div class="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">C</div>
            <div class="bg-white rounded-xl rounded-tl-sm px-3.5 py-2.5 text-sm text-slate-700 shadow-xs border border-slate-100 max-w-[85%] leading-relaxed">
              Hi Rev! 👋 I''m your COHO Operations & Finance Assistant.
              <div class="mt-2 text-xs text-slate-500 space-y-1">
                <p>• <strong>Finance Suite</strong>: Controller, AP, Yield & FP&A analysis, UK Property Tax.</p>
                <p>• <strong>Continuous Learning</strong>: Tell me <em>"Remember this rule: ..."</em> to update our skill.</p>
                <p>• <strong>Feedback</strong>: Complain or suggest changes anytime — I'll log it for Arnold!</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="border-t border-slate-200 p-3 bg-white flex-shrink-0">
          <div class="flex gap-2">
            <textarea id="chatInput" rows="1" placeholder="Ask about rent, arrears, invoices, or teach a rule..."
              class="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
              style="min-height:38px; max-height:100px; overflow-y:auto;"
              onkeydown="Chat.handleKey(event)" oninput="Chat.autoResize(this)"></textarea>
            <button id="chatSendBtn" onclick="Chat.send()"
              class="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
            </button>
          </div>
          <p class="text-[10px] text-slate-400 mt-1.5 text-center">COHO OpsHub · Press Enter to send · Shift+Enter for newline</p>
        </div>
      </div>
    `;

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
  }

  function toggle() {
    const panel = document.getElementById("chatPanel");
    const icon = document.getElementById("chatBubbleIcon");
    const unread = document.getElementById("chatUnread");

    isOpen = !isOpen;
    panel.style.display = isOpen ? "flex" : "none";
    icon.textContent = isOpen ? "✕" : "💬";
    unread.classList.add("hidden");

    if (isOpen) {
      setTimeout(() => {
        const input = document.getElementById("chatInput");
        if (input) input.focus();
        scrollToBottom();
      }, 50);
    }
  }

  function usePrompt(text) {
    const input = document.getElementById("chatInput");
    if (input) {
      input.value = text;
      input.focus();
      autoResize(input);
    }
  }

  async function send() {
    if (isStreaming) return;
    const input = document.getElementById("chatInput");
    const message = input.value.trim();
    if (!message) return;

    input.value = "";
    autoResize(input);
    isStreaming = true;
    setSendBtn(false);

    appendMessage("user", message);
    history.push({ role: "user", text: message });

    const modelBubble = appendMessage("model", "");
    let rawResponse = "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: history.slice(0, -1) }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        setMessageText(modelBubble, "⚠️ " + (err.error || "Something went wrong. Please try again."));
        isStreaming = false;
        setSendBtn(true);
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
              // Clean any system tags from display
              const cleanedText = rawResponse
                .replace(/\[\[LEARNED_RULE:[\s\S]*?\]\]/g, "")
                .replace(/\[\[APP_FEEDBACK:[\s\S]*?\]\]/g, "")
                .trim();
              setMessageText(modelBubble, cleanedText);
            }
            if (parsed.event === "rule_saved") {
              appendBadge("🧠 Saved to COHO Skill & synced to GitHub!");
            }
            if (parsed.event === "feedback_saved") {
              appendBadge("📋 App feedback logged for Arnold & Dev Team");
            }
            if (parsed.error) {
              setMessageText(modelBubble, "⚠️ " + parsed.error);
            }
          } catch (_) {}
        }
      }

      const finalCleaned = rawResponse
        .replace(/\[\[LEARNED_RULE:[\s\S]*?\]\]/g, "")
        .replace(/\[\[APP_FEEDBACK:[\s\S]*?\]\]/g, "")
        .trim();
      history.push({ role: "model", text: finalCleaned });

      if (!isOpen) {
        document.getElementById("chatUnread").classList.remove("hidden");
      }

    } catch (err) {
      setMessageText(modelBubble, "⚠️ Connection error. Please check your internet and try again.");
    }

    isStreaming = false;
    setSendBtn(true);
    document.getElementById("chatInput").focus();
  }

  function appendBadge(text) {
    const messages = document.getElementById("chatMessages");
    const badge = document.createElement("div");
    badge.className = "flex justify-center my-1.5";
    badge.innerHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-3xs animate-fade-in">${text}</span>`;
    messages.appendChild(badge);
    scrollToBottom();
  }

  function clearHistory() {
    history = [];
    const messages = document.getElementById("chatMessages");
    messages.innerHTML = `
      <div class="flex gap-2">
        <div class="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">C</div>
        <div class="bg-white rounded-xl rounded-tl-sm px-3.5 py-2.5 text-sm text-slate-700 shadow-xs border border-slate-100 max-w-[85%]">
          Chat cleared! How can I help you with HMO operations or finance today?
        </div>
      </div>`;
  }

  function appendMessage(role, text) {
    const messages = document.getElementById("chatMessages");
    const isUser = role === "user";

    const wrapper = document.createElement("div");
    wrapper.className = "flex gap-2" + (isUser ? " justify-end" : "");

    const avatar = isUser ? "" : `<div class="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">C</div>`;

    const bubble = document.createElement("div");
    bubble.className = isUser
      ? "bg-emerald-600 text-white rounded-xl rounded-tr-sm px-3.5 py-2.5 text-sm max-w-[85%] whitespace-pre-wrap leading-relaxed"
      : "bg-white rounded-xl rounded-tl-sm px-3.5 py-2.5 text-sm text-slate-700 shadow-xs border border-slate-100 max-w-[85%] whitespace-pre-wrap leading-relaxed";

    bubble.textContent = text || (isUser ? "" : "▌");

    wrapper.innerHTML = avatar;
    wrapper.appendChild(bubble);
    messages.appendChild(wrapper);
    scrollToBottom();
    return bubble;
  }

  function setMessageText(bubble, text) {
    bubble.textContent = text || "▌";
    scrollToBottom();
  }

  function scrollToBottom() {
    const messages = document.getElementById("chatMessages");
    if (messages) messages.scrollTop = messages.scrollHeight;
  }

  function setSendBtn(enabled) {
    const btn = document.getElementById("chatSendBtn");
    if (btn) btn.disabled = !enabled;
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function autoResize(el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 100) + "px";
  }

  function bindEvents() {
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        toggle();
      }
    });
  }

  return { init, toggle, send, clearHistory, handleKey, autoResize, usePrompt };
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", Chat.init);
} else {
  Chat.init();
}
