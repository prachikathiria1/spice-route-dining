import { LoginForm } from "./LoginForm";

export const metadata = { title: "Staff sign in · Spice Route" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; need?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : undefined;
  return <LoginForm next={next} needAdmin={sp.need === "admin"} devHints={process.env.NODE_ENV !== "production" && !process.env.ADMIN_PIN} />;
}
