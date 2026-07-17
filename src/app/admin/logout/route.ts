// Logout route — borra la cookie de sesión admin.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
  return NextResponse.redirect(new URL("/admin", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"));
}
