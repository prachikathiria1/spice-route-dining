import { LoginForm } from "./LoginForm";

export const metadata = { title: "Staff login" };

export default async function LoginPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ next?: string; need?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith(`/r/${slug}/`) ? sp.next : undefined;
  return <LoginForm slug={slug} next={next} needAdmin={sp.need === "admin"} devHints={process.env.NODE_ENV !== "production"} />;
}
