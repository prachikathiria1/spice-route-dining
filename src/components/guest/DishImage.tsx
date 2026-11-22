"use client";

import { useState } from "react";
import { dishImage } from "@/lib/images";
import type { MenuItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Dish photo, or nothing at all when there's no photo (or it fails to load). */
export function DishImage({ item, className, eager }: { item: Pick<MenuItem, "id" | "image" | "name" | "available">; className?: string; eager?: boolean }) {
  const src = dishImage(item);
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={item.name}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("object-cover", !item.available && "grayscale", className)}
    />
  );
}

export const hasDishImage = (item: Pick<MenuItem, "id" | "image">) => !!dishImage(item);
