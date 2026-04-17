
# Hyperlocal Medicine Delivery Platform — MVP Plan

A production-ready MVP with all 4 roles (Customer, Pharmacy, Delivery Partner, Admin), built on React + Vite + Tailwind + Lovable Cloud (Postgres, Auth, Storage, Edge Functions, Realtime). Mapbox for maps/routing, Razorpay for online payments, COD as fallback.

## Stack mapping (vs your spec)
- Frontend: React + Vite + Tailwind + shadcn/ui (Next.js not used in Lovable)
- Backend: Supabase Edge Functions (Deno) instead of Express
- Database: Postgres (Lovable Cloud) instead of MongoDB — gives us PostGIS-style geo queries via earthdistance/Haversine
- Auth: Supabase Auth (email + password) with JWT
- Realtime: Supabase Realtime (Postgres changes) instead of Socket.io
- Storage: Supabase Storage instead of Cloudinary
- Maps: Mapbox GL JS + Directions API
- Payments: Razorpay (online) + COD

## Database schema (Postgres)
- `profiles` — base user info linked to `auth.users`
- `user_roles` — separate role table (customer / pharmacy_owner / delivery_partner / admin) — enforced via `has_role()` security definer
- `addresses` — customer delivery addresses with lat/lng
- `pharmacies` — name, owner_id, lat/lng, status (pending/approved/rejected), operating hours
- `delivery_partners` — vehicle, current_lat/lng, is_online, rating
- `medicines` — global catalog (name, generic, manufacturer, requires_prescription)
- `pharmacy_inventory` — pharmacy_id, medicine_id, stock, price, expiry
- `orders` — customer_id, pharmacy_id, delivery_partner_id, status, totals, delivery address snapshot, payment_method, payment_status
- `order_items` — order_id, medicine_id, qty, price
- `order_routing_log` — tracks pharmacy fallback chain (which pharmacies were tried & why)
- `prescriptions` — file URL in Storage, linked to order
- `delivery_tracking` — order_id, lat/lng, timestamp (live trail)
- `notifications` — in-app push feed
- `commissions_config`, `delivery_charges_config` — admin-tunable settings
- `complaints` — order_id, user_id, status, messages

RLS on every table; roles checked via `has_role(auth.uid(), 'admin')` etc.

## Customer experience
- Email/password signup → onboarding (grant location permission, save address)
- Home: search bar, "Order with prescription" CTA, repeat-order suggestions, popular medicines
- Search medicines → see availability across nearest pharmacies (auto-sorted by distance using Haversine)
- Cart → checkout → choose address → COD or Razorpay
- Live order tracking page: status timeline + Mapbox map showing pharmacy → delivery partner → customer with live partner location
- Order history with reorder
- Upload prescription (image/PDF) to Storage → attached to order

## Pharmacy dashboard
- Register → status "pending" until admin approval
- Inventory CRUD (stock, price, expiry, low-stock alerts)
- Incoming orders queue with **60-second accept window** → auto-rejects and forwards to next nearest pharmacy if not actioned
- Order timeline: accepted → packed → handed to courier
- Analytics: today's orders, revenue, top medicines

## Delivery partner dashboard
- Register, toggle online/offline
- Live location auto-updated (browser geolocation watcher) → written to `delivery_partners.current_lat/lng`
- Available deliveries list (within radius, ranked by proximity to pickup)
- Accept → navigate view (Mapbox Directions: pickup → drop)
- Status updates: picked up → on the way → delivered (with OTP confirm)
- Earnings dashboard (per-day, per-week)

## Admin panel
- Users table (filter by role), suspend/activate
- Pharmacy approvals queue
- Live orders monitor (realtime feed + map)
- Analytics: GMV, orders/day, active partners, fulfillment rate
- Configure: commission %, base + per-km delivery charge, free-delivery threshold
- Complaints inbox with status workflow

## Smart automation (Edge Functions)
1. **`assign-pharmacy`** — on order create: queries pharmacies with all items in stock, sorted by Haversine distance, sends to nearest. On reject/timeout, advances to next; logs each attempt in `order_routing_log`. Marks order `no_pharmacy_available` if exhausted.
2. **`assign-delivery-partner`** — on pharmacy accept: finds nearest online partner, offers delivery; falls back on timeout/reject.
3. **`calculate-delivery-charge`** — distance × per-km rate + base, with free-delivery threshold.
4. **`razorpay-create-order`** + **`razorpay-verify-webhook`** — online payments.
5. **`suggest-medicines`** — uses Lovable AI (Gemini) on order history to surface "you may need" items.
6. **`auto-timeout-monitor`** — cron-style check (pg_cron) to expire stale pharmacy/partner offers.

Realtime subscriptions push order status, partner location, and notifications to all relevant dashboards instantly.

## UI/UX
- Swiggy/Zepto-inspired clean design: white surfaces, vibrant primary (medical green/teal), strong typography, large touch targets
- Fully mobile-responsive (single-column on mobile, multi-column dashboards on desktop)
- Map-first tracking screens
- Separate themed dashboards per role with distinct nav

## Sample seed data
~20 medicines, 5 demo pharmacies (with inventory), 3 delivery partners, 1 admin, 2 customers — all auto-seeded so the flows work on first load.

## Build sequence (one chunk = one prompt after this plan)
1. **Foundation**: schema, RLS, roles, auth (signup/login), role-based routing, design system, seed data
2. **Customer flow**: search, pharmacy matching, cart, checkout (COD), order tracking page with Mapbox, prescription upload
3. **Pharmacy dashboard**: inventory, order queue, accept/reject + auto-fallback edge function
4. **Delivery partner dashboard**: live location, available deliveries, accept + status updates with map
5. **Admin panel**: user mgmt, approvals, live orders, analytics, config
6. **Razorpay integration** (will request your Razorpay Key ID + Secret as secrets)
7. **AI suggestions, notifications, polish & QA**

## What I'll need from you along the way
- **Mapbox public access token** (when we wire maps in step 2)
- **Razorpay Key ID + Key Secret** (in step 6)
- Approval to enable **Lovable Cloud** (free to start) — required for DB/auth/storage/functions

After you approve, I'll start with **Step 1 (Foundation)**.
