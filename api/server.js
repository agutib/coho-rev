/**
 * COHO OpsHub — AI Chat Backend
 * Secure proxy between the browser, Gemini API, and Continuous Learning Engine
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { GoogleGenAI } = require("@google/genai");
const { getCohoSystemPrompt } = require("./coho-system-prompt");

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_PAT = process.env.GITHUB_PAT;
const PROJECT_ROOT = path.join(__dirname, "..");

if (!API_KEY) {
  console.error("FATAL: GEMINI_API_KEY is not set in .env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// ── Middleware ─────────────────────────────────────────
app.use(express.json({ limit: "50kb" }));

app.use(cors({
  origin: ["https://coho.arnoldgutib.pro", "http://localhost"],
  methods: ["POST", "GET"],
}));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment." },
});
app.use("/api/", limiter);

// ── Helper: Git Commit & Push ───────────────────────────
function commitAndPush(filePath, commitMessage) {
  const relPath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, "/");
  const remote = GITHUB_PAT 
    ? `https://${GITHUB_PAT}@github.com/agutib/coho-rev.git` 
    : "origin";

  const cmd = `git -C "${PROJECT_ROOT}" add "${relPath}" && git -C "${PROJECT_ROOT}" commit -m "${commitMessage.replace(/"/g, '\"')}" && git -C "${PROJECT_ROOT}" push ${remote} main`;

  console.log(`[Git Sync] Executing commit for ${relPath}...`);
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.warn(`[Git Sync Warning] Could not push to remote (PAT may need configuration):`, error.message);
    } else {
      console.log(`[Git Sync Success] Pushed to GitHub: ${commitMessage}`);
    }
  });
}

// ── Helper: Save Learned Rule ───────────────────────────
function saveLearnedRule(ruleData) {
  try {
    const rulesFile = path.join(
      PROJECT_ROOT,
      "skills/coho-property-operations-assistant/references/learned-rules.md"
    );
    const dateStr = new Date().toISOString().replace("T", " ").substring(0, 16);
    const entry = `\n### 📌 [${ruleData.category || "Operational Rule"}] ${ruleData.summary || "Rule"} (${dateStr} UTC)\n- **Rule Details**: ${ruleData.details || ""}\n`;

    fs.appendFileSync(rulesFile, entry, "utf8");
    console.log(`[Learned Rule Saved] ${ruleData.summary}`);
    commitAndPush(rulesFile, `chore(skills): learned rule from Rev - ${ruleData.summary || "new rule"}`);
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
  const { message, history = [] } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Message is required." });
  }
  if (message.length > 4000) {
    return res.status(400).json({ error: "Message too long." });
  }

  // Build conversation history
  const contents = [];
  const recentHistory = history.slice(-20);
  for (const turn of recentHistory) {
    if (turn.role === "user" || turn.role === "model") {
      contents.push({ role: turn.role, parts: [{ text: turn.text }] });
    }
  }
  contents.push({ role: "user", parts: [{ text: message.trim() }] });

  // Set up SSE streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");

  let fullResponse = "";

  try {
    const currentSystemPrompt = getCohoSystemPrompt(PROJECT_ROOT);

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.6-flash",
      config: {
        systemInstruction: currentSystemPrompt,
        temperature: 0.7,
        maxOutputTokens: 1024,
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

    // Process background learning tags if present
    const ruleMatch = fullResponse.match(/\[\[LEARNED_RULE:\s*(\{.*?\})\s*\]\]/);
    if (ruleMatch) {
      try {
        const parsedRule = JSON.parse(ruleMatch[1]);
        saveLearnedRule(parsedRule);
        res.write(`data: ${JSON.stringify({ event: "rule_saved", data: parsedRule })}\n\n`);
      } catch (e) {
        console.warn("Could not parse learned rule JSON:", e);
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
    console.error("Gemini API error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "AI service error. Please try again." });
    } else {
      res.write(`data: ${JSON.stringify({ error: "AI service error. Please try again." })}\n\n`);
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
    financeSpecialists: 6
  });
});

// ── Start ─────────────────────────────────────────
app.listen(PORT, "127.0.0.1", () => {
  console.log(`COHO Chat API with Finance Suite & Continuous Learning running on http://127.0.0.1:${PORT}`);
});
