# Metcalf Marine Exhaust — Go-Live Runbook
Domain: **metcalfmarineexhaust.com** (purchased via Cloudflare) · Host: GitHub Pages · DNS: Cloudflare

Files in this package:
- `index.html` — homepage
- `soot-control.html` — DPF / Soot Control page
- `404.html` — on-brand not-found page
- `CNAME` — tells GitHub Pages the custom domain (do not edit)
- `robots.txt`, `sitemap.xml` — SEO
- All images are embedded (base64) — nothing external to break.

---

## STEP 1 — Create the GitHub repo (5 min)
1. github.com → New repository → name it `metcalf-site` (public).
2. Upload **every file in this folder** (drag-drop works). Commit.
3. Repo → Settings → Pages → Source: `Deploy from a branch` → Branch: `main` / root → Save.
4. Under the same Pages screen, "Custom domain" should auto-fill `metcalfmarineexhaust.com` from the CNAME file. If not, type it and Save.
5. Wait for the green "Your site is published" (2–10 min). It will first appear at `https://<username>.github.io/metcalf-site/`.

## STEP 2 — Point Cloudflare DNS at GitHub Pages (5 min)
In Cloudflare dashboard → metcalfmarineexhaust.com → DNS → Records, add:

| Type  | Name | Content                | Proxy |
|-------|------|------------------------|-------|
| A     | @    | 185.199.108.153        | DNS only (grey cloud) |
| A     | @    | 185.199.109.153        | DNS only |
| A     | @    | 185.199.110.153        | DNS only |
| A     | @    | 185.199.111.153        | DNS only |
| CNAME | www  | <username>.github.io   | DNS only |

(Set proxy to "DNS only" / grey cloud first so GitHub can issue SSL. You can flip to orange-cloud proxy after the cert is live.)

Then: GitHub repo → Settings → Pages → check **"Enforce HTTPS"** once the box is selectable (fixes the old site's SSL problem for good).

## STEP 3 — Redirect the OLD domain mmxhaust.com → new (10 min)
Do this in the registrar/DNS that controls **mmxhaust.com** (currently GoDaddy per prior notes).
Easiest, cleanest method — move mmxhaust.com's DNS to Cloudflare too, then add a **Redirect Rule**:
- Cloudflare → mmxhaust.com → Rules → Redirect Rules → Create:
  - When incoming requests match: Hostname `mmxhaust.com` (and `www.mmxhaust.com`)
  - Then: Static redirect → 301 Permanent → `https://metcalfmarineexhaust.com/${1}` (preserve path/query)
- Keep mmxhaust.com registered at least 12 months so the redirect persists and SEO transfers.
- In Google Search Console: verify both domains, use "Change of Address" from mmxhaust.com to the new domain.

## STEP 4 — Wire the quote form (Supabase — owned lead infrastructure)
The form captures every quote into a Supabase table (`mmx_quotes`) AND emails info@mmxhaust.com.
Full instructions in `/supabase/README.md`. Short version:
1. Run `supabase/schema.sql` in your MMX Supabase project (creates the table).
2. Set up Resend (free) for sending, verify the domain, get an API key.
3. Deploy the `quote-submit` Edge Function + set secrets (RESEND_API_KEY, QUOTE_TO, QUOTE_FROM).
4. Send me your Supabase **project ref** — I swap `QUOTE_ENDPOINT_URL` in index.html and redeploy.
Leads land in info@mmxhaust.com today; the table quietly builds history for a future
APB-style dashboard (switch on later, full lead history already there).

## STEP 5 — Add the store (Snipcart + Stripe) — you create accounts, I wire it
- **Stripe**: create/log in under Metcalf's business + bank details (their money goes straight to them). You enter all financial info — I never touch it.
- **Snipcart**: sign up, connect Stripe as the gateway, copy the **public API key**.
- Send me the Snipcart public API key. I add the Snipcart snippet + define the real products (hose $275.26, crush sleeve $84.46, T-bolt clamp $22.79, constant-torque clamp $23.35, etc.) with "Add to Cart" wired. "Call for pricing" items stay as quote buttons.
- Cost at this volume: Snipcart $20/mo (under $1k sales) or 2%/txn + Stripe 2.9%+30¢.

## Steady-state cost
~$10/yr domain (already paid) + $0 GitHub Pages + $0 Formspree + $20/mo Snipcart + Stripe processing. No WordPress, no plugins, no security patching.


---

## Snipcart product reference (already wired in index.html)
These 4 stocked parts have live "Add to cart" buttons. Set the same SKU + price in
your Snipcart dashboard (or let Snipcart crawl the page — the data-item-* attributes
are the source of truth). Prices are from the MMX catalog.

| SKU          | Product                              | Price   |
|--------------|--------------------------------------|---------|
| MMX-HUMP-4   | 4in Blue Silicone Hump Hose          | $275.26 |
| MMX-CRUSH-8  | 8in SS Crush Sleeve                  | $84.46  |
| MMX-TBOLT-4  | 4in HD SS T-Bolt Clamp               | $22.79  |
| MMX-CT-900   | Steel Constant-Torque 900 Hose Clamp | $23.35  |

The Riser ("Call for pricing") and Insulation Blanket ("Quote") are intentionally
NOT in the cart — their buttons link to the quote form instead.

To activate the store:
1. Create Stripe account (Metcalf's business + bank). You enter all card/bank details.
2. Create Snipcart account, connect Stripe, switch to Live mode when ready.
3. Copy your Snipcart PUBLIC API key and send it to me — I swap SNIPCART_PUBLIC_API_KEY
   in index.html and redeploy. (Public key is safe to embed; never send the secret key.)
4. In Snipcart dashboard, add the 4 products above (matching SKU + price) OR enable
   product validation via the crawler pointing at your live domain.
5. Set shipping + tax rules in Snipcart. Test a purchase in Test mode first.

Cost: Snipcart $20/mo (under $1k sales) or 2%/txn; Stripe 2.9% + 30cents per charge.
