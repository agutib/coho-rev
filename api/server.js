/**
 * COHO OpsHub — AI Chat Backend
 * Secure proxy between the browser and Gemini API
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { GoogleGenAI } = require("@google/genai");
const { COHO_SYSTEM_PROMPT } = require("./coho-system-prompt");

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("FATAL: GEMINI_API_KEY is not set in .env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// ── Middleware ─────────────────────────────────────────
app.use(express.json({ limit: "50kb" }));

// Only allow requests from the COHO site itself
app.use(cors({
  origin: ["https://coho.arnoldgutib.pro", "http://localhost"],
  methods: ["POST"],
}));

// Rate limiting — 30 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment." },
});
app.use("/api/", limiter);

// ── Chat Endpoint ─────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Message is required." });
  }
  if (message.length > 4000) {
    return res.status(400).json({ error: "Message too long." });
  }

  // Build conversation history for Gemini multi-turn chat
  const contents = [];

  // Add prior turns from history (max last 20 messages)
  const recentHistory = history.slice(-20);
  for (const turn of recentHistory) {
    if (turn.role === "user" || turn.role === "model") {
      contents.push({ role: turn.role, parts: [{ text: turn.text }] });
    }
  }

  // Add current user message
  contents.push({ role: "user", parts: [{ text: message.trim() }] });

  // Set up SSE streaming response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx buffering

  try {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.6-flash",
      config: {
        systemInstruction: COHO_SYSTEM_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
      contents,
    });

    for await (const chunk of responseStream) {
      const text = chunk.text();
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
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

// ── Health check ─────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "coho-chat-api" });
});

// ── Start ─────────────────────────────────────────
app.listen(PORT, "127.0.0.1", () => {
  console.log(`COHO Chat API running on http://127.0.0.1:${PORT}`);
});
