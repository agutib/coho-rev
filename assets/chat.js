/**
 * COHO OpsHub — Built-in AI Chat Assistant
 * Floating chatbox powered by Gemini 2.0 Flash
 */

const Chat = (() => {
  let isOpen = false;
  let history = []; // { role: "user"|"model", text: string }
  let isStreaming = false;

  // ── Init ────────────────────────────────────────────
  function init() {
    injectHTML();
    bindEvents();
  }

  // ── Inject chat HTML into page ───────────────────────
  function injectHTML() {
    const html = `
      <!-- Chat Bubble Trigger -->
      <button id="chatBubble" onclick="Chat.toggle()" title="Ask COHO Assistant"
        class="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
        <span id="chatBubbleIcon" class="text-2xl leading-none">💬</span>
        <span id="chatUnread" class="hidden absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">1</span>
      </button>

      <!-- Chat Panel -->
      <div id="chatPanel"
        class="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right"
        style="display:none; max-height: 560px;">

        <!-- Header -->
        <div class="bg-emerald-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold text-white">C</div>
            <div>
              <p class="text-sm font-semibold text-white leading-none">COHO Assistant</p>
              <p class="text-[11px] text-emerald-100 mt-0.5">UK HMO Property Expert</p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button onclick="Chat.clearHistory()" title="Clear chat" class="p-1.5 rounded-lg text-emerald-100 hover:bg-white/10 transition-colors text-xs">🗑️</button>
            <button onclick="Chat.toggle()" title="Close" class="p-1.5 rounded-lg text-emerald-100 hover:bg-white/10 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <!-- Messages -->
        <div id="chatMessages" class="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50" style="min-height:200px;">
          <div class="flex gap-2">
            <div class="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">C</div>
            <div class="bg-white rounded-xl rounded-tl-sm px-3 py-2.5 text-sm text-slate-700 shadow-xs border border-slate-100 max-w-[85%]">
              Hi Rev! 👋 I''m your COHO property assistant. Ask me anything — arrears, compliance, tenant messages, reconciliation, HMO rules, or anything else about the properties.
            </div>
          </div>
        </div>

        <!-- Input -->
        <div class="border-t border-slate-200 p-3 bg-white flex-shrink-0">
          <div class="flex gap-2">
            <textarea id="chatInput" rows="1" placeholder="Ask about rent, arrears, compliance..."
              class="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
              style="min-height:38px; max-height:120px; overflow-y:auto;"
              onkeydown="Chat.handleKey(event)" oninput="Chat.autoResize(this)"></textarea>
            <button id="chatSendBtn" onclick="Chat.send()"
              class="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
            </button>
          </div>
          <p class="text-[10px] text-slate-400 mt-1.5 text-center">Powered by Gemini · For property admin assistance only</p>
        </div>
      </div>
    `;

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
  }

  // ── Toggle panel open/closed ──────────────────────────
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

  // ── Send message ──────────────────────────────────────
  async function send() {
    if (isStreaming) return;
    const input = document.getElementById("chatInput");
    const message = input.value.trim();
    if (!message) return;

    input.value = "";
    autoResize(input);
    isStreaming = true;
    setSendBtn(false);

    // Append user bubble
    appendMessage("user", message);
    history.push({ role: "user", text: message });

    // Append empty model bubble for streaming
    const modelBubble = appendMessage("model", "");
    let fullText = "";

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

      // Stream SSE chunks
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullText += parsed.text;
              setMessageText(modelBubble, fullText);
            }
            if (parsed.error) {
              setMessageText(modelBubble, "⚠️ " + parsed.error);
            }
          } catch (_) {}
        }
      }

      history.push({ role: "model", text: fullText });

      // Show unread indicator if chat is closed
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

  // ── Clear conversation ────────────────────────────────
  function clearHistory() {
    history = [];
    const messages = document.getElementById("chatMessages");
    messages.innerHTML = `
      <div class="flex gap-2">
        <div class="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">C</div>
        <div class="bg-white rounded-xl rounded-tl-sm px-3 py-2.5 text-sm text-slate-700 shadow-xs border border-slate-100 max-w-[85%]">
          Chat cleared! How can I help you with the properties today?
        </div>
      </div>`;
  }

  // ── Helpers ───────────────────────────────────────────
  function appendMessage(role, text) {
    const messages = document.getElementById("chatMessages");
    const isUser = role === "user";

    const wrapper = document.createElement("div");
    wrapper.className = "flex gap-2" + (isUser ? " justify-end" : "");

    const avatar = isUser ? "" : `<div class="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">C</div>`;

    const bubble = document.createElement("div");
    bubble.className = isUser
      ? "bg-emerald-600 text-white rounded-xl rounded-tr-sm px-3 py-2.5 text-sm max-w-[85%] whitespace-pre-wrap"
      : "bg-white rounded-xl rounded-tl-sm px-3 py-2.5 text-sm text-slate-700 shadow-xs border border-slate-100 max-w-[85%] whitespace-pre-wrap";

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
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  function bindEvents() {
    // Keyboard shortcut: Ctrl+/ to open chat
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        toggle();
      }
    });
  }

  return { init, toggle, send, clearHistory, handleKey, autoResize };
})();

// Auto-initialise when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", Chat.init);
} else {
  Chat.init();
}
