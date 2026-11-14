# Sift

Sift is a mobile-first invoice classification app. It suggests invoice type, department, entity and expense category, then lets a person review and approve the result.

## What the first release includes

- Upload a PDF, PNG, JPG or WebP invoice (up to 10 MB), or take a photo on a phone.
- Extract text from digital PDFs. Groq vision reads image uploads when configured. Scanned PDFs without selectable text need an image export for AI reading.
- Suggest invoice fields and classification from a fixed list of options. A simple keyword classifier works without Groq.
- Review, edit and approve every invoice; search, filter and export CSV.
- Customize types, departments, entities and categories.
- Optional Supabase email sign-in, private file storage and per-user records with Row Level Security.
- Installable home-screen icon, app manifest and mobile navigation.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no environment variables, Sift opens a demo workspace with sample invoices. Your edits are saved in that browser's local storage. Demo uploads save invoice metadata but do not retain the original file after a refresh.

## Connect Supabase

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the project's SQL editor.
3. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the Supabase project API settings.
4. In Supabase Auth URL settings, set your site URL and add local/production redirect URLs. Leave email OTP enabled.
5. Restart the dev server. Users now sign in by email. Invoices, files and settings are private to each user.

For deployment, set the same environment variables on a host that supports Next.js server routes. Use HTTPS for home-screen installation on a phone.

## Enable AI suggestions

Set `GROQ_API_KEY` in `.env.local` or your server host. The key is used only in the server route and is never exposed to the browser. The app uses Groq's `qwen/qwen3.8-27b` vision model for images and text from digital PDFs. Without the key, the app uses basic keyword rules. The free Groq tier has rate limits; check your account's current limits before relying on it for high volume.

When AI is enabled, the server sends invoice image content or extracted PDF text to Groq for classification. Make sure this fits your organization's data handling rules before using real financial documents.

On a public production deployment, connect Supabase sign-in before enabling Groq. This prevents an open classification endpoint from spending your API quota.

## Design choices

- Approval is manual because expense classification and extracted amounts can be wrong.
- Classification lists are explicit so results match the team's actual departments and entities.
- The first release does not include accounting exports, payment processing, multi-user roles or unattended auto-approval. Those need a real workflow and accounting rules from the intended business.
- All amounts are shown in their original currency. The overview counts invoices rather than summing unlike currencies.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```
