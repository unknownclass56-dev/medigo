-- ============================================================
-- CRITICAL FIX: Delivery Partner Order Visibility & Acceptance
-- ============================================================

-- FIX 1: Orders SELECT — delivery partners must see awaiting_pickup orders
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
  -- ✅ NEW: Delivery partners can see ALL unassigned awaiting_pickup orders (the jobs pool)
  OR (
    status = 'awaiting_pickup'
    AND delivery_partner_id IS NULL
    AND public.has_role(auth.uid(), 'delivery_partner')
  )
  -- Admin sees everything
  OR public.has_role(auth.uid(), 'admin')
);

-- FIX 2: Orders UPDATE — delivery partners must be able to accept (update) unassigned orders
-- Old policy only allowed updating orders already assigned to them.
DROP POLICY IF EXISTS "Stakeholders update orders" ON public.orders;

CREATE POLICY "Orders update policy" ON public.orders FOR UPDATE USING (
  -- Customer can update their own order
  auth.uid() = customer_id
  -- Pharmacy owner can update orders for their pharmacy
  OR EXISTS (SELECT 1 FROM public.pharmacies p WHERE p.id = pharmacy_id AND p.owner_id = auth.uid())
  -- Delivery partner can update orders assigned to them
  OR EXISTS (SELECT 1 FROM public.delivery_partners dp WHERE dp.id = delivery_partner_id AND dp.user_id = auth.uid())
  -- ✅ NEW: Delivery partners can accept (update) unassigned awaiting_pickup orders
  OR (
    status = 'awaiting_pickup'
    AND delivery_partner_id IS NULL
    AND public.has_role(auth.uid(), 'delivery_partner')
  )
  -- Admin can update anything
  OR public.has_role(auth.uid(), 'admin')
);

-- FIX 3: Notifications INSERT — pharmacy owners need to notify delivery partners
-- The original policy had no INSERT rule, so pharmacies couldn't send job requests.
DROP POLICY IF EXISTS "System insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated insert notifications" ON public.notifications;

CREATE POLICY "Authenticated insert notifications" ON public.notifications FOR INSERT WITH CHECK (
  -- Users can send themselves notifications
  auth.uid() = user_id
  -- ✅ Pharmacy owners can notify delivery partners (job dispatch)
  OR public.has_role(auth.uid(), 'pharmacy_owner')
  -- Admin can notify anyone
  OR public.has_role(auth.uid(), 'admin')
);

-- FIX 4: delivery_partners SELECT — any delivery_partner role user should see others
-- (Pharmacy owners already have access, this ensures the delivery partner table
--  subquery works correctly in the orders policy above)
DROP POLICY IF EXISTS "Partners view own profile" ON public.delivery_partners;

CREATE POLICY "Partners view profiles" ON public.delivery_partners FOR SELECT USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'pharmacy_owner')
  -- ✅ NEW: delivery partners can see each other (needed for routing logic checks)
  OR public.has_role(auth.uid(), 'delivery_partner')
);
