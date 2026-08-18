import { verifyToken } from "@clerk/backend";

const getBearerToken = (authorizationHeader = "") => {
  if (!authorizationHeader.startsWith("Bearer ")) {
    return "";
  }
  return authorizationHeader.slice("Bearer ".length).trim();
};

export default async function requireAdmin(req, res, next) {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  const isProduction = process.env.NODE_ENV === "production";

  const bearerToken = getBearerToken(req.headers.authorization || "");
  if (clerkSecretKey && bearerToken) {
    try {
      const payload = await verifyToken(bearerToken, {
        secretKey: clerkSecretKey,
      });
      req.auth = {
        userId: payload.sub,
        sessionId: payload.sid,
      };
      return next();
    } catch (error) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  if (clerkSecretKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (isProduction) {
    return res.status(500).json({ error: "Admin auth is not configured" });
  }

  return next();
}
