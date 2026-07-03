# Metcalf quote form → Supabase (owned lead infrastructure)

Captures every quote request into a Supabase table (`mmx_quotes`) **and** emails
`info@mmxhaust.com`. The table is the system of record — leads accumulate from day
one, so a PIN-gated dashboard (APB-style) can be switched on later with full history.

## One-time setup (~15 min)

### 1. Create the table
Supabase → your MMX project → SQL Editor → paste `schema.sql` → Run.

### 2. Email sending (Resend — free tier)
- Sign up at resend.com, add + verify the domain `metcalfmarineexhaust.com`
  (Resend gives you the DNS records — add them in Cloudflare; takes a few min).
- Create an API key. This lets mail send *from* the domain so it doesn't spam-filter.

### 3. Deploy the function
```bash
# from this /supabase folder, with the Supabase CLI installed & logged in:
supabase functions deploy quote-submit --no-verify-jwt --project-ref <YOUR_PROJECT_REF>

supabase secrets set RESEND_API_KEY=re_xxxxx --project-ref <YOUR_PROJECT_REF>
supabase secrets set QUOTE_TO=info@mmxhaust.com --project-ref <YOUR_PROJECT_REF>
supabase secrets set QUOTE_FROM="Metcalf Site <quotes@metcalfmarineexhaust.com>" --project-ref <YOUR_PROJECT_REF>
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — don't set them.

### 4. Wire the site to the function
Your function URL will be:
```
https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/quote-submit
```
In `index.html`, find `QUOTE_ENDPOINT_URL` and replace it with that URL. Redeploy the site.
(Send me the project ref and I'll do the swap + redeploy.)

## Test
Submit the form on the live site → check the `mmx_quotes` table for the row →
check `info@mmxhaust.com` for the email. Done.

## Notes
- **Security:** table has RLS on; only the function (service_role) writes. The anon
  key can't read leads. Add a scoped read policy later when the staff dashboard needs it.
- **Reliability:** if email ever fails, the lead is still saved to the table — you never lose a lead.
- **Spam:** a hidden honeypot field silently drops bots; basic email validation server-side.
- **Routing later:** to split DPF vs fabrication, or add a shared list, it's a one-line
  change in the function (choose `QUOTE_TO` by `need`). Ask when you want it.
