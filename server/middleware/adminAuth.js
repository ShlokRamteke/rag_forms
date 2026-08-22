import { createRemoteJWKSet, jwtVerify } from "jose";

const domain = (process.env.AUTH0_DOMAIN || process.env.AUTH0_ISSUER_BASE_URL || "").trim();
const isProduction = process.env.NODE_ENV === "production";

let JWKS = null;
let issuer = "";

if (domain) {
  const normalizedDomain = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  issuer = `https://${normalizedDomain}/`;
  JWKS = createRemoteJWKSet(new URL(`https://${normalizedDomain}/.well-known/jwks.json`));
}

const getBearerToken = (authorizationHeader = "") => {
  if (!authorizationHeader.startsWith("Bearer ")) {
    return "";
  }
  return authorizationHeader.slice("Bearer ".length).trim();
};

export default async function requireAdmin(req, res, next) {
  const bearerToken = getBearerToken(req.headers.authorization || "");

  if (JWKS && bearerToken) {
    try {
      const { payload } = await jwtVerify(bearerToken, JWKS, {
        issuer,
      });

      req.auth = {
        userId: payload.sub,
        email: payload.email,
        payload,
      };
      return next();
    } catch (err) {
      console.warn("[AdminAuth] Token verification failed:", err.message);
      return res.status(401).json({ error: "Unauthorized", message: err.message });
    }
  }

  if (JWKS) {
    return res.status(401).json({ error: "Unauthorized", message: "Missing Bearer token" });
  }

  if (isProduction) {
    return res.status(500).json({ error: "Admin auth is not configured" });
  }

  return next();
}
