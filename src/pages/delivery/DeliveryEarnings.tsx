import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Wallet, Search, TrendingUp, HandCoins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const DeliveryEarnings = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ today: 0, week: 0, lifetime: 0, total_jobs: 0 });
  const [settlementStats, setSettlementStats] = useState({ codCashHeld: 0, feesOwedToRider: 0, netToHub: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const { data: p } = await supabase.from("delivery_partners").select("id").eq("user_id", user.id).maybeSingle();
      if (!p) { setLoading(false); return; }

      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, delivery_charge, total, payment_method, updated_at, status, dp_settlement_status")
        .eq("delivery_partner_id", p.id)
        .eq("status", "delivered")
        .order("updated_at", { ascending: false });

      if (error) { toast({ title: "Failed to load", variant: "destructive" }); return; }

      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7); weekStart.setHours(0,0,0,0);

      let t = 0, w = 0, l = 0;
      let codCash = 0, feesOwed = 0;

      (orders ?? []).forEach(o => {
        const d = new Date(o.updated_at);
        const charge = Number(o.delivery_charge ?? 0);
        l += charge;
        if (d >= todayStart) t += charge;
        if (d >= weekStart) w += charge;

        if (o.dp_settlement_status === "pending") {
          feesOwed += charge;
          if (o.payment_method === "cod") {
            codCash += Number(o.total || 0);
          }
        }
      });

      setStats({ today: t, week: w, lifetime: l, total_jobs: orders?.length || 0 });
      setSettlementStats({ codCashHeld: codCash, feesOwedToRider: feesOwed, netToHub: codCash - feesOwed });
      setTransactions(orders ?? []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="container max-w-3xl space-y-6 py-6 font-sans">
      <div className="flex items-center gap-3">
        <Wallet className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Earnings & Settlements</h1>
          <p className="text-sm text-muted-foreground">{stats.total_jobs} total deliveries completed</p>
        </div>
      </div>

      <Card className="bg-destructive/10 border-destructive/20 relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 opacity-10"><HandCoins className="w-40 h-40" /></div>
        <CardContent className="p-6 relative z-10">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="text-sm font-bold text-destructive uppercase tracking-wide flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Net Cash Pending Hub Deposit
              </div>
              <div className="text-4xl font-black text-destructive">
                ₹{settlementStats.netToHub > 0 ? settlementStats.netToHub.toFixed(2) : "0.00"}
              </div>
              {settlementStats.netToHub < 0 && (
                <div className="text-sm font-medium text-green-700 bg-green-100 px-2 py-1 rounded w-fit mt-2">
                  Admin owes you ₹{Math.abs(settlementStats.netToHub).toFixed(2)}
                </div>
              )}
            </div>
            <div className="hidden sm:block text-right text-xs font-semibold text-destructive/80 bg-destructive/10 py-1.5 px-3 rounded-md">
              <span className="block">Total COD Collected: ₹{settlementStats.codCashHeld.toFixed(2)}</span>
              <span className="block mt-0.5">Fees Owed To You: - ₹{settlementStats.feesOwedToRider.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-sm text-destructive font-medium mt-4">
            * Please deposit your pending net cash to the admin to clear your balance. Remaining amounts will stall profile verification status.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-soft bg-primary/5 border-primary/20"><CardContent className="p-5">
          <div className="text-sm font-medium text-primary uppercase">Today's Earnings</div>
          <div className="mt-1 text-3xl font-black text-primary">₹{stats.today.toFixed(2)}</div>
        </CardContent></Card>
        
        <Card className="shadow-soft"><CardContent className="p-5">
          <div className="text-sm text-muted-foreground font-medium uppercase">This Week</div>
          <div className="mt-1 text-2xl font-bold">₹{stats.week.toFixed(2)}</div>
        </CardContent></Card>
        
        <Card className="shadow-soft"><CardContent className="p-5">
          <div className="text-sm text-muted-foreground font-medium uppercase">Lifetime Earnings</div>
          <div className="mt-1 text-2xl font-bold">₹{stats.lifetime.toFixed(2)}</div>
        </CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8">
        <h2 className="text-lg font-bold">Recent Deliveries</h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by Order ID..." className="pl-9 bg-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {transactions.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-center text-muted-foreground">💸 Complete deliveries to start seeing your earnings history here.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {transactions.filter(t => t.id.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 20).map(t => (
            <Card key={t.id} className="overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="space-y-1">
                  <div className="font-semibold flex items-center gap-2">
                    #{t.id.slice(0, 8)} 
                    {t.payment_method === "cod" && <Badge variant="secondary" className="text-[10px]">Collected Cash: ₹{t.total?.toFixed(2) || "0.00"}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(t.updated_at).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600 uppercase text-sm">+ ₹{Number(t.delivery_charge).toFixed(2)} (FEE)</div>
                  {t.dp_settlement_status === "pending" ? (
                    <div className="text-xs font-bold text-destructive mt-1">Status: Pending Hub Settlement</div>
                  ) : (
                    <div className="text-xs font-bold text-green-600 mt-1">Status: Settled</div>
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

export default DeliveryEarnings;
