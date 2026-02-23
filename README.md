# Ryngr

Never miss a call again. Ryngr automatically sends your callers an SMS with a custom message and booking link when you can't answer. Replies get forwarded to your WhatsApp.

## Tech Stack

- **Backend:** Node.js / Express
- **Frontend:** Plain HTML, CSS, JS (no frameworks)
- **Database & Auth:** Supabase
- **Payments:** Stripe
- **SMS:** Twilio (via the separate [CallmissSMS](../CallmissSMS) API)

## Quick Start

```bash
git clone <repo-url> && cd Ryngr
npm install
cp .env.example .env
# Fill in your credentials (see below)
npm run dev
```

The app runs on `http://localhost:3001` by default.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default `3001`) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key (used by frontend) |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (used by backend) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (used by frontend) |
| `STRIPE_PRICE_ID` | Stripe Price ID for the $39/mo plan |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `API_BASE_URL` | URL of the CallmissSMS API (e.g. `http://localhost:3000`) |

## Supabase Setup

### 1. Create the `businesses` table

```sql
create table businesses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  business_name text,
  phone_number text,
  owner_whatsapp text,
  booking_url text,
  sms_template text,
  twilio_number text,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text default 'inactive',
  created_at timestamptz default now()
);
```

### 2. Create the `missed_calls` table

```sql
create table missed_calls (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references businesses(id) not null,
  caller_number text not null,
  replied boolean default false,
  created_at timestamptz default now()
);
```

### 3. Enable Row Level Security (optional but recommended)

```sql
alter table businesses enable row level security;
create policy "Users can read own business"
  on businesses for select using (auth.uid() = user_id);

alter table missed_calls enable row level security;
create policy "Users can read own missed calls"
  on missed_calls for select using (
    business_id in (select id from businesses where user_id = auth.uid())
  );
```

## Stripe Setup

### 1. Create a product and price

In the [Stripe Dashboard](https://dashboard.stripe.com):
1. Go to **Products** → **Add Product**
2. Name: "Ryngr Pro", Price: **$39/month** (recurring)
3. Copy the **Price ID** (starts with `price_`) into your `.env`

### 2. Set up the webhook

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. URL: `https://your-domain.com/stripe/webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
4. Copy the **Signing secret** (starts with `whsec_`) into your `.env`

For local development, use the Stripe CLI:
```bash
stripe listen --forward-to localhost:3001/stripe/webhook
```

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Landing | `/` | Marketing page with pricing |
| Login | `/login.html` | Sign up / sign in with email + password |
| Onboarding | `/onboarding.html` | 4-step setup wizard (business info → WhatsApp → booking link → SMS template) |
| Dashboard | `/dashboard.html` | Missed call log, stats, Twilio number, call forwarding instructions |
| Settings | `/settings.html` | Edit business info, SMS template, manage Stripe subscription |

## Architecture

```
Browser → Ryngr (Express, port 3001)
             ├── Serves static HTML/CSS/JS
             ├── /config endpoint (frontend env vars)
             ├── /api/* endpoints (Supabase CRUD)
             └── /stripe/* endpoints (checkout, webhooks, portal)
                    │
                    └── On payment success → calls CallmissSMS API
                                                  └── POST /businesses/provision (buys Twilio number)
```

The **CallmissSMS API** (separate service, port 3000) handles the actual Twilio webhooks:
- `POST /twilio/missed-call` — sends auto-SMS to caller
- `POST /twilio/inbound-sms` — forwards replies to WhatsApp

## Development

```bash
# Terminal 1: Run CallmissSMS API
cd ../CallmissSMS && npm run dev

# Terminal 2: Run Ryngr frontend + server
cd ../Ryngr && npm run dev

# Terminal 3: Forward Stripe webhooks locally
stripe listen --forward-to localhost:3001/stripe/webhook
```
