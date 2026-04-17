import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ClipboardList, Search } from "lucide-react";

const statusLabel: Record<string, string> = {
  pending_pharmacy: "Finding pharmacy",
  pharmacy_accepted: "Pharmacy accepted",
  pharmacy_rejected: "Pharmacy declined",
  preparing: "Preparing",
  awaiting_pickup: "Awaiting pickup",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  no_pharmacy_available: "No pharmacy available",
};

const CustomerOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Step 1: Fetch Orders (basic info only)
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, status, total, subtotal, delivery_charge, payment_method, created_at, delivery_partner_id")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;
      if (!ordersData?.length) { setOrders([]); setLoading(false); return; }

      const orderIds = ordersData.map(o => o.id);
      const partnerIds = ordersData.map(o => o.delivery_partner_id).filter(Boolean);

      // Step 2: Fetch Order Items and Partner Profiles
      const [itemsRes, partnersRes] = await Promise.all([
        supabase.from("order_items").select("order_id, medicine_name, quantity").in("order_id", orderIds),
        partnerIds.length > 0 
          ? supabase.from("delivery_partners").select("id, user_id, vehicle_no").in("id", partnerIds)
          : Promise.resolve({ data: [] })
      ]);

      const partnerUserIds = partnersRes.data?.map(p => p.user_id) || [];
      const { data: profilesData } = partnerUserIds.length > 0
        ? await supabase.from("profiles").select("user_id, full_name, phone").in("user_id", partnerUserIds)
        : { data: [] };
      
      // Step 3: Merge everything
      const mergedOrders = ordersData.map(order => {
        const partner = partnersRes.data?.find(p => p.id === order.delivery_partner_id);
        const partnerProfile = profilesData?.find(p => p.user_id === partner?.user_id);
        
        return {
          ...order,
          order_items: itemsRes.data?.filter(item => item.order_id === order.id) ?? [],
          delivery_partner: partnerProfile ? {
            name: partnerProfile.full_name,
            phone: partnerProfile.phone,
            vehicle: partner?.vehicle_no
          } : null
        };
      });

      setOrders(mergedOrders);
      setLoading(false);
    })();
  }, [user]);

  const filteredOrders = orders.filter(o => {
    const query = searchQuery.toLowerCase();
    const matchesId = o.id.toLowerCase().includes(query);
    const matchesItems = (o.order_items ?? []).some((it: any) =>
      it.medicine_name.toLowerCase().includes(query)
    );
    return matchesId || matchesItems;
  });

  return (
    <div className="container max-w-3xl space-y-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Your orders</h1>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order ID or medicine..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filteredOrders.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-2 p-10 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground" />
          <div className="font-semibold">No orders found</div>
          <div className="text-sm text-muted-foreground">Try adjusting your search query.</div>
        </CardContent></Card>
      ) : filteredOrders.map((o) => (
        <Card key={o.id}>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">Order #{o.id.slice(0, 8)}</div>
                <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
              </div>
              <Badge variant={o.status === "delivered" ? "default" : "secondary"}>{statusLabel[o.status] ?? o.status}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {(o.order_items ?? []).map((it: any) => `${it.medicine_name} × ${it.quantity}`).join(", ") || "—"}
            </div>
            <div className="flex items-center justify-between border-t pt-2 text-sm">
              <span className="text-muted-foreground">{o.payment_method === "cod" ? "Cash on Delivery" : "Pay on Delivery"}</span>
              <span className="font-semibold">₹{Number(o.total).toFixed(2)}</span>
            </div>

            {o.delivery_partner && (
              <div className="mt-3 border-t pt-3 bg-primary/5 -mx-4 px-4 pb-4">
                <div className="text-xs font-bold text-primary mb-2">DELIVERY PARTNER ASSIGNED</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full gradient-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                      {o.delivery_partner.name?.charAt(0) || "D"}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{o.delivery_partner.name}</div>
                      <div className="text-xs text-muted-foreground">{o.delivery_partner.vehicle || "On Bike"}</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild className="h-8">
                    <a href={`tel:${o.delivery_partner.phone}`}>Call Partner</a>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CustomerOrders;
