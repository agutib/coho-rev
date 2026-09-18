/**
 * COHO OpsHub — AI Chat Backend
 * Secure proxy between the browser, Gemini API, and Continuous Learning Engine
 */

const path = require("path");
// Ensure .env is loaded regardless of process.cwd()
require("dotenv").config({ path: path.join(__dirname, ".env") });
if (!process.env.GEMINI_API_KEY) {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
}
if (!process.env.GEMINI_API_KEY) {
  require("dotenv").config();
}
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const { execFile } = require("child_process");
const { GoogleGenAI } = require("@google/genai");
const Anthropic = require("@anthropic-ai/sdk");
const { getCohoSystemPrompt } = require("./coho-system-prompt");

const app = express();
app.disable("x-powered-by"); // Remediates INFO-001

const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GITHUB_PAT = process.env.GITHUB_PAT;
const AUTH_TOKEN = process.env.COHO_AUTH_TOKEN || "c3f89002f28c39474375003faf4f51cccce5a77b515696194ba280c3b5ee4f10";
const PROJECT_ROOT = path.join(__dirname, "..");

if (!GEMINI_API_KEY && !ANTHROPIC_API_KEY) {
  console.error("FATAL: Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY is set in .env");
  process.exit(1);
}

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;
const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

// ── Middleware ─────────────────────────────────────────
app.use(express.json({ limit: "50kb" }));

app.use(cors({
  origin: ["https://rev.arnoldgutib.pro", "https://coho.arnoldgutib.pro", "http://localhost"],
  methods: ["POST", "GET"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment." },
});
app.use("/api/", limiter);

// ── Helper: Git Commit & Push (Safe execFile, remediates INJ-001) ──
function commitAndPush(filePath, commitMessage) {
  const relPath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, "/");
  const remote = GITHUB_PAT 
    ? `https://${GITHUB_PAT}@github.com/agutib/coho-rev.git` 
    : "origin";

  // Sanitize commit message to single line and bounded length
  const safeMessage = (commitMessage || "chore: update ops rule")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .substring(0, 150);

  console.log(`[Git Sync] Executing commit for ${relPath}...`);

  execFile("git", ["-C", PROJECT_ROOT, "add", relPath], (addErr) => {
    if (addErr) {
      console.warn(`[Git Sync Warning] Could not git add ${relPath}:`, addErr.message);
      return;
    }
    execFile("git", ["-C", PROJECT_ROOT, "commit", "-m", safeMessage], (commitErr) => {
      if (commitErr) {
        console.warn(`[Git Sync Warning] Could not git commit:`, commitErr.message);
        return;
      }
      execFile("git", ["-C", PROJECT_ROOT, "push", remote, "main"], (pushErr) => {
        if (pushErr) {
          console.warn(`[Git Sync Warning] Could not push to remote (PAT may need configuration):`, pushErr.message);
        } else {
          console.log(`[Git Sync Success] Pushed to GitHub: ${safeMessage}`);
        }
      });
    });
  });
}

// ── Helper: Save Learned Rule (Multi-Tenant Client Segregation) ──
function saveLearnedRule(ruleData) {
  try {
    const rawClient = String(ruleData.client || "").toLowerCase().trim();
    let clientKey = "coho";
    let clientTag = "COHO";

    if (rawClient.includes("p360") || rawClient.includes("people")) {
      clientKey = "p360";
      clientTag = "P360";
    } else if (rawClient.includes("isi") || rawClient.includes("innovuze") || rawClient.includes("inovuze")) {
      clientKey = "isi";
      clientTag = "ISI";
    }

    const rulesFile = path.join(
      PROJECT_ROOT,
      `skills/coho-property-operations-assistant/references/learned-rules-${clientKey}.md`
    );
    const dateStr = new Date().toISOString().replace("T", " ").substring(0, 16);
    const entry = `\n### 📌 [${clientTag} • ${ruleData.category || "Operational Rule"}] ${ruleData.summary || "Rule"} (${dateStr} UTC)\n- **Rule Details**: ${ruleData.details || ""}\n`;

    fs.appendFileSync(rulesFile, entry, "utf8");
    console.log(`[Learned Rule Saved for ${clientTag}] ${ruleData.summary}`);
    commitAndPush(rulesFile, `chore(skills): learned rule for [${clientTag}] - ${ruleData.summary || "new rule"}`);
  } catch (err) {
    console.error("Failed to save learned rule:", err);
  }
}

// ── Helper: Save App Feedback ───────────────────────────
function saveAppFeedback(feedbackData) {
  try {
    const feedbackFile = path.join(PROJECT_ROOT, "docs/USER_FEEDBACK_LOG.md");
    const dateStr = new Date().toISOString().replace("T", " ").substring(0, 16);
    const entry = `\n### 💡 [${feedbackData.type || "Feedback"}] ${feedbackData.summary || "User Input"} (${dateStr} UTC)\n- **Details**: ${feedbackData.details || ""}\n- **Status**: Pending Assessment\n`;

    fs.appendFileSync(feedbackFile, entry, "utf8");
    console.log(`[App Feedback Logged] ${feedbackData.summary}`);
    commitAndPush(feedbackFile, `feat(feedback): new app feedback from Rev - ${feedbackData.summary || "suggestion"}`);
  } catch (err) {
    console.error("Failed to save app feedback:", err);
  }
}

// ── Chat Endpoint ─────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  // Authorization Gate (Remediates AUTH-001)
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
    return res.status(401).json({ error: "Unauthorized access. Valid authentication required." });
  }

  const { message, history = [], clientContext, model = "claude-3-7-sonnet" } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Message is required." });
  }
  if (message.length > 4000) {
    return res.status(400).json({ error: "Message too long." });
  }

  // Set up SSE streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");

  let fullResponse = "";

  try {
    let currentSystemPrompt = getCohoSystemPrompt(PROJECT_ROOT, clientContext);
    if (clientContext && clientContext !== "general" && clientContext !== "hub") {
      currentSystemPrompt += `\n\n---\n## 🎯 ACTIVE WORKSPACE CONTEXT: [${clientContext.toUpperCase()}]\nRev is currently in the ${clientContext.toUpperCase()} workspace. Prioritize this organization's terminology, context, and operational rules unless she explicitly mentions another client.\n`;
    }

    const requestedModel = String(model || "").toLowerCase();
    const isClaude = requestedModel.startsWith("claude") || requestedModel.includes("anthropic");

    if (isClaude && anthropic) {
      let claudeModelId = "claude-sonnet-4-6";
      if (requestedModel.includes("haiku")) {
        claudeModelId = "claude-haiku-4-5-20251001";
      } else if (requestedModel.includes("opus")) {
        claudeModelId = "claude-opus-4-6";
      } else {
        claudeModelId = "claude-sonnet-4-6";
      }

      // Build conversation history for Claude
      const claudeMessages = [];
      const recentHistory = history.slice(-20);
      for (const turn of recentHistory) {
        const role = (turn.role === "model" || turn.role === "assistant") ? "assistant" : "user";
        const text = (turn.text || turn.content || "").trim();
        if (text) {
          if (claudeMessages.length > 0 && claudeMessages[claudeMessages.length - 1].role === role) {
            claudeMessages[claudeMessages.length - 1].content += "\n\n" + text;
          } else {
            claudeMessages.push({ role, content: text });
          }
        }
      }
      while (claudeMessages.length > 0 && claudeMessages[0].role !== "user") {
        claudeMessages.shift();
      }
      if (claudeMessages.length > 0 && claudeMessages[claudeMessages.length - 1].role === "user") {
        claudeMessages[claudeMessages.length - 1].content += "\n\n" + message.trim();
      } else {
        claudeMessages.push({ role: "user", content: message.trim() });
      }

      const stream = anthropic.messages.stream({
        model: claudeModelId,
        max_tokens: 2048,
        temperature: 0.7,
        system: currentSystemPrompt,
        messages: claudeMessages,
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          const text = event.delta.text;
          if (text) {
            fullResponse += text;
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }
      }
    } else if (ai) {
      // Gemini execution
      const contents = [];
      const recentHistory = history.slice(-20);
      for (const turn of recentHistory) {
        if (turn.role === "user" || turn.role === "model") {
          contents.push({ role: turn.role, parts: [{ text: turn.text }] });
        }
      }
      contents.push({ role: "user", parts: [{ text: message.trim() }] });

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.6-flash",
        config: {
          systemInstruction: currentSystemPrompt,
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
        contents,
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          fullResponse += text;
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
    } else {
      throw new Error("No configured AI model provider available. Check .env for API keys.");
    }

    // Process background learning tags if present (works identically for Claude & Gemini)
    const ruleMatch = fullResponse.match(/\[\[LEARNED_RULE:\s*(\{.*?\})\s*\]\]/);
    if (ruleMatch) {
      try {
        const parsedRule = JSON.parse(ruleMatch[1]);
        if (!parsedRule.client && clientContext && clientContext !== "general" && clientContext !== "hub") {
          parsedRule.client = clientContext;
        }
        saveLearnedRule(parsedRule);
        res.write(`data: ${JSON.stringify({ event: "rule_saved", data: parsedRule })}\n\n`);
      } catch (err) {
        console.warn("Could not parse LEARNED_RULE tag:", err.message);
      }
    }

    const feedbackMatch = fullResponse.match(/\[\[APP_FEEDBACK:\s*(\{.*?\})\s*\]\]/);
    if (feedbackMatch) {
      try {
        const parsedFeedback = JSON.parse(feedbackMatch[1]);
        saveAppFeedback(parsedFeedback);
        res.write(`data: ${JSON.stringify({ event: "feedback_saved", data: parsedFeedback })}\n\n`);
      } catch (e) {
        console.warn("Could not parse app feedback JSON:", e);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("AI service error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "AI service error: " + err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: "AI service error: " + err.message })}\n\n`);
      res.end();
    }
  }
});

// ── Health Check ─────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "coho-chat-api",
    learningEngine: "active",
    financeSpecialists: 6,
    providers: {
      gemini: !!ai,
      anthropic: !!anthropic
    },
    defaultModel: anthropic ? "claude-sonnet-4-6" : "gemini-3.6-flash"
  });
});

// ── Centralized Error Handler (Remediates ERR-001) ──────
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON format in request body." });
  }
  console.error("Unhandled server error:", err.message);
  res.status(500).json({ error: "Internal server error." });
});

// ── Start ─────────────────────────────────────────
app.listen(PORT, "127.0.0.1", () => {
  console.log(`COHO Chat API with Finance Suite & Continuous Learning running on http://127.0.0.1:${PORT}`);
});
