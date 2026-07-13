// 담당자/관리자 인증 — HMAC 서명 쿠키 (Edge 미들웨어 호환을 위해 Web Crypto 사용)
export type Role = "staff" | "admin";

const COOKIE_NAME = "udtg_session";
const TTL_MS = 1000 * 60 * 60 * 12; // 12시간

export { COOKIE_NAME };

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET 환경 변수가 설정되지 않았습니다.");
  return s;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createToken(role: Role): Promise<string> {
  const payload = `${role}.${Date.now() + TTL_MS}`;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), new TextEncoder().encode(payload));
  return `${btoa(payload)}.${toHex(sig)}`;
}

export async function verifyToken(token: string | undefined): Promise<Role | null> {
  if (!token) return null;
  const [b64, sigHex] = token.split(".");
  if (!b64 || !sigHex) return null;

  let payload: string;
  try {
    payload = atob(b64);
  } catch {
    return null;
  }

  const sig = new Uint8Array(sigHex.match(/.{2}/g)?.map((h) => parseInt(h, 16)) ?? []);
  const valid = await crypto.subtle.verify("HMAC", await hmacKey(), sig, new TextEncoder().encode(payload));
  if (!valid) return null;

  const [role, expStr] = payload.split(".");
  if (Date.now() > Number(expStr)) return null;
  return role === "admin" || role === "staff" ? role : null;
}
