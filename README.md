# Spice Route · Smart Dining

A full-stack, responsive restaurant system: QR table ordering, a kitchen display (KDS), a live floor map, waiter calls, a while-you-wait quiz, and split-bill / tip / pay-at-table with receipts and 1-tap reviews.

It's built only from free, open-source packages and free-tier services: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, lucide-react, qrcode.react and supabase-js.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run dev:lan      # also reachable from phones on the same Wi-Fi
```

With no env vars set, the app runs in **local demo mode**:
- Data is stored in `localStorage`.
- Changes sync live between tabs of the same browser through `BroadcastChannel`.
- Sample data is pre-seeded: tables T1–T6, a 26-dish menu, live orders, a waiter call and today's sales.

Admins can reset the data in **Settings**.

## Multi-restaurant platform

Each restaurant lives at `/r/<slug>`: its customer page, `/t/<n>` tables, staff app and manager pages. Every database row id is namespaced as `<slug>::<id>`, so many restaurants share the same tables. Old single-restaurant URLs such as `/t/5` and `/staff` redirect to the demo restaurant (`spice-route`).

**Super admin (`/super`)** is for the platform owner only. It's protected by the server variable `SUPER_ADMIN_PASSWORD` (dev default: `super-admin`). From there you can:
- Add a restaurant: details → menu import → theme and staff PINs → a handover message with links and PINs.
- **Import menus from PDFs or photos.**
  - With `ANTHROPIC_API_KEY` set, Claude vision reads each page (sections, Half/Full prices, veg marks).
  - Without it, the app reads a digital PDF's embedded text exactly, or runs free in-browser OCR (tesseract.js) on photos.
  - Every import ends in an editable review screen.
- Change the theme, pause or resume a restaurant, reset PINs, and re-import menus. Dishes with matching names keep their photos and settings.

Staff PINs are salted scrypt hashes stored in a private Supabase Storage bucket (`secure`). The server reads that bucket with `SUPABASE_SECRET_KEY`, which must never go in a `NEXT_PUBLIC_` variable. Dish and hero photos go to the public `media` bucket.

**Staff app:**
- Phone-first, with bottom tabs, a big PIN keypad, and Hindi or English.
- Big-text mode, plus sound and vibration alerts for new orders and waiter calls.
- Installable from `/r/<slug>/manifest.webmanifest`. The service worker caches static files only.

**Growth features:**
- WhatsApp bill and receipt sharing, and a daily summary to the owner (free `wa.me` links).
- After a 4–5★ rating, guests get a Google review prompt. After 1–3★, they get a private feedback box shown on the manager dashboard.

## Roles

There are three roles. The current role is always shown as a badge in the top-right corner of the screen: **Customer view**, **Waiter view** or **Admin view**.

| Role | How to get in | Screens |
|---|---|---|
| **Customer** | Scan the table QR code (`/t/5`), no login | Photo menu with search and Chef's picks, dish details (allergens, spice level, Half/Full, combos), cart, live order timer, Wi-Fi and rewards, Spice Quiz, call waiter, split bill, tip, pay, receipt and rating |
| **Waiter** | `/login` → Waiter + PIN | `/staff` order queue (one-tap send to kitchen), `/kitchen` KDS (station tabs, prep timers), `/floor` live table map with HELP alerts |
| **Admin** | `/login` → Admin + PIN | Everything a waiter has, plus `/admin` dashboard (revenue, bills, average bill, rating, best sellers), `/admin/menu`, `/admin/tables` (QR codes) and `/admin/settings` |

Staff sessions use an HMAC-signed, httpOnly cookie that lasts 12 hours. The session is checked in `src/proxy.ts` and again in the server layouts. Set these server-side variables:

```
ADMIN_PIN=...        # e.g. 6 digits
WAITER_PIN=...
AUTH_SECRET=...      # long random string
```

In `npm run dev` without these variables, the default PINs are Admin `1234` and Waiter `0000`. A production build refuses staff logins until the variables are set.

> Note: PINs protect the staff **screens**. With the demo Supabase RLS policies, the database itself is still writable with the public anon key. For production, move writes behind Supabase Auth and RLS or server routes.

## Dish photos

Photos live in `public/dishes/`. They are Unsplash License images, and credits are in `public/dishes/CREDITS.md`.
- A dish without a photo gets a clean text-only card, with no emoji placeholder.
- Admins can set a photo URL for any dish in the menu editor.

## Supabase (free tier) for cross-device realtime

Local mode syncs only within one browser. To share data between phones, staff tablets and kitchen screens:

1. Create a Supabase project. In **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql).
2. Set these variables in `.env.local` locally, or in your hosting provider's environment settings:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable / anon key>
   ```
   Use the **publishable/anon** key only. Never put the secret/service-role key in a `NEXT_PUBLIC_` variable.
3. Restart the app. On first load it seeds the sample data. The badge in the staff header changes to **Supabase live**.

If Supabase is unreachable or the schema is missing, the app shows a banner and falls back to local mode.

> ⚠ The included RLS policies let the anon key read and write everything, so the demo works without auth. Tighten them, and add Supabase Auth for staff, before real use.

## Payments and receipts (demo mode)

- **Checkout is simulated:**
  - Card uses the 4242 test card.
  - Cash, bank transfer, Apple Pay and Google Pay are mocked.
  - Every payment screen is labelled **DEMO / TEST MODE**. No money moves.
- **To go live,** swap `PaymentSheet` for a gateway's sandbox, such as Razorpay or Stripe test mode.
- **Email receipts:** set `RESEND_API_KEY` (free tier) and optionally `RECEIPT_FROM_EMAIL`. Without them, `/api/receipt` returns a fallback and the guest keeps the in-app receipt (print/PDF, copyable link).

## Project layout

```
src/lib/types.ts            domain types
src/lib/seed.ts             sample data (time-relative)
src/lib/selectors.ts        table status, bills, sales maths
src/lib/data/               adapter interface, local + Supabase adapters, React store/actions
src/components/guest/       guest app (menu, cart, tracker, quiz, call waiter, bill, payment)
src/components/staff/       staff shell, call list, status styles
src/app/...                 routes (see table above), api/receipt
supabase/schema.sql         tables, realtime publication, demo RLS
```
