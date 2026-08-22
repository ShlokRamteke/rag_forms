import express from "express";
import mongoose from "mongoose";
import config from "./config.js";
import cors from "cors";
import formRoutes from "./routes/formRoutes.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.set("trust proxy", 1);

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "https://cipherforms.vercel.app",
];
const configuredOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const allowedOrigins = [...defaultOrigins, ...configuredOrigins];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server, keep-alive)
      if (!origin) return callback(null, true);
      // Allow if wildcard, in allowed list, or from any *.vercel.app deployment
      if (
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }
      console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
      return callback(new Error(`Blocked by CORS policy for origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

if (process.env.NODE_ENV === "production") {
  if (!process.env.MONGODB_URI || !process.env.GEMINI_API_KEY) {
    throw new Error("Missing required environment variables (MONGODB_URI, GEMINI_API_KEY).");
  }
  if (!process.env.AUTH0_DOMAIN && !process.env.AUTH0_ISSUER_BASE_URL) {
    throw new Error("Set AUTH0_DOMAIN in production.");
  }
  if (!process.env.APP_DATA_KEY || process.env.APP_DATA_KEY === "dev-insecure-default-key") {
    throw new Error("Set a secure APP_DATA_KEY (32+ characters) in production.");
  }
}

app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    const proto = req.headers["x-forwarded-proto"];
    if (proto && proto !== "https") {
      return res.status(403).json({ error: "HTTPS required" });
    }
  }
  return next();
});


mongoose
  .connect(config.mongodbUri)
  .then(() => {
    console.log("Connected to MongoDB", config.mongodbUri);
  })
  .catch((err) => {
    console.error("MongoDB connection error", err);
  });

import rateLimit from "express-rate-limit";

const pingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // max 60 ping requests per minute per IP
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => req.ip,
  message: { status: "error", error: "Too many ping requests. Slow down." }
});

const handlePing = (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.status(200).json({
    status: "ok",
    db: dbStatus,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

app.get("/ping", pingLimiter, handlePing);
app.get("/healthz", pingLimiter, handlePing);
app.get("/api/ping", pingLimiter, handlePing);

app.use("/api", formRoutes);

function startKeepAliveWorker() {
  const targetUrl = process.env.RENDER_EXTERNAL_URL || process.env.SELF_PING_URL || process.env.SERVER_URL;
  if (!targetUrl) return;

  const cleanUrl = targetUrl.replace(/\/+$/, "");
  const pingEndpoint = `${cleanUrl}/api/ping`;
  const INTERVAL_MS = 14 * 60 * 1000; // 14 minutes (Render sleeps at 15m)

  console.log(`[Keep-Alive] Initialized self-ping worker for: ${pingEndpoint} (every 14m)`);

  const keepAliveInterval = setInterval(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(pingEndpoint, {
        signal: controller.signal,
        headers: { "User-Agent": "KeepAliveWorker/1.0" },
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        console.log(`[Keep-Alive] Pinged server at ${new Date().toISOString()}`);
      }
    } catch (err) {
      console.warn(`[Keep-Alive] Self-ping notice: ${err.message}`);
    }
  }, INTERVAL_MS);

  if (typeof keepAliveInterval?.unref === "function") {
    keepAliveInterval.unref();
  }
}

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  startKeepAliveWorker();
});
