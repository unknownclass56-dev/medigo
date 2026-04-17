import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Minus, Plus, ShoppingBag, Trash2, Truck, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCart, distanceKm, calcDeliveryFee } from "@/lib/cart";
import { toast } from "@/hooks/use-toast";

const CustomerCart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items, setQty, remove, subtotal, clear } = useCart();
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState<any>(null);
  const [profile, setProfile] = useState<{ full_name: string | null; phone: string | null } | null>(null);
  const [bestPharmacy, setBestPharmacy] = useState<{ id: string; distance_km: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "pay_on_delivery">("cod");
  const [placing, setPlacing] = useState(false);
  const [serviceCharge, setServiceCharge] = useState(5); // default ₹5, overridden by DB
  const [commissionPct, setCommissionPct] = useState(10); // default 10%


  // Load address + profile + find nearest pharmacy that has ALL items in stock
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: addr }, { data: prof }, { data: config }] = await Promise.all([
        supabase.from("addresses").select("*").eq("user_id", user.id).eq("is_default", true).maybeSingle(),
        supabase.from("profiles").select("full_name, phone").eq("user_id", user.id).maybeSingle(),
        supabase.from("platform_config").select("service_charge, commission_pct").eq("id", 1).maybeSingle(),
      ]);
      setAddress(addr);
      setProfile(prof);
      if (config?.service_charge != null) setServiceCharge(config.service_charge);
      if (config?.commission_pct != null) setCommissionPct(config.commission_pct);


      if (addr && items.length > 0 && addr.lat && addr.lng) {
        // Fetch inventory rows for all medicines in cart at approved+open pharmacies
        const ids = items.map((i) => i.medicine_id);
        const { data: inv } = await supabase
          .from("pharmacy_inventory")
          .select("medicine_id, stock, price, pharmacies!inner(id, status, is_open, lat, lng)")
          .in("medicine_id", ids)
          .eq("pharmacies.status", "approved")
          .eq("pharmacies.is_open", true)
          .gt("stock", 0);

        // Group by pharmacy → list of medicine_ids it covers
        const phMap = new Map<string, { lat: number; lng: number; meds: Set<string> }>();
        (inv ?? []).forEach((row: any) => {
          const p = row.pharmacies;
          if (!p || !p.lat || !p.lng) return;
          // ensure stock >= requested qty
          const want = items.find((i) => i.medicine_id === row.medicine_id)?.quantity ?? 1;
          if (row.stock < want) return;
          if (!phMap.has(p.id)) phMap.set(p.id, { lat: p.lat, lng: p.lng, meds: new Set() });
          phMap.get(p.id)!.meds.add(row.medicine_id);
        });

        // Pick nearest pharmacy that covers ALL items
        let best: { id: string; dist: number } | null = null;
        phMap.forEach((v, id) => {
          if (v.meds.size !== ids.length) return;
          const d = distanceKm({ lat: addr.lat, lng: addr.lng }, { lat: v.lat, lng: v.lng });
          if (!best || d < best.dist) best = { id, dist: d };
        });
        if (best) setBestPharmacy({ id: best.id, distance_km: best.dist });
        else setBestPharmacy(null);
      }
      setLoading(false);
    })();
  }, [user, items]);

  const distance = bestPharmacy?.distance_km ?? null;
  const deliveryFee = distance != null ? calcDeliveryFee(distance) : 0;
  const total = subtotal + deliveryFee + serviceCharge;

  const placeOrder = async () => {
    if (!user || !address || items.length === 0) return;
    if (!profile?.full_name || !profile?.phone) {
      toast({ title: "Complete your profile first", variant: "destructive" });
      navigate("/app/profile");
      return;
    }
    if (!bestPharmacy) {
      toast({ title: "No nearby pharmacy has all items", description: "Try removing some items.", variant: "destructive" });
      return;
    }
    setPlacing(true);
    const { data: order, error } = await supabase.from("orders").insert({
      customer_id: user.id,
      pharmacy_id: bestPharmacy.id,
      delivery_address: {
        line1: address.line1, line2: address.line2, city: address.city,
        state: address.state, pincode: address.pincode,
      },
      delivery_lat: address.lat,
      delivery_lng: address.lng,
      subtotal,
      delivery_charge: deliveryFee,
      total,
      commission_amount: Number((subtotal * (commissionPct / 100)).toFixed(2)),
      payment_method: paymentMethod,
      payment_status: "pending",
      status: "pending_pharmacy",
      pharmacy_settlement_status: "pending",
      dp_settlement_status: "pending",
    }).select().single();

    if (error || !order) {
      setPlacing(false);
      return toast({ title: "Could not place order", description: error?.message, variant: "destructive" });
    }

    const { error: itemsErr } = await supabase.from("order_items").insert(
      items.map((i) => ({
        order_id: order.id,
        medicine_id: i.medicine_id,
        medicine_name: i.name,
        quantity: i.quantity,
        unit_price: i.price,
        total_price: i.price * i.quantity,
      })),
    );

    setPlacing(false);
    if (itemsErr) return toast({ title: "Order saved, items failed", description: itemsErr.message, variant: "destructive" });

    clear();
    toast({ title: "Order placed!", description: "We'll notify the pharmacy now." });
    navigate("/app/orders");
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (items.length === 0) {
    return (
      <div className="container max-w-2xl py-10">
        <Card><CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          <div className="font-semibold">Your cart is empty</div>
          <Button asChild><Link to="/app/search">Browse medicines</Link></Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl space-y-5 py-6 pb-28">
      <h1 className="text-2xl font-bold">Your cart</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {items.map((i) => (
            <div key={i.medicine_id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{i.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>₹{i.price.toFixed(2)} per {i.unit_type ?? "piece"}</span>
                  {i.unit_type === "pack" && i.pieces_per_pack && (
                    <Badge variant="outline" className="text-[10px] h-4">Pack of {i.pieces_per_pack}</Badge>
                  )}
                  {i.requires_prescription && <Badge variant="outline" className="ml-1">Rx</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(i.medicine_id, i.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                <div className="w-8 text-center text-sm font-semibold">{i.quantity}</div>
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(i.medicine_id, i.quantity + 1)}><Plus className="h-3 w-3" /></Button>
              </div>
              <div className="w-16 text-right font-semibold">₹{(i.price * i.quantity).toFixed(2)}</div>
              <Button size="icon" variant="ghost" onClick={() => remove(i.medicine_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Delivery to</CardTitle></CardHeader>
        <CardContent>
          {address ? (
            <div className="text-sm">
              <div className="font-medium">{profile?.full_name}</div>
              <div className="text-muted-foreground">{[address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(", ")}</div>
            </div>
          ) : (
            <Button asChild variant="link" className="px-0"><Link to="/app/profile">Add delivery address</Link></Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Payment method</CardTitle></CardHeader>
        <CardContent>
          <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)} className="space-y-2">
            <Label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-secondary/50">
              <RadioGroupItem value="cod" />
              <Wallet className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <div className="font-medium">Cash on Delivery</div>
                <div className="text-xs text-muted-foreground">Pay cash when your order arrives.</div>
              </div>
            </Label>
            <Label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-secondary/50">
              <RadioGroupItem value="pay_on_delivery" />
              <Truck className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <div className="font-medium">Pay on Delivery (UPI / Card)</div>
                <div className="text-xs text-muted-foreground">Pay digitally to the delivery partner at your door.</div>
              </div>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-5 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between">
            <span>Delivery {distance != null && <span className="text-muted-foreground">({distance.toFixed(1)} km)</span>}</span>
            <span>{distance != null ? `₹${deliveryFee.toFixed(2)}` : "—"}</span>
          </div>
          <div className="flex justify-between text-muted-foreground"><span>Platform Service Fee</span><span>₹{serviceCharge.toFixed(2)}</span></div>
          <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
          {!bestPharmacy && address && (
            <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">No nearby open pharmacy has all your items in stock. Try removing some.</div>
          )}
        </CardContent>
      </Card>

      <Button onClick={placeOrder} disabled={placing || !bestPharmacy || !address} size="lg" className="w-full">
        {placing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingBag className="mr-2 h-4 w-4" />}
        Place order · ₹{total.toFixed(2)}
      </Button>
    </div>
  );
};

export default CustomerCart;
