import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ClipboardList, CheckCircle2, XCircle, Loader2, MapPin, Phone } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { distanceKm } from "@/lib/cart";

const STATUS_LABELS: Record<string, string> = {
  pending_pharmacy: "New Order",
  pharmacy_accepted: "Accepted",
  pharmacy_rejected: "Rejected",
  preparing: "Preparing",
  awaiting_pickup: "Awaiting Pickup",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLOURS: Record<string, string> = {
  pending_pharmacy:  "bg-yellow-100 text-yellow-800 border-yellow-300",
  pharmacy_accepted: "bg-blue-100   text-blue-800   border-blue-300",
  pharmacy_rejected: "bg-red-100    text-red-800    border-red-300",
  preparing:         "bg-purple-100 text-purple-800 border-purple-300",
  awaiting_pickup:   "bg-orange-100 text-orange-800 border-orange-300",
  out_for_delivery:  "bg-cyan-100   text-cyan-800   border-cyan-300",
  delivered:         "bg-green-100  text-green-800  border-green-300",
  cancelled:         "bg-gray-100   text-gray-600   border-gray-300",
};

const PharmacyOrders = () => {
  const { user } = useAuth();
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [deliveryRadius, setDeliveryRadius] = useState(10);

  const loadOrders = useCallback(async () => {
    if (!user) return;

    const [{ data: ph }, { data: cfg }] = await Promise.all([
      supabase.from("pharmacies").select("id, lat, lng").eq("owner_id", user.id).maybeSingle(),
      supabase.from("platform_config").select("max_delivery_radius_km").eq("id", 1).maybeSingle(),
    ]);

    if (!ph) { setLoading(false); return; }
    setPharmacy(ph);
    if (cfg?.max_delivery_radius_km) setDeliveryRadius(cfg.max_delivery_radius_km);

    const { data: ordersData } = await supabase
      .from("orders")
      .select("id, status, total, payment_method, created_at, customer_id")
      .eq("pharmacy_id", ph.id)
      .order("created_at", { ascending: false });

    if (!ordersData?.length) { setOrders([]); setLoading(false); return; }

    const orderIds = ordersData.map(o => o.id);
    const customerIds = Array.from(new Set(ordersData.map(o => o.customer_id)));

    const [{ data: itemsData }, { data: profilesData }] = await Promise.all([
      supabase.from("order_items").select("order_id, medicine_name, quantity").in("order_id", orderIds),
      supabase.from("profiles").select("user_id, full_name, phone").in("user_id", customerIds),
    ]);

    const merged = ordersData.map(order => ({
      ...order,
      customer_name: profilesData?.find(p => p.user_id === order.customer_id)?.full_name ?? "Customer",
      customer_phone: profilesData?.find(p => p.user_id === order.customer_id)?.phone ?? null,
      order_items: itemsData?.filter(item => item.order_id === order.id) ?? [],
    }));

    setOrders(merged);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // ── Accept order → dispatch to nearby delivery partners ───────────────────
  const handleAccept = async (orderId: string) => {
    setProcessing(orderId);
    try {
      // 1. Mark as accepted
      await supabase.from("orders").update({ status: "pharmacy_accepted" }).eq("id", orderId);
      toast({ title: "Order accepted!", description: "Searching for a nearby delivery partner…" });

      // 2. Find nearby online + approved delivery partners
      const { data: partners } = await supabase
        .from("delivery_partners")
        .select("id, user_id, current_lat, current_lng")
        .eq("is_online", true)
        .eq("approved", true)
        .not("current_lat", "is", null)
        .not("current_lng", "is", null);

      const nearby = (partners ?? []).filter(p => {
        if (!pharmacy?.lat || !pharmacy?.lng) return false;
        const d = distanceKm(
          { lat: pharmacy.lat, lng: pharmacy.lng },
          { lat: p.current_lat, lng: p.current_lng }
        );
        return d <= deliveryRadius;
      });

      // 3. Notify nearby partners
      if (nearby.length > 0) {
        await supabase.from("notifications").insert(
          nearby.map(p => ({
            user_id: p.user_id,
            title: "New Delivery Request 🚴",
            body: "An order is ready for pickup. Tap to see available jobs.",
            data: { order_id: orderId, type: "delivery_request" },
          }))
        );
        toast({
          title: "Delivery partners notified",
          description: `${nearby.length} partner(s) within ${deliveryRadius} km received a request.`,
        });
      } else {
        toast({
          title: "No nearby partners found",
          description: "Order marked as awaiting pickup — visible to all online partners.",
          variant: "destructive",
        });
      }

      // 4. Update status → awaiting_pickup (delivery partners can see it)
      await supabase.from("orders").update({ status: "awaiting_pickup" }).eq("id", orderId);
      await loadOrders();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  // ── Reject order ──────────────────────────────────────────────────────────
  const handleReject = async (orderId: string) => {
    setProcessing(orderId);
    try {
      await supabase.from("orders").update({ status: "pharmacy_rejected" }).eq("id", orderId);
      toast({ title: "Order rejected." });
      await loadOrders();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="container max-w-4xl space-y-4 py-6">
      <h1 className="text-2xl font-bold">Incoming Orders</h1>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
            <div className="font-semibold">No orders yet</div>
            <div className="text-sm text-muted-foreground">Orders routed to your pharmacy will appear here.</div>
          </CardContent>
        </Card>
      ) : (
        orders.map(o => (
          <Card
            key={o.id}
            className={`overflow-hidden transition-all ${o.status === "pending_pharmacy" ? "border-primary/40 shadow-md" : ""}`}
          >
            {/* Top bar */}
            <div className={`flex items-center justify-between px-4 py-2 text-xs font-medium border-b ${o.status === "pending_pharmacy" ? "bg-primary/5" : "bg-muted/30"}`}>
              <span className="font-mono">#{o.id.slice(0, 8)}</span>
              <span className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOURS[o.status] ?? "bg-muted"}`}>
                {STATUS_LABELS[o.status] ?? o.status}
              </span>
            </div>

            <CardContent className="p-4 space-y-3">
              {/* Customer info */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{o.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                  {o.customer_phone && (
                    <a href={`tel:${o.customer_phone}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5">
                      <Phone className="h-3 w-3" />{o.customer_phone}
                    </a>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold">₹{Number(o.total).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">{o.payment_method === "cod" ? "Cash on Delivery" : "Pay on Delivery"}</div>
                </div>
              </div>

              {/* Items */}
              <div className="text-sm text-muted-foreground bg-muted/20 rounded-lg px-3 py-2">
                {(o.order_items ?? []).map((it: any) => `${it.medicine_name} × ${it.quantity}`).join(", ") || "—"}
              </div>

              {/* Accept / Reject — only for new/pending orders */}
              {o.status === "pending_pharmacy" && (
                <div className="flex gap-2 pt-1">
                  <Button
                    className="flex-1 gap-2"
                    size="sm"
                    onClick={() => handleAccept(o.id)}
                    disabled={processing === o.id}
                  >
                    {processing === o.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <CheckCircle2 className="h-4 w-4" />}
                    Accept Order
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 border-destructive text-destructive hover:bg-destructive/5"
                    size="sm"
                    onClick={() => handleReject(o.id)}
                    disabled={processing === o.id}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default PharmacyOrders;
