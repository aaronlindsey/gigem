import { getPlayerByEmail } from "./db";
import { HttpError } from "./errors";
import type { AppEnv, Player } from "./types";
import { normalizeEmail } from "./validation";

interface JwtHeader {
  alg?: string;
  kid?: string;
}

interface AccessClaims {
  aud?: string | string[];
  email?: string;
  exp?: number;
  iss?: string;
  nbf?: number;
}

interface CachedKeys {
  expiresAt: number;
  keys: JsonWebKeyWithKid[];
}

interface JsonWebKeyWithKid extends JsonWebKey {
  kid?: string;
}

const keyCache = new Map<string, CachedKeys>();

function decodePart<T>(part: string): T {
  const normalized = part.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const decoded = atob(padded);
  const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

function decodeSignature(part: string): Uint8Array {
  const normalized = part.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function teamDomain(value: string): string {
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

async function getKeys(domain: string, forceRefresh = false): Promise<JsonWebKeyWithKid[]> {
  const cached = keyCache.get(domain);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.keys;

  const response = await fetch(`https://${domain}/cdn-cgi/access/certs`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new HttpError(503, "Unable to verify Cloudflare Access identity.");
  const payload = (await response.json()) as { keys?: JsonWebKeyWithKid[] };
  if (!Array.isArray(payload.keys) || payload.keys.length === 0) {
    throw new HttpError(503, "Cloudflare Access did not provide signing keys.");
  }
  keyCache.set(domain, { keys: payload.keys, expiresAt: Date.now() + 60 * 60 * 1000 });
  return payload.keys;
}

async function verifyAccessToken(
  token: string,
  env: AppEnv,
  refreshUnknownKey = true,
): Promise<string> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new HttpError(401, "Invalid Cloudflare Access identity.");
  let header: JwtHeader;
  let claims: AccessClaims;
  try {
    header = decodePart<JwtHeader>(parts[0]);
    claims = decodePart<AccessClaims>(parts[1]);
  } catch {
    throw new HttpError(401, "Malformed Cloudflare Access identity.");
  }
  if (header.alg !== "RS256" || !header.kid) {
    throw new HttpError(401, "Unsupported Cloudflare Access identity.");
  }

  const domain = teamDomain(env.ACCESS_TEAM_DOMAIN);
  if (!domain || domain.startsWith("replace-me") || !env.ACCESS_AUD || env.ACCESS_AUD.startsWith("replace-")) {
    throw new HttpError(503, "Cloudflare Access is not configured.");
  }
  let jwk = (await getKeys(domain)).find((key) => key.kid === header.kid);
  if (!jwk && refreshUnknownKey) {
    jwk = (await getKeys(domain, true)).find((key) => key.kid === header.kid);
  }
  if (!jwk) throw new HttpError(401, "Cloudflare Access signing key was not found.");

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    decodeSignature(parts[2]).buffer as ArrayBuffer,
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!valid) throw new HttpError(401, "Invalid Cloudflare Access signature.");

  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  const expectedAudiences = env.ACCESS_AUD.split(",").map((audience) => audience.trim()).filter(Boolean);
  if (!expectedAudiences.some((audience) => audiences.includes(audience)) ||
      claims.iss !== `https://${domain}` ||
      typeof claims.exp !== "number" || claims.exp <= now ||
      (typeof claims.nbf === "number" && claims.nbf > now) ||
      typeof claims.email !== "string") {
    throw new HttpError(401, "Expired or invalid Cloudflare Access identity.");
  }
  return normalizeEmail(claims.email);
}

function accessToken(request: Request): string | null {
  const assertion = request.headers.get("Cf-Access-Jwt-Assertion");
  if (assertion) return assertion;

  const cookie = request.headers.get("Cookie");
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === "CF_Authorization") return value.join("=") || null;
  }
  return null;
}

function localAuthenticatedEmail(request: Request, env: AppEnv): string | null {
  if (env.ENVIRONMENT === "production") return null;
  const email = request.headers.get("x-local-auth-email") ?? env.LOCAL_AUTH_EMAIL;
  return email ? normalizeEmail(email) : null;
}

export async function authenticatedEmail(request: Request, env: AppEnv): Promise<string> {
  const localEmail = localAuthenticatedEmail(request, env);
  if (localEmail) return localEmail;

  const token = accessToken(request);
  if (!token) throw new HttpError(401, "Sign in with Cloudflare Access to continue.");
  return verifyAccessToken(token, env);
}

export async function optionalAuthenticatedEmail(
  request: Request,
  env: AppEnv,
): Promise<string | null> {
  try {
    const localEmail = localAuthenticatedEmail(request, env);
    if (localEmail) return localEmail;

    const token = accessToken(request);
    return token ? await verifyAccessToken(token, env, false) : null;
  } catch {
    // Optional identity must never make the public scoreboard unavailable.
    return null;
  }
}

export async function requirePlayer(request: Request, env: AppEnv): Promise<Player> {
  const email = await authenticatedEmail(request, env);
  const player = await getPlayerByEmail(env.DB, email);
  if (!player) {
    throw new HttpError(403, "Your email is not on the player roster. Ask the administrator to add it.");
  }
  return player;
}

export async function requireAdmin(request: Request, env: AppEnv): Promise<string> {
  const email = await authenticatedEmail(request, env);
  if (!env.ADMIN_EMAIL) throw new HttpError(503, "The administrator email is not configured.");
  if (email !== normalizeEmail(env.ADMIN_EMAIL)) {
    throw new HttpError(403, "This page is reserved for the game administrator.");
  }
  return email;
}
