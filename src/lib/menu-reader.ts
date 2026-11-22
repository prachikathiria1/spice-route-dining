"use client";

import { guessVeg, parseMenuText, type ImportedItem } from "./menu-import";
import { uid } from "./utils";

const PDFJS_VERSION = "6.5.438";
const MAX_PAGES = 12;
const MAX_SIDE = 1800;

export interface MenuPage {
  label: string;
  image: string; // JPEG data URL
  text: string; // embedded PDF text (empty for photos / scanned PDFs)
}

export type ReadMode = "ai" | "pdf-text" | "ocr";

function canvasToJpeg(canvas: HTMLCanvasElement) {
  return canvas.toDataURL("image/jpeg", 0.85);
}

async function imageFileToPage(file: File): Promise<MenuPage> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error(`Couldn't open ${file.name}`));
      i.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return { label: file.name, image: canvasToJpeg(c), text: "" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function pdfFileToPages(file: File): Promise<MenuPage[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: MenuPage[] = [];
  for (let n = 1; n <= Math.min(doc.numPages, MAX_PAGES); n++) {
    const page = await doc.getPage(n);
    // Text layer → lines (group runs by their baseline)
    const content = await page.getTextContent();
    const rows = new Map<number, { x: number; s: string }[]>();
    for (const it of content.items as { str: string; transform: number[] }[]) {
      if (!it.str?.trim()) continue;
      const y = Math.round(it.transform[5] / 4) * 4;
      rows.set(y, [...(rows.get(y) ?? []), { x: it.transform[4], s: it.str }]);
    }
    const text = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, runs]) => runs.sort((a, b) => a.x - b.x).map((r) => r.s).join("  "))
      .join("\n");
    // Render for the AI reader / OCR
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(2.5, MAX_SIDE / Math.max(base.width, base.height)) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvas, viewport }).promise;
    pages.push({ label: `${file.name} · page ${n}`, image: canvasToJpeg(canvas), text });
  }
  return pages;
}

export async function filesToPages(files: File[]): Promise<MenuPage[]> {
  const out: MenuPage[] = [];
  for (const f of files) {
    if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) out.push(...(await pdfFileToPages(f)));
    else if (f.type.startsWith("image/")) out.push(await imageFileToPage(f));
  }
  return out;
}

type OcrWorker = { recognize: (img: string) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown> };
let ocrWorker: Promise<OcrWorker> | null = null;
async function ocr(image: string, onProgress?: (p: number) => void): Promise<string> {
  ocrWorker ??= import("tesseract.js").then(({ createWorker }) =>
    createWorker("eng", 1, { logger: (m: { status: string; progress: number }) => m.status === "recognizing text" && onProgress?.(m.progress) }) as unknown as Promise<OcrWorker>,
  );
  const w = await ocrWorker;
  return (await w.recognize(image)).data.text;
}

interface AiItem { name: string; category: string; description: string; price: number; sizes: { label: string; price: number }[]; veg: boolean | null; spiceLevel: number }

/**
 * Reads one page: Claude vision if the server has a key, otherwise the PDF's own text,
 * otherwise free OCR in the browser.
 */
export async function readPage(page: MenuPage, opts: { preferAi: boolean; onProgress?: (p: number) => void }): Promise<{ items: ImportedItem[]; mode: ReadMode; cuisine?: string; aiError?: string }> {
  let aiError: string | undefined;
  if (opts.preferAi) {
    const res = await fetch("/api/menu/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: page.image }) }).catch(() => null);
    if (res && res.ok) {
      const data = (await res.json()) as { items: AiItem[]; cuisine?: string };
      return {
        mode: "ai",
        cuisine: data.cuisine,
        items: data.items.map((i) => ({
          key: uid(),
          name: i.name,
          category: i.category || "Menu",
          description: i.description ?? "",
          price: i.sizes?.length ? 0 : Math.round(i.price),
          sizes: (i.sizes ?? []).map((s) => ({ label: s.label, price: Math.round(s.price) })),
          veg: i.veg ?? guessVeg(i.name, i.description),
          spiceLevel: Math.max(0, Math.min(3, Math.round(i.spiceLevel || 0))) as ImportedItem["spiceLevel"],
        })),
      };
    }
    if (res && res.status !== 501) aiError = ((await res.json().catch(() => ({}))) as { error?: string }).error ?? `AI reader error ${res.status}`;
  }
  if (page.text.replace(/\s/g, "").length > 80) {
    const items = parseMenuText(page.text);
    if (items.length >= 3) return { items, mode: "pdf-text", aiError };
  }
  return { items: parseMenuText(await ocr(page.image, opts.onProgress)), mode: "ocr", aiError };
}
