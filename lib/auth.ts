import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPassword } from "@/lib/password";
import { getSupabase } from "@/lib/supabase";

export type SessionUser = {
  id: number;
  name: string;
  username: string;
  role: "admin" | "staff";
  sectorSlug: string | null;
  teamMemberId: number | null;
};

const COOKIE = "tironi_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  return (
    process.env.AUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    "tironi-dev-secret"
  );
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function encodeSession(user: SessionUser) {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + MAX_AGE * 1000 })).toString(
    "base64url",
  );
  return `${payload}.${sign(payload)}`;
}

function decodeSession(token: string): SessionUser | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionUser & {
      exp?: number;
    };
    if (data.exp && data.exp < Date.now()) return null;
    if (data.role !== "admin" && data.role !== "staff") return null;
    return {
      id: Number(data.id),
      name: data.name,
      username: data.username,
      role: data.role,
      sectorSlug: data.sectorSlug ?? null,
      teamMemberId: data.teamMemberId ?? null,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return decodeSession(token);
}

export async function setSession(user: SessionUser) {
  (await cookies()).set(COOKIE, encodeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  (await cookies()).set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function loginWithPassword(username: string, password: string): Promise<SessionUser> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("app_users")
    .select("id, username, password_hash, role, team_member_id")
    .eq("username", username.trim().toLowerCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !verifyPassword(password, data.password_hash)) {
    throw new Error("Usuário ou senha inválidos.");
  }

  let name = data.username;
  let sectorSlug: string | null = null;
  if (data.team_member_id) {
    const { data: member } = await supabase
      .from("team_members")
      .select("id, name, sector_id")
      .eq("id", data.team_member_id)
      .maybeSingle();
    name = member?.name ?? name;
    if (member?.sector_id) {
      const { data: sector } = await supabase
        .from("sectors")
        .select("slug")
        .eq("id", member.sector_id)
        .maybeSingle();
      sectorSlug = sector?.slug ?? null;
    }
  }

  return {
    id: Number(data.id),
    name,
    username: data.username,
    role: data.role === "admin" ? "admin" : "staff",
    sectorSlug,
    teamMemberId: data.team_member_id == null ? null : Number(data.team_member_id),
  };
}

export function homeFor(user: SessionUser) {
  if (user.role === "admin") return "/";
  if (user.sectorSlug === "comercial") return "/comercial";
  return "/desenvolvimento";
}

export async function requireWorkspace(slug: "comercial" | "desenvolvimento") {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin" && homeFor(session) !== `/${slug}`) {
    redirect(homeFor(session));
  }
  return session;
}

export async function requireAdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect(homeFor(session));
  return session;
}

export async function requirePageUser(role?: "admin" | "staff") {
  const session = await getSession();
  if (!session) return null;
  if (role && session.role !== role && session.role !== "admin") return null;
  return session;
}

export async function requireApiUser(kind: "admin" | "staff" | "any" = "any") {
  const session = await getSession();
  if (!session) {
    throw Object.assign(new Error("Não autenticado."), { status: 401 });
  }
  if (kind === "admin" && session.role !== "admin") {
    throw Object.assign(new Error("Acesso restrito à gestão."), { status: 403 });
  }
  if (kind === "staff" && session.role !== "staff" && session.role !== "admin") {
    throw Object.assign(new Error("Sem permissão."), { status: 403 });
  }
  return session;
}

export function assertBoardAccess(session: SessionUser, board: "comercial" | "desenvolvimento") {
  if (session.role === "admin") return;
  if (homeFor(session) !== `/${board}`) {
    throw Object.assign(new Error("Sem permissão para esta área."), { status: 403 });
  }
}

export function apiFail(error: unknown) {
  const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 400;
  const message = error instanceof Error ? error.message : "Invalid payload";
  return Response.json({ error: message }, { status: status || 400 });
}
