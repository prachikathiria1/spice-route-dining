"use client";

import { useState } from "react";
import { dishImage, isRepresentativePhoto } from "@/lib/images";
import type { MenuItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type DishLike = Pick<MenuItem, "id" | "image" | "name" | "available"> & { veg?: boolean };

/** Dish photo, or nothing at all when there's no photo (or it fails to load). */
export function DishImage({ item, className, eager, showTag }: { item: DishLike; className?: string; eager?: boolean; showTag?: boolean }) {
  const src = dishImage(item);
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={item.name} loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setFailed(true)} className={cn("object-cover", !item.available && "grayscale", className)} />
  );
  if (!showTag || !isRepresentativePhoto(item)) return img;
  return (
    <div className="relative size-full">
      {img}
      <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">Representative image</span>
    </div>
  );
}

export const hasDishImage = (item: Pick<MenuItem, "id" | "image"> & { name?: string; veg?: boolean }) => !!dishImage(item);
