import express from "express";
import mongoose from "mongoose";
import config from "./config.js";
import cors from "cors";
import formRoutes from "./routes/formRoutes.js";

const app = express();
app.use(express.json());
app.set("trust proxy", 1);

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "X-Admin-Token"],
  })
);

console.log(config.mongodbUri);

if (process.env.NODE_ENV === "production") {
  if (!process.env.MONGODB_URI || !process.env.GEMINI_API_KEY) {
    throw new Error("Missing required environment variables.");
  }
  if (!process.env.ADMIN_TOKEN) {
    throw new Error("ADMIN_TOKEN is required in production.");
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

app.get("/api/ping", (req, res) => {
  res.json({ message: "ping" });
});

app.use("/api", formRoutes);

app.listen(config.port, () =>
  console.log(`Server running on port ${config.port}`)
);
