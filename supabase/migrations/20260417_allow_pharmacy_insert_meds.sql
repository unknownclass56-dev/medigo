CREATE POLICY "Pharmacy owners can insert medicines" ON public.medicines 
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'pharmacy_owner'));