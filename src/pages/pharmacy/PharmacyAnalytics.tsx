import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, TrendingUp, ReceiptText, Search, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const PharmacyAnalytics = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ today: 0, week: 0, lifetime: 0, total_orders: 0 });
  const [payoutStats, setPayoutStats] = useState({ pendingNet: 0, totalCommissionPaid: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const { data: p } = await supabase.from("pharmacies").select("id").eq("owner_id", user.id).maybeSingle();
      if (!p) { setLoading(false); return; }

      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, total, subtotal, commission_amount, status, created_at, payment_method, pharmacy_settlement_status")
        .eq("pharmacy_id", p.id)
        .in("status", ["delivered", "out_for_delivery", "pharmacy_accepted", "awaiting_pickup", "preparing"])
        .order("created_at", { ascending: false });

      if (error) { toast({ title: "Failed to load Analytics", variant: "destructive" }); return; }

      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7); weekStart.setHours(0,0,0,0);

      let t = 0, w = 0, l = 0;
      let pNet = 0, tComm = 0;

      (orders ?? []).forEach(o => {
        const d = new Date(o.created_at);
        const sub = Number(o.subtotal ?? 0);
        const comm = Number(o.commission_amount ?? 0);
        const net = sub - comm;

        l += sub;
        if (d >= todayStart) t += sub;
        if (d >= weekStart) w += sub;

        if (o.status === "delivered") {
          tComm += comm;
          if (o.pharmacy_settlement_status === "pending") {
            pNet += net;
          }
        }
      });

      setStats({ today: t, week: w, lifetime: l, total_orders: orders?.length || 0 });
      setPayoutStats({ pendingNet: pNet, totalCommissionPaid: tComm });
      setTransactions(orders ?? []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="container max-w-4xl space-y-6 py-6 font-sans">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Sales & Payouts</h1>
          <p className="text-sm text-muted-foreground">{stats.total_orders} total orders processed</p>
        </div>
      </div>

      <Card className="bg-primary/5 border-primary/20 relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 opacity-5"><Building2 className="w-40 h-40" /></div>
        <CardContent className="p-6 relative z-10">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="text-sm font-bold text-primary uppercase tracking-wide flex items-center gap-2">
                <ReceiptText className="w-4 h-4" /> Net Payout Pending from Admin
              </div>
              <div className="text-4xl font-black text-primary">₹{payoutStats.pendingNet.toFixed(2)}</div>
            </div>
            <div className="hidden sm:block text-right text-xs font-semibold text-primary/80 bg-primary/10 py-1.5 px-3 rounded-md">
              <span className="block">All-Time Platform Fees Paid: ₹{payoutStats.totalCommissionPaid.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-sm text-primary font-medium mt-4">
            * This is your exact profit minus platform commission for completed orders. Admin will transfer this to your bank account and clear the balance.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-soft bg-muted/30 border-muted"><CardContent className="p-5">
          <div className="text-sm text-muted-foreground font-medium uppercase">Today's Gross Sales</div>
          <div className="mt-1 text-3xl font-black">₹{stats.today.toFixed(2)}</div>
        </CardContent></Card>
        
        <Card className="shadow-soft"><CardContent className="p-5">
          <div className="text-sm text-muted-foreground font-medium uppercase">This Week</div>
          <div className="mt-1 text-2xl font-bold">₹{stats.week.toFixed(2)}</div>
        </CardContent></Card>
        
        <Card className="shadow-soft"><CardContent className="p-5">
          <div className="text-sm text-muted-foreground font-medium uppercase">Lifetime Sales</div>
          <div className="mt-1 text-2xl font-bold">₹{stats.lifetime.toFixed(2)}</div>
        </CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8">
        <h2 className="text-lg font-bold flex items-center gap-2"><ReceiptText className="h-5 w-5" /> Transactions History</h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by Order ID..." className="pl-9 bg-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {transactions.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-center text-muted-foreground">No transactions available yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {transactions.filter(t => t.id.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 30).map(t => (
            <Card key={t.id} className="overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="space-y-1">
                  <div className="font-semibold flex items-center gap-2">
                    Order #{t.id.slice(0, 8)}
                    <Badge variant="outline" className="text-[10px] uppercase">{t.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-base">₹{Number(t.subtotal).toFixed(2)}</div>
                  <div className="text-xs text-destructive font-medium mt-0.5">- ₹{Number(t.commission_amount || 0).toFixed(2)} (Platform Fee)</div>
                  {t.status === "delivered" && (
                    <div className="text-xs mt-1 font-bold">
                      {t.pharmacy_settlement_status === "pending" ? (
                        <span className="text-orange-500">Pending Admin Payout</span>
                      ) : (
                        <span className="text-green-600">Settled to Bank</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PharmacyAnalytics;
