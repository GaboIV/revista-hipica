// Utilidad para verificar la sesión admin.
import { cookies } from "next/headers";

export async function isAdmin(): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const cookieStore = await cookies();
  return cookieStore.get("admin_session")?.value === secret;
}
