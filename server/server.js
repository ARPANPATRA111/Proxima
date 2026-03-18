require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const tokenRoutes = require("./src/routes/token");
const roomRoutes = require("./src/routes/rooms");
const authRoutes = require("./src/routes/auth");
const geminiRoutes = require("./src/routes/gemini");
const registerSocketHandlers = require("./src/socket");
const { authLimiter, tokenLimiter, generalLimiter } = require("./src/middleware/rateLimiter");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use(express.json());

app.use(generalLimiter);

app.use("/auth", authLimiter, authRoutes);
app.use("/token", tokenLimiter, tokenRoutes);
app.use("/rooms", roomRoutes);
app.use("/gemini", geminiRoutes);

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  registerSocketHandlers(io, socket);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Proxima backend running on http://localhost:${PORT}`);
});
