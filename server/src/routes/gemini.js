const express = require("express");
const router = express.Router();

router.post("/chat", async (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not set in .env" });

  try {
    const contents = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      }
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{
              text: "You are Proxima AI, a helpful classroom assistant. Keep answers concise and educational. Use simple language. If asked about something unrelated to education, politely redirect. Format answers with short paragraphs."
            }]
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("[Gemini] API error:", err);
      return res.status(response.status).json({ error: "Gemini API error" });
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";
    res.json({ reply });
  } catch (err) {
    console.error("[Gemini] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
