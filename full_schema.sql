
-- =========================================================
-- HYPERLOCAL MEDICINE DELIVERY â€” FOUNDATION SCHEMA
-- =========================================================

-- Enums
CREATE TYPE public.app_role AS ENUM ('customer', 'pharmacy_owner', 'delivery_partner', 'admin');
CREATE TYPE public.pharmacy_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE public.order_status AS ENUM (
  'pending_pharmacy', 'pharmacy_accepted', 'pharmacy_rejected',
  'preparing', 'awaiting_pickup', 'out_for_delivery', 'delivered',
  'cancelled', 'no_pharmacy_available'
);
CREATE TYPE public.payment_method AS ENUM ('cod', 'razorpay');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles (separate table â€” security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Security definer role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Addresses
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  pincode TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pharmacies
CREATE TABLE public.pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  license_no TEXT,
  phone TEXT,
  address TEXT NOT NULL,
  city TEXT,
  pincode TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  status pharmacy_status NOT NULL DEFAULT 'pending',
  open_time TIME DEFAULT '08:00',
  close_time TIME DEFAULT '22:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pharmacies_status ON public.pharmacies(status);
CREATE INDEX idx_pharmacies_geo ON public.pharmacies(lat, lng);

-- Delivery partners
CREATE TABLE public.delivery_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_type TEXT,
  vehicle_no TEXT,
  is_online BOOLEAN NOT NULL DEFAULT false,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  rating NUMERIC(3,2) DEFAULT 5.00,
  total_deliveries INT NOT NULL DEFAULT 0,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_delivery_partners_online ON public.delivery_partners(is_online);

-- Medicines catalog
CREATE TABLE public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  generic_name TEXT,
  manufacturer TEXT,
  description TEXT,
  image_url TEXT,
  requires_prescription BOOLEAN NOT NULL DEFAULT false,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_medicines_name ON public.medicines USING GIN (to_tsvector('english', name || ' ' || COALESCE(generic_name, '')));

-- Inventory
CREATE TABLE public.pharmacy_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  stock INT NOT NULL DEFAULT 0,
  price NUMERIC(10,2) NOT NULL,
  expiry_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pharmacy_id, medicine_id)
);
CREATE INDEX idx_inventory_medicine ON public.pharmacy_inventory(medicine_id);

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE SET NULL,
  delivery_partner_id UUID REFERENCES public.delivery_partners(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'pending_pharmacy',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_address JSONB NOT NULL,
  delivery_lat DOUBLE PRECISION NOT NULL,
  delivery_lng DOUBLE PRECISION NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'cod',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  notes TEXT,
  delivery_otp TEXT,
  pharmacy_offer_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_pharmacy ON public.orders(pharmacy_id);
CREATE INDEX idx_orders_partner ON public.orders(delivery_partner_id);
CREATE INDEX idx_orders_status ON public.orders(status);

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES public.medicines(id),
  medicine_name TEXT NOT NULL,
  quantity INT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL
);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);

-- Routing log (fallback chain)
CREATE TABLE public.order_routing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE SET NULL,
  attempt_no INT NOT NULL,
  outcome TEXT NOT NULL, -- offered, accepted, rejected, timeout, no_stock
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_routing_log_order ON public.order_routing_log(order_id);

-- Prescriptions
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Delivery tracking trail
CREATE TABLE public.delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  delivery_partner_id UUID REFERENCES public.delivery_partners(id) ON DELETE SET NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tracking_order ON public.delivery_tracking(order_id, recorded_at DESC);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read, created_at DESC);

-- Configs (admin tunable, single row each)
CREATE TABLE public.platform_config (
  id INT PRIMARY KEY DEFAULT 1,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  delivery_base_charge NUMERIC(10,2) NOT NULL DEFAULT 20.00,
  delivery_per_km NUMERIC(10,2) NOT NULL DEFAULT 8.00,
  free_delivery_threshold NUMERIC(10,2) NOT NULL DEFAULT 500.00,
  max_delivery_radius_km NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  pharmacy_accept_window_seconds INT NOT NULL DEFAULT 60,
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO public.platform_config (id) VALUES (1);

-- Complaints
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  admin_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- TRIGGERS
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pharmacies_updated BEFORE UPDATE ON public.pharmacies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_delivery_partners_updated BEFORE UPDATE ON public.delivery_partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_complaints_updated BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + customer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer'));

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- ENABLE RLS
-- =========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_routing_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- RLS POLICIES
-- =========================================================
-- Profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles (read-only for self, admins manage)
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Addresses
CREATE POLICY "Users manage own addresses" ON public.addresses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Pharmacies
CREATE POLICY "Anyone view approved pharmacies" ON public.pharmacies FOR SELECT USING (status = 'approved' OR auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners create pharmacies" ON public.pharmacies FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update own pharmacy" ON public.pharmacies FOR UPDATE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete pharmacies" ON public.pharmacies FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Delivery partners
CREATE POLICY "Partners view own profile" ON public.delivery_partners FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'pharmacy_owner'));
CREATE POLICY "Partners insert own" ON public.delivery_partners FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Partners update own" ON public.delivery_partners FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Medicines (public read, admin write)
CREATE POLICY "Anyone view medicines" ON public.medicines FOR SELECT USING (true);
CREATE POLICY "Admins manage medicines" ON public.medicines FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Inventory
CREATE POLICY "Anyone view inventory" ON public.pharmacy_inventory FOR SELECT USING (true);
CREATE POLICY "Pharmacy owners manage own inventory" ON public.pharmacy_inventory FOR ALL
  USING (EXISTS (SELECT 1 FROM public.pharmacies p WHERE p.id = pharmacy_id AND p.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pharmacies p WHERE p.id = pharmacy_id AND p.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Orders
CREATE POLICY "Customer view own orders" ON public.orders FOR SELECT USING (
  auth.uid() = customer_id
  OR EXISTS (SELECT 1 FROM public.pharmacies p WHERE p.id = pharmacy_id AND p.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.delivery_partners dp WHERE dp.id = delivery_partner_id AND dp.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Customers create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Stakeholders update orders" ON public.orders FOR UPDATE USING (
  auth.uid() = customer_id
  OR EXISTS (SELECT 1 FROM public.pharmacies p WHERE p.id = pharmacy_id AND p.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.delivery_partners dp WHERE dp.id = delivery_partner_id AND dp.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- Order items
CREATE POLICY "Order items follow order" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (
    o.customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.pharmacies p WHERE p.id = o.pharmacy_id AND p.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.delivery_partners dp WHERE dp.id = o.delivery_partner_id AND dp.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  ))
);
CREATE POLICY "Customers insert order items" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid())
);

-- Routing log (admins + involved pharmacy)
CREATE POLICY "Routing log view" ON public.order_routing_log FOR SELECT USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.pharmacies p WHERE p.id = pharmacy_id AND p.owner_id = auth.uid())
);

-- Prescriptions
CREATE POLICY "Customer manages own prescriptions" ON public.prescriptions FOR ALL
  USING (auth.uid() = customer_id OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.orders o JOIN public.pharmacies p ON p.id = o.pharmacy_id WHERE o.id = order_id AND p.owner_id = auth.uid()))
  WITH CHECK (auth.uid() = customer_id);

-- Delivery tracking
CREATE POLICY "Tracking visible to stakeholders" ON public.delivery_tracking FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (
    o.customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.pharmacies p WHERE p.id = o.pharmacy_id AND p.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.delivery_partners dp WHERE dp.id = o.delivery_partner_id AND dp.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  ))
);
CREATE POLICY "Partners insert tracking" ON public.delivery_tracking FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.delivery_partners dp WHERE dp.id = delivery_partner_id AND dp.user_id = auth.uid())
);

-- Notifications
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Platform config
CREATE POLICY "Anyone read config" ON public.platform_config FOR SELECT USING (true);
CREATE POLICY "Admins update config" ON public.platform_config FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Complaints
CREATE POLICY "Users manage own complaints" ON public.complaints FOR ALL
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- STORAGE BUCKETS
-- =========================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('prescriptions', 'prescriptions', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Users upload own prescriptions" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users read own prescriptions" ON storage.objects FOR SELECT
  USING (bucket_id = 'prescriptions' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Users delete own prescriptions" ON storage.objects FOR DELETE
  USING (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_partners;

UPDATE storage.buckets SET public = false WHERE id = 'avatars';
DROP POLICY IF EXISTS "Anyone view avatars" ON storage.objects;
CREATE POLICY "Authenticated view avatars" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
ALTER TABLE public.pharmacies
  ADD COLUMN IF NOT EXISTS is_open BOOLEAN NOT NULL DEFAULT true;
-- Pharmacy KYC fields
ALTER TABLE public.pharmacies
  ADD COLUMN IF NOT EXISTS gst_no text,
  ADD COLUMN IF NOT EXISTS owner_aadhaar text,
  ADD COLUMN IF NOT EXISTS shop_photo_path text,
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS kyc_submitted_at timestamptz;

-- Delivery KYC fields
ALTER TABLE public.delivery_partners
  ADD COLUMN IF NOT EXISTS aadhaar_no text,
  ADD COLUMN IF NOT EXISTS pan_no text,
  ADD COLUMN IF NOT EXISTS driving_license_no text,
  ADD COLUMN IF NOT EXISTS vehicle_rc_no text,
  ADD COLUMN IF NOT EXISTS selfie_path text,
  ADD COLUMN IF NOT EXISTS aadhaar_path text,
  ADD COLUMN IF NOT EXISTS pan_path text,
  ADD COLUMN IF NOT EXISTS dl_path text,
  ADD COLUMN IF NOT EXISTS rc_path text,
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS kyc_submitted_at timestamptz;

-- Add 'pay_on_delivery' to payment_method enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_method' AND e.enumlabel = 'pay_on_delivery'
  ) THEN
    ALTER TYPE public.payment_method ADD VALUE 'pay_on_delivery';
  END IF;
END$$;

-- KYC docs bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-docs', 'kyc-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for kyc-docs
DROP POLICY IF EXISTS "KYC owner read" ON storage.objects;
CREATE POLICY "KYC owner read" ON storage.objects FOR SELECT
USING (bucket_id = 'kyc-docs' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "KYC owner insert" ON storage.objects;
CREATE POLICY "KYC owner insert" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'kyc-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "KYC owner update" ON storage.objects;
CREATE POLICY "KYC owner update" ON storage.objects FOR UPDATE
USING (bucket_id = 'kyc-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "KYC owner delete" ON storage.objects;
CREATE POLICY "KYC owner delete" ON storage.objects FOR DELETE
USING (bucket_id = 'kyc-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ifsc_code TEXT;
ALTER TABLE platform_config 
ADD COLUMN IF NOT EXISTS banner_title TEXT DEFAULT 'Get your medicines Delivered in 30 Mins.',
ADD COLUMN IF NOT EXISTS banner_subtitle TEXT DEFAULT 'Verified Pharmacies. Trusted Logistics. Best Prices.',
ADD COLUMN IF NOT EXISTS banner_badge TEXT DEFAULT 'FLAT 25% OFF';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update trigger to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), 
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.email
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer'));

  RETURN NEW;
END; $$;
-- Add service_charge column to platform_config if it doesn't exist
ALTER TABLE platform_config
ADD COLUMN IF NOT EXISTS service_charge numeric NOT NULL DEFAULT 5;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pharmacy_settlement_status TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dp_settlement_status TEXT DEFAULT 'pending';
CREATE POLICY "Pharmacy owners can insert medicines" ON public.medicines 
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'pharmacy_owner'));
-- Fix RLS for Admins to view all profiles and roles without recursion issues
-- Use a more direct check if possible

DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Admin/Owner view profile" ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
CREATE POLICY "Admin/Owner view roles" ON public.user_roles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Ensure Admins can also update/delete roles
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);
-- ============================================================
-- CRITICAL FIX: Delivery Partner Order Visibility & Acceptance
-- ============================================================

-- FIX 1: Orders SELECT â€” delivery partners must see awaiting_pickup orders
-- Old policy only showed orders WHERE delivery_partner_id = their own ID
-- This means unassigned orders (delivery_partner_id IS NULL) were invisible.
DROP POLICY IF EXISTS "Customer view own orders" ON public.orders;

CREATE POLICY "Orders select policy" ON public.orders FOR SELECT USING (
  -- Customer sees own orders
  auth.uid() = customer_id
  -- Pharmacy owner sees orders for their pharmacy
  OR EXISTS (SELECT 1 FROM public.pharmacies p WHERE p.id = pharmacy_id AND p.owner_id = auth.uid())
  -- Delivery partner sees orders assigned to them
  OR EXISTS (SELECT 1 FROM public.delivery_partners dp WHERE dp.id = delivery_partner_id AND dp.user_id = auth.uid())
  -- âœ… NEW: Delivery partners can see ALL unassigned awaiting_pickup orders (the jobs pool)
  OR (
    status = 'awaiting_pickup'
    AND delivery_partner_id IS NULL
    AND public.has_role(auth.uid(), 'delivery_partner')
  )
  -- Admin sees everything
  OR public.has_role(auth.uid(), 'admin')
);

-- FIX 2: Orders UPDATE â€” delivery partners must be able to accept (update) unassigned orders
-- Old policy only allowed updating orders already assigned to them.
DROP POLICY IF EXISTS "Stakeholders update orders" ON public.orders;

CREATE POLICY "Orders update policy" ON public.orders FOR UPDATE USING (
  -- Customer can update their own order
  auth.uid() = customer_id
  -- Pharmacy owner can update orders for their pharmacy
  OR EXISTS (SELECT 1 FROM public.pharmacies p WHERE p.id = pharmacy_id AND p.owner_id = auth.uid())
  -- Delivery partner can update orders assigned to them
  OR EXISTS (SELECT 1 FROM public.delivery_partners dp WHERE dp.id = delivery_partner_id AND dp.user_id = auth.uid())
  -- âœ… NEW: Delivery partners can accept (update) unassigned awaiting_pickup orders
  OR (
    status = 'awaiting_pickup'
    AND delivery_partner_id IS NULL
    AND public.has_role(auth.uid(), 'delivery_partner')
  )
  -- Admin can update anything
  OR public.has_role(auth.uid(), 'admin')
);

-- FIX 3: Notifications INSERT â€” pharmacy owners need to notify delivery partners
-- The original policy had no INSERT rule, so pharmacies couldn't send job requests.
DROP POLICY IF EXISTS "System insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated insert notifications" ON public.notifications;

CREATE POLICY "Authenticated insert notifications" ON public.notifications FOR INSERT WITH CHECK (
  -- Users can send themselves notifications
  auth.uid() = user_id
  -- âœ… Pharmacy owners can notify delivery partners (job dispatch)
  OR public.has_role(auth.uid(), 'pharmacy_owner')
  -- Admin can notify anyone
  OR public.has_role(auth.uid(), 'admin')
);

-- FIX 4: delivery_partners SELECT â€” any delivery_partner role user should see others
-- (Pharmacy owners already have access, this ensures the delivery partner table
--  subquery works correctly in the orders policy above)
DROP POLICY IF EXISTS "Partners view own profile" ON public.delivery_partners;

CREATE POLICY "Partners view profiles" ON public.delivery_partners FOR SELECT USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'pharmacy_owner')
  -- âœ… NEW: delivery partners can see each other (needed for routing logic checks)
  OR public.has_role(auth.uid(), 'delivery_partner')
);
-- Add piece/pack pricing to pharmacy_inventory
ALTER TABLE pharmacy_inventory
ADD COLUMN IF NOT EXISTS price_per_piece  numeric          DEFAULT NULL,
ADD COLUMN IF NOT EXISTS price_per_pack   numeric          DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pieces_per_pack  integer          DEFAULT 10;

-- Back-fill existing rows: treat current price as price_per_piece
UPDATE pharmacy_inventory
SET price_per_piece = price
WHERE price_per_piece IS NULL;

-- Add missing columns to platform_config
ALTER TABLE public.platform_config 
  ADD COLUMN IF NOT EXISTS service_charge numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS banner_title TEXT DEFAULT 'Get your medicines Delivered in 30 Mins.',
  ADD COLUMN IF NOT EXISTS banner_subtitle TEXT DEFAULT 'Verified Pharmacies. Trusted Logistics. Best Prices.',
  ADD COLUMN IF NOT EXISTS banner_badge TEXT DEFAULT 'FLAT 25% OFF';

-- Add settlements columns to orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pharmacy_settlement_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS dp_settlement_status TEXT DEFAULT 'pending';

-- Add bank details to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS ifsc_code TEXT;
