const express = require("express");
const { AccessToken } = require("livekit-server-sdk");
const router = express.Router();

const VALID_ROLES = new Set(["teacher", "student"]);

router.get("/", async (req, res) => {
  const { room, name, role } = req.query;

  if (!room?.trim()) return res.status(400).json({ error: "room is required" });
  if (!name?.trim()) return res.status(400).json({ error: "name is required" });
  if (!VALID_ROLES.has(role))
    return res.status(400).json({ error: "role must be teacher or student" });

  try {
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      { identity: name.trim(), ttl: "6h" },
    );

    at.addGrant({
      roomJoin: true,
      room: room.trim(),
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: role === "teacher",
    });

    const token = await at.toJwt();

    return res.json({
      token,
      serverUrl: process.env.LIVEKIT_HOST,
      identity: name.trim(),
      room: room.trim(),
    });
  } catch (err) {
    console.error("[token] failed:", err.message);
    return res.status(500).json({ error: "failed to generate token" });
  }
});

module.exports = router;
