# Matthew Sports & Vybe Girl POS

Billing terminals, invoices and an admin panel for two shops: **Matthew Sports** (Pallamthurai, Kanyakumari) and **Vybe Girl** (Perumathura, Trivandrum).

Built with Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4 and Supabase (PostgreSQL).

## Getting started

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in `SESSION_SECRET`, the Supabase URL and key, and the three passcodes (`ADMIN_PASSCODE`, `STAFF1_PASSCODE`, `STAFF2_PASSCODE`).
3. Run `supabase/migrations/0001` → `0007` in order in the Supabase SQL editor.
4. Run `npm run accounts` to write the passcodes from `.env` into the database.
5. `npm run dev` and open `/login`.

## Branches

Two fully separate POS terminals run from this one app. They share code but no data, logins or branding.

| | Branch 1 — Matthew Sports | Branch 2 — Vybe Girl |
|---|---|---|
| Terminal | `/pos1` | `/pos2` |
| Invoices | `/invoice/<id>` (`MS-…`) | `/pos2/invoice/<id>` (`VG-…`) |
| Shop details & theme presets | `lib/branches/pos1.ts` | `lib/branches/pos2.ts` |
| Logo & app icons | `public/logo.png`, `public/logo-mark.png`, `public/icon-*.png` | `public/pos2/…` |
| Database tables | `products`, `orders`, `order_items` | `pos2_products`, `pos2_orders`, `pos2_order_items` |

The original logo files are in `brand/`. To rebuild a branch's app icons: `npm run icons -- <image> <pos1|pos2>`.

## Logins and the admin panel

- **`/login`** has two tabs, and there are no IDs. **Staff POS**: pick the branch, then enter its passcode. **Admin**: enter the admin passcode.
- **Staff accounts** belong to one branch and can only open that branch's terminal.
- **Admins** land on **`/admin`**:
  - a combined sales overview, with a branch filter
  - links into each POS
  - **Staff & Memberships**: add or remove people and change passcodes. Passcodes must be unique within a branch, so a passcode always identifies one person.
- **Accounts** are stored in `pos_accounts` with scrypt-hashed passcodes. `npm run accounts` resets the three starter accounts to the passcodes in `.env`.
- **Sessions** are signed cookies (`SESSION_SECRET`). Changing a passcode signs that person out on every device.
- **Theme:** an admin picks each branch's colours in the terminal's **Settings**. The choice is stored in `branch_settings` and also applies to that branch's invoices.

## Billing, advance orders and settings (each branch separately)

- **Payments:** Cash, QR / GPay, Card or **Split** (any 2–3 of them, with the amount for each). Every bill stores its mode and split amounts.
- **Coupons** (`lib/coupons.ts`), manual discount, GST % (shown as CGST + SGST), delivery.
- **Advance orders**: on the billing panel, **Save as Advance Order** takes a deposit (any mode, incl. split) for the current cart.
  - Stored in `advance_orders` / `pos2_advance_orders` with IDs `MS-DEP-…` / `VG-DEP-…`.
  - The **Advance Orders** tab: filter by period/status, mark ready, view details, print, send on WhatsApp, and **receive balance**. Receiving the balance takes a manual discount and/or coupon and any payment mode, including split.
  - Deposits are not revenue. Collecting the balance creates one normal invoice for the order. Only then does it count in analytics, including the per-mode cash/UPI/card totals.
  - Receipts: `/advance/<id>` and `/pos2/advance/<id>`, printable as A4, A5, or 58/80 mm thermal (`?format=`).
  - Staff can book advance orders, mark them ready and collect balances. Only admins can cancel or delete.
- **Analytics:** All bills / GST invoices / Non-GST bills filter, plus Cash, GPay/UPI, Split and Card received.
- **Settings** (admin, per branch):
  - **Store details:** logo, owner's full name, shop name, phone, shop contact number, email, address, Instagram, location line. Stored in `branch_settings.profile`. Used by the terminal, invoices, receipts, WhatsApp messages, login and admin panel.
  - **Theme**.

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run lint`
- `npm run icons -- <image> <pos1|pos2>`
- `npm run accounts`: write the `.env` passcodes into the database

## Agents & automation

AI assistants working on this project should read `AGENTS.md` first. This project uses a Next.js version with breaking changes from standard training data.
