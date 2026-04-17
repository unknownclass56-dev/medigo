import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRightLeft, Wallet, Building2, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const AdminSettlements = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState<string | null>(null);

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      // Get all delivered orders that have pending settlements
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, total, subtotal, delivery_charge, commission_amount, payment_method, status, 
          pharmacy_settlement_status, dp_settlement_status,
          pharmacy_id, delivery_partner_id,
          pharmacies ( id, name, owner_id ),
          delivery_partners ( id, vehicle_type, user_id )
        `)
        .eq("status", "delivered")
        .or("pharmacy_settlement_status.eq.pending,dp_settlement_status.eq.pending");

      if (error) throw error;
      
      // we need delivery boy names and bank details via profiles
      if (data && data.length > 0) {
        const dpUserIds = data.map(o => o.delivery_partners?.user_id).filter(Boolean);
        const ownerIds = data.map(o => o.pharmacies?.owner_id).filter(Boolean);
        const allUserIds = Array.from(new Set([...dpUserIds, ...ownerIds]));
        
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, bank_name, account_number, ifsc_code")
          .in("user_id", allUserIds);
        
        const enhanced = data.map(o => {
          const dpProfile = profs?.find(p => p.user_id === o.delivery_partners?.user_id);
          const ownerProfile = profs?.find(p => p.user_id === o.pharmacies?.owner_id);
          
          return {
            ...o,
            dp_name: dpProfile?.full_name || "Unknown Driver",
            dp_bank: dpProfile ? { bank_name: dpProfile.bank_name, account_number: dpProfile.account_number, ifsc_code: dpProfile.ifsc_code } : null,
            pharmacy_bank: ownerProfile ? { bank_name: ownerProfile.bank_name, account_number: ownerProfile.account_number, ifsc_code: ownerProfile.ifsc_code } : null
          };
        });
        setOrders(enhanced);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error fetching settlements: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  const dpSettlements = useMemo(() => {
    const map = new Map<string, { id: string, name: string, bank: any, total_cod_cash: number, delivery_fees: number, net_payable_to_admin: number, orders: string[] }>();
    
    orders.forEach(o => {
      if (o.dp_settlement_status === "pending" && o.delivery_partner_id) {
        if (!map.has(o.delivery_partner_id)) {
          map.set(o.delivery_partner_id, { id: o.delivery_partner_id, name: o.dp_name, bank: o.dp_bank, total_cod_cash: 0, delivery_fees: 0, net_payable_to_admin: 0, orders: [] });
        }
        const s = map.get(o.delivery_partner_id)!;
        s.orders.push(o.id);
        s.delivery_fees += Number(o.delivery_charge || 0);

        if (o.payment_method === "cod") {
          s.total_cod_cash += Number(o.total || 0);
        }
        
        // Zomato logic: (Total COD Cash Held) - (Delivery Fees Earned overall)
        s.net_payable_to_admin = s.total_cod_cash - s.delivery_fees;
      }
    });
    return Array.from(map.values());
  }, [orders]);

  const pharmacySettlements = useMemo(() => {
    const map = new Map<string, { id: string, name: string, bank: any, subtotal: number, commission: number, net_payable_to_pharmacy: number, orders: string[] }>();
    
    orders.forEach(o => {
      if (o.pharmacy_settlement_status === "pending" && o.pharmacies) {
        const pid = o.pharmacies.id;
        if (!map.has(pid)) {
          map.set(pid, { id: pid, name: o.pharmacies.name, bank: o.pharmacy_bank, subtotal: 0, commission: 0, net_payable_to_pharmacy: 0, orders: [] });
        }
        const s = map.get(pid)!;
        s.orders.push(o.id);
        s.subtotal += Number(o.subtotal || 0);
        s.commission += Number(o.commission_amount || 0);
        s.net_payable_to_pharmacy = s.subtotal - s.commission;
      }
    });
    return Array.from(map.values());
  }, [orders]);

  const handleSettleDP = async (dpId: string, orderIds: string[]) => {
    if (!window.confirm(`Mark ${orderIds.length} orders as settled for this delivery partner? This confirms you have received the cash.`)) return;
    setSettling(`dp-${dpId}`);
    try {
      const { error } = await supabase.from("orders").update({ dp_settlement_status: "settled" }).in("id", orderIds);
      if (error) throw error;
      toast.success("Delivery partner cash settled successfully!");
      fetchSettlements();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSettling(null);
    }
  };

  const handleSettlePharmacy = async (pharmacyId: string, orderIds: string[]) => {
    if (!window.confirm(`Mark ${orderIds.length} orders as settled for this pharmacy? This confirms you have sent the money to them.`)) return;
    setSettling(`ph-${pharmacyId}`);
    try {
      const { error } = await supabase.from("orders").update({ pharmacy_settlement_status: "settled" }).in("id", orderIds);
      if (error) throw error;
      toast.success("Pharmacy payout settled successfully!");
      fetchSettlements();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSettling(null);
    }
  };

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const totalAdminReceivable = dpSettlements.reduce((sum, item) => sum + (item.net_payable_to_admin > 0 ? item.net_payable_to_admin : 0), 0);
  const totalAdminPayableToPharmacies = pharmacySettlements.reduce((sum, item) => sum + item.net_payable_to_pharmacy, 0);

  return (
    <div className="container max-w-6xl space-y-6 py-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settlements Hub (COD & Payouts)</h1>
          <p className="text-muted-foreground">Manage COD cash collections from riders and payouts to pharmacies.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-destructive uppercase tracking-wide">
                <Truck className="w-4 h-4" /> To Collect From Riders
              </div>
              <div className="mt-2 text-4xl font-black text-destructive">₹{totalAdminReceivable.toFixed(2)}</div>
            </div>
            <ArrowRightLeft className="w-10 h-10 text-destructive opacity-20" />
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-wide">
                <Building2 className="w-4 h-4" /> To Pay Pharmacies
              </div>
              <div className="mt-2 text-4xl font-black text-primary">₹{totalAdminPayableToPharmacies.toFixed(2)}</div>
            </div>
            <Wallet className="w-10 h-10 text-primary opacity-20" />
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <Tabs defaultValue="riders" className="w-full">
          <CardHeader className="pb-0 border-b">
            <TabsList className="mb-4">
              <TabsTrigger value="riders" className="flex items-center gap-2"><Truck className="w-4 h-4" /> Cash from Riders ({dpSettlements.length})</TabsTrigger>
              <TabsTrigger value="pharmacies" className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Pharmacy Payouts ({pharmacySettlements.length})</TabsTrigger>
            </TabsList>
          </CardHeader>
          
          <CardContent className="pt-6">
            <TabsContent value="riders" className="mt-0 space-y-4">
              {dpSettlements.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground italic">No pending cash settlements from riders.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Delivery Partner</TableHead>
                      <TableHead>Bank Details</TableHead>
                      <TableHead>Orders Pending</TableHead>
                      <TableHead className="text-right">COD Cash Held</TableHead>
                      <TableHead className="text-right">Delivery Fees (Owed)</TableHead>
                      <TableHead className="text-right font-bold text-destructive">Net To Collect</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dpSettlements.map((dp) => (
                      <TableRow key={dp.id}>
                        <TableCell className="font-semibold">{dp.name}</TableCell>
                        <TableCell className="text-xs">
                          {dp.bank?.bank_name ? (
                            <div className="space-y-0.5">
                              <div>{dp.bank.bank_name}</div>
                              <div className="text-muted-foreground font-mono">{dp.bank.account_number}</div>
                              <div className="text-muted-foreground">{dp.bank.ifsc_code}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">No bank details</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{dp.orders.length} Orders</Badge>
                        </TableCell>
                        <TableCell className="text-right">₹{dp.total_cod_cash.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">- ₹{dp.delivery_fees.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold text-destructive text-base">
                          {dp.net_payable_to_admin > 0 ? `₹${dp.net_payable_to_admin.toFixed(2)}` : (
                            <span className="text-green-600 font-medium">Platform owes rider ₹{Math.abs(dp.net_payable_to_admin).toFixed(2)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="destructive" 
                            size="sm"
                            disabled={settling === `dp-${dp.id}`}
                            onClick={() => handleSettleDP(dp.id, dp.orders)}
                          >
                            {settling === `dp-${dp.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : "Receive Cash & Settle"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="pharmacies" className="mt-0 space-y-4">
               {pharmacySettlements.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground italic">No pending payouts for pharmacies.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pharmacy Name</TableHead>
                      <TableHead>Bank Details</TableHead>
                      <TableHead>Orders Owed</TableHead>
                      <TableHead className="text-right">Gross Subtotal</TableHead>
                      <TableHead className="text-right text-destructive">Platform Commission</TableHead>
                      <TableHead className="text-right font-bold">Net To Pay (Payout)</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pharmacySettlements.map((ph) => (
                      <TableRow key={ph.id}>
                        <TableCell className="font-semibold">{ph.name}</TableCell>
                        <TableCell className="text-xs">
                          {ph.bank?.bank_name ? (
                            <div className="space-y-0.5">
                              <div>{ph.bank.bank_name}</div>
                              <div className="text-muted-foreground font-mono">{ph.bank.account_number}</div>
                              <div className="text-muted-foreground">{ph.bank.ifsc_code}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">No bank details</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{ph.orders.length} Orders</Badge>
                        </TableCell>
                        <TableCell className="text-right">₹{ph.subtotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-destructive font-medium">- ₹{ph.commission.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold text-primary text-base">
                          ₹{ph.net_payable_to_pharmacy.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="default" 
                            size="sm"
                            disabled={settling === `ph-${ph.id}`}
                            onClick={() => handleSettlePharmacy(ph.id, ph.orders)}
                          >
                            {settling === `ph-${ph.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Money & Settle"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default AdminSettlements;
