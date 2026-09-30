import * as jose from "jose";

export const signGameToken = async (payload: Record<string, unknown>) => {
  if (!process.env.GAME_JWT_SECRET) {
    throw new Error("GAME_JWT_SECRET is missing");
  }
  const secret = new TextEncoder().encode(process.env.GAME_JWT_SECRET);
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret);
};

export const verifyGameToken = async (token: string) => {
  if (!process.env.GAME_JWT_SECRET) {
    throw new Error("GAME_JWT_SECRET is missing");
  }
  const secret = new TextEncoder().encode(process.env.GAME_JWT_SECRET);
  try {
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return null;
  }
};

/**
 * CSRF defense-in-depth helper that validates Origin and Host match for state-changing requests.
 */
export const verifySameOrigin = (request: Request): boolean => {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    return false;
  }

  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      return originHost === host;
    } catch {
      return false;
    }
  }

  return true;
};
