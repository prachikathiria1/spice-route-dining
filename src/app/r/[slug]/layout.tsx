import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoleProvider } from "@/components/role";
import { RestaurantChrome } from "@/components/RestaurantChrome";
import { SLUG_RE } from "@/lib/data/adapter";
import { StoreProvider } from "@/lib/data/store";
import { roleForRestaurant } from "@/lib/session";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { manifest: `/r/${slug}/manifest.webmanifest` };
}

export default async function RestaurantLayout({ params, children }: { params: Promise<{ slug: string }>; children: React.ReactNode }) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) notFound();
  const role = await roleForRestaurant(slug);
  return (
    <RoleProvider role={role}>
      <StoreProvider restaurantId={slug}>
        <RestaurantChrome>{children}</RestaurantChrome>
      </StoreProvider>
    </RoleProvider>
  );
}
