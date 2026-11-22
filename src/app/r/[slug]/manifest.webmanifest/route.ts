import { SLUG_RE } from "@/lib/data/adapter";

/** Per-restaurant install manifest: the installed app opens straight into staff login. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) return new Response("Not found", { status: 404 });
  let name = "Restaurant";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    try {
      const r = await fetch(`${url}/rest/v1/settings?select=data&id=eq.${encodeURIComponent(`${slug}::main`)}`, { headers: { apikey: key }, next: { revalidate: 300 } });
      const rows = (await r.json()) as { data?: { restaurantName?: string } }[];
      name = rows[0]?.data?.restaurantName ?? name;
    } catch {
      /* fall back to generic name */
    }
  }
  const manifest = {
    name: `${name} · Staff`,
    short_name: name.length > 12 ? `${name.slice(0, 11)}…` : name,
    description: `Orders, kitchen and tables for ${name}`,
    id: `/r/${slug}/staff`,
    start_url: `/r/${slug}/login`,
    scope: `/r/${slug}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#18181b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=300" } });
}
