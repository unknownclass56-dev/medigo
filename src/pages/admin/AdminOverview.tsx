import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const AdminOverview = () => {
  const [stats, setStats] = useState({ 
    pendingPharmacies: 0, 
    activeOrders: 0, 
    onlinePartners: 0, 
    gmvToday: 0,
    totalEarnings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 1. Pending Pharmacies
        const { count: pendingCount, error: err1 } = await supabase
          .from("pharmacies")
          .select("*", { count: 'exact', head: true })
          .eq("status", "pending");

        // 2. Active Orders
        const { count: activeCount, error: err2 } = await supabase
          .from("orders")
          .select("*", { count: 'exact', head: true })
          .in("status", ["pharmacy_accepted", "preparing", "awaiting_pickup", "out_for_delivery"]);

        // 3. Online Partners
        const { count: onlineCount, error: err3 } = await supabase
          .from("delivery_partners")
          .select("*", { count: 'exact', head: true })
          .eq("is_online", true);

        // 4. GMV Today (sum of orders total)
        const todayStart = new Date(); 
        todayStart.setHours(0, 0, 0, 0);
        const { data: gmvData, error: err4 } = await supabase
          .from("orders")
          .select("total, subtotal, delivery_charge, commission_amount, status")
          .gte("created_at", todayStart.toISOString());

        // 5. Total Platform Earnings (Commission + Service Charge) on DELIVERED orders
        const { data: earningsData, error: err5 } = await supabase
          .from("orders")
          .select("total, subtotal, delivery_charge, commission_amount")
          .eq("status", "delivered");

        if (err1 || err2 || err3 || err4 || err5) throw err1 || err2 || err3 || err4 || err5;

        const gmv = (gmvData ?? []).reduce((acc, curr) => acc + Number(curr.total || 0), 0);

        let realizedEarnings = 0;
        (earningsData ?? []).forEach(o => {
          const serviceFee = Number(o.total || 0) - Number(o.subtotal || 0) - Number(o.delivery_charge || 0);
          const commission = Number(o.commission_amount || 0);
          realizedEarnings += (serviceFee > 0 ? serviceFee : 0) + commission;
        });

        setStats({
          pendingPharmacies: pendingCount || 0,
          activeOrders: activeCount || 0,
          onlinePartners: onlineCount || 0,
          gmvToday: gmv,
          totalEarnings: realizedEarnings
        });
      } catch (err: any) {
        console.error("Error fetching admin stats:", err);
        toast({ title: "Failed to load overview data", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="container max-w-6xl space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin overview</h1>
        <p className="text-muted-foreground">Marketplace health at a glance.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-5">
          {[
            { label: "Platform Earnings", value: `₹${stats.totalEarnings.toFixed(2)}` },
            { label: "GMV today", value: `₹${stats.gmvToday.toFixed(2)}` },
            { label: "Pending pharmacies", value: stats.pendingPharmacies },
            { label: "Active orders", value: stats.activeOrders },
            { label: "Online partners", value: stats.onlinePartners },
          ].map((s, i) => (
            <Card key={i} className="shadow-soft hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="text-sm text-muted-foreground">{s.label}</div>
                <div className="mt-1 text-3xl font-bold text-primary">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Card className="border-dashed bg-primary/5">
        <CardContent className="p-6 text-sm flex items-center justify-center gap-2 text-primary font-medium">
          Dashboard data is updating in realtime. Switch to the Users tab for detailed management.
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOverview;
