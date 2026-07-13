"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, createToken, Role } from "@/lib/auth";

export async function login(formData: FormData) {
  const passcode = String(formData.get("passcode") ?? "");
  const next = String(formData.get("next") ?? "/staff");

  let role: Role | null = null;
  if (process.env.ADMIN_PASSCODE && passcode === process.env.ADMIN_PASSCODE) role = "admin";
  else if (process.env.STAFF_PASSCODE && passcode === process.env.STAFF_PASSCODE) role = "staff";

  if (!role) redirect(`/login?error=1&next=${encodeURIComponent(next)}`);

  (await cookies()).set(COOKIE_NAME, await createToken(role), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  // 관리자 코드로 로그인했는데 목적지가 로그인 페이지면 관리 화면으로
  redirect(next.startsWith("/") ? next : "/staff");
}

export async function logout() {
  (await cookies()).delete(COOKIE_NAME);
  redirect("/login");
}
