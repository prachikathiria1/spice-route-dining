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

You can reset the data from the home page.

## Screens

| Route | Who | What |
|---|---|---|
| `/` | everyone | Table picker and links to the staff screens |
| `/t/5` | guest | Menu, search, dish sheet (allergens, spice, Half/Full, combos), cart, order tracker with countdown, Wi-Fi card, rewards, Spice Quiz, call waiter, bill/split/tip/pay |
| `/staff` | waiter | New orders → **Send to kitchen** (one tap), ready → served, waiter calls |
| `/kitchen` | kitchen | Live tickets, prep timers, station tabs (Tandoor / Curry / Cold / Drinks), per-item tick-off, new-ticket chime |
| `/floor` | manager | T1–T6 status (Free / Ordering / Eating / Bill / **HELP** with timer), active tables, open orders, live sales |
| `/qr` | manager | Printable QR codes for every table, with an editable base URL |
| `/admin/menu` | manager | Add, edit and delete dishes, sold-out toggle, restaurant name, Wi-Fi details, GST |
| `/admin/sales` | manager | Revenue, open tickets, average bill, tips, ratings, revenue by hour, top dishes, payment methods |
| `/receipt/[id]` | guest | Shareable digital receipt |

Staff screens have **no login**, by design for this demo.

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
