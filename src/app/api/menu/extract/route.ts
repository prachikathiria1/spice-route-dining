import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 120;

const MenuSchema = z.object({
  cuisine: z.string().describe("Short cuisine label for the restaurant, e.g. 'North Indian', 'Cafe', 'Chinese', 'Italian'"),
  items: z.array(
    z.object({
      name: z.string(),
      category: z.string().describe("Section heading the item appears under, e.g. 'Starters', 'Breads', 'Drinks'"),
      description: z.string().describe("Description printed on the menu, or empty string"),
      price: z.number().describe("Price in rupees when the item has a single price; 0 when it has sizes"),
      sizes: z.array(z.object({ label: z.string(), price: z.number() })).describe("Portion/size prices such as Half/Full or Regular/Large; empty when single price"),
      veg: z.boolean().nullable().describe("true if vegetarian, false if it contains meat, fish or egg, null if unclear. Use printed veg/non-veg marks when present."),
      spiceLevel: z.number().int().describe("0 none, 1 mild, 2 medium, 3 hot; use chilli icons or words like 'spicy' if printed, else 0"),
    }),
  ),
});

const PROMPT = `This image is one page of a restaurant menu. Extract every orderable item exactly as printed.
- Keep item names as printed (fix obvious OCR-style typos only).
- Prices are in Indian rupees; ignore currency symbols. If two or more prices are printed for one item (e.g. Half/Full, Regular/Large, Qtr/Half/Full), put them in sizes with the column labels from the menu.
- Use the nearest section heading as the category. Do not invent items, descriptions or prices.
- Skip non-items like taxes, timings, phone numbers and offers text.`;

/**
 * AI menu reader (Claude vision). Returns 501 when ANTHROPIC_API_KEY isn't set,
 * so the browser falls back to free OCR.
 */
export async function POST(req: Request) {
  if ((await currentSession())?.role !== "super") return NextResponse.json({ ok: false, error: "Super admin only" }, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ ok: false, mode: "ocr" }, { status: 501 });

  const body = (await req.json().catch(() => ({}))) as { image?: string };
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(body.image ?? "");
  if (!m) return NextResponse.json({ ok: false, error: "Send one page as a JPEG/PNG/WebP data URL" }, { status: 400 });
  if (m[2].length > 7_000_000) return NextResponse.json({ ok: false, error: "Page image is too large" }, { status: 413 });

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(MenuSchema) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: m[1] as "image/jpeg" | "image/png" | "image/webp", data: m[2] } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });
    if (response.stop_reason === "refusal") return NextResponse.json({ ok: false, error: "The AI declined this page; use free OCR instead." }, { status: 422 });
    if (response.stop_reason === "max_tokens") return NextResponse.json({ ok: false, error: "This page has too many items; crop it into two photos." }, { status: 422 });
    const parsed = response.parsed_output;
    if (!parsed) return NextResponse.json({ ok: false, error: "Couldn't read this page" }, { status: 422 });
    return NextResponse.json({ ok: true, mode: "ai", ...parsed });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return NextResponse.json({ ok: false, mode: "ocr", error: "ANTHROPIC_API_KEY is invalid" }, { status: 501 });
    if (error instanceof Anthropic.RateLimitError) return NextResponse.json({ ok: false, error: "AI is busy; try again in a minute" }, { status: 429 });
    if (error instanceof Anthropic.APIError) {
      console.error("[menu/extract]", error.status, error.message);
      return NextResponse.json({ ok: false, error: `AI error ${error.status}` }, { status: 502 });
    }
    console.error("[menu/extract]", error);
    return NextResponse.json({ ok: false, error: "AI reader unavailable" }, { status: 502 });
  }
}

/** Lets the super admin UI show whether the AI reader is switched on. */
export async function GET() {
  if ((await currentSession())?.role !== "super") return NextResponse.json({ ok: false }, { status: 403 });
  return NextResponse.json({ ok: true, ai: !!process.env.ANTHROPIC_API_KEY });
}
