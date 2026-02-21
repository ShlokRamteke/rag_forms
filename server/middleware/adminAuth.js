export default function requireAdmin(req, res, next) {
  const adminToken = process.env.ADMIN_TOKEN;
  const isProduction = process.env.NODE_ENV === "production";

  if (!adminToken) {
    if (isProduction) {
      return res.status(500).json({ error: "Admin token not configured" });
    }
    return next();
  }

  const provided =
    req.headers["x-admin-token"] ||
    req.headers["X-Admin-Token"] ||
    req.headers["x-admin-token".toLowerCase()];

  if (!provided || provided !== adminToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}
