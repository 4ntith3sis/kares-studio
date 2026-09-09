# Kares Studio — Phase 1

Next.js 14 + TypeScript + App Router fashion e-commerce foundation.
Homepage migrated 1:1 from final `homepage.html` with **Kares Studio** branding.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run typecheck
```

Seed (needs Supabase keys in `.env`, see `.env.example`):

```bash
# 1. Apply supabase/migrations/0001_phase1_schema.sql in Supabase SQL Editor
# 2. npx tsx scripts/seed.ts   (npx tsx --yes scripts/seed.ts on first run)
```

Verify DB behaviour with `supabase/verify_phase1.sql` (slug, duplicate
variant, IN/OUT, current stock, zero/negative stock, images, relationships).

## Routes

| Route | Phase 1 status |
|---|---|
| `/` | Final homepage (migrated 1:1) |
| `/collection` | Placeholder (Phase 2) |
| `/product/[slug]` | Placeholder (Phase 2) |
| `/cart` | Placeholder (Phase 2) |
| `/admin` | Placeholder (Phase 2) |
| `/about`, `/contact` | Minimal (linked from homepage) |

## Rules enforced

- No editable `stock` column — stock = `SUM(in) − SUM(out)` via
  `variant_stock` view / `get_variant_stock()`.
- `OUT` that would make stock negative is rejected by DB trigger
  (`guard_inventory_stock`, row lock → race-safe).
- Slugs auto-generated from names by DB triggers (`basic-oversized-t-shirt`,
  `…-2`, `…-3`), unique per table.
- `product_variants(product_id, color_id, size_id)` is UNIQUE.
- `inventory_transactions.quantity > 0`, `type ∈ ('in','out')`.
- RLS: catalog tables public-read-only; inventory tables no anon access;
  `product-images` bucket public-read.
- Service Role Key is server-only (seed script). Browser uses anon key.
