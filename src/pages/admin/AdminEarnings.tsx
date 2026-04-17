import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt, TrendingUp, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AdminEarnings = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalFees: 0, totalOrders: 0, avgFee: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: orders, error: ordersErr } = await supabase
          .from("orders")
          .select("id, status, subtotal, delivery_charge, total, created_at, payment_method, customer_id")
          .order("created_at", { ascending: false });

        if (ordersErr) throw ordersErr;

        if (orders && orders.length > 0) {
          const custIds = Array.from(new Set(orders.map(o => o.customer_id)));
          const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", custIds);

          let tFees = 0;
          let completedOrders = 0;

          const merged = orders.map(o => {
            // Service charge is not explicitly stored, but calculated as total - subtotal - delivery
            const sCharge = Number(o.total || 0) - Number(o.subtotal || 0) - Number(o.delivery_charge || 0);
            
            // Only count fees from successfully processed/delivered orders or accepted ones
            if (["delivered", "pharmacy_accepted", "preparing", "out_for_delivery"].includes(o.status)) {
              tFees += sCharge > 0 ? sCharge : 0;
              completedOrders++;
            }

            return {
              ...o,
              service_charge: sCharge > 0 ? sCharge : 0,
              customer_name: profs?.find(p => p.user_id === o.customer_id)?.full_name || "Unknown Customer"
            };
          });

          setStats({
            totalFees: tFees,
            totalOrders: completedOrders,
            avgFee: completedOrders > 0 ? (tFees / completedOrders) : 0
          });
          setTransactions(merged);
        }
      } catch (err) {
        console.error("Error fetching admin transactions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="container max-w-6xl space-y-6 py-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Overview</h1>
          <p className="text-muted-foreground">Track platform service fees and all customer transactions.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wide">
                  <IndianRupee className="w-4 h-4" /> Total Service Fees
                </div>
                <div className="mt-2 text-4xl font-black text-primary">₹{stats.totalFees.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wide">
                  <Receipt className="w-4 h-4" /> Paid Orders
                </div>
                <div className="mt-2 text-3xl font-bold">{stats.totalOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wide">
                  <TrendingUp className="w-4 h-4" /> Avg. Fee / Order
                </div>
                <div className="mt-2 text-3xl font-bold">₹{stats.avgFee.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-soft">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Customer Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="pl-6">Order Details</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Service Fee</TableHead>
                    <TableHead className="text-right pr-6">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.slice(0, 50).map(t => (
                    <TableRow key={t.id} className="hover:bg-muted/30">
                      <TableCell className="pl-6 py-4">
                        <div className="font-semibold">#{t.id.slice(0, 8)}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleString()}</div>
                        <Badge variant="outline" className="mt-1 text-[10px] uppercase font-bold">{t.status.replace(/_/g, ' ')}</Badge>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {t.customer_name}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="capitalize">{t.payment_method.replace(/_/g, ' ')}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-300 pointer-events-none">
                          + ₹{t.service_charge.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6 font-bold text-base">
                        ₹{Number(t.total || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        No transactions recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminEarnings;
