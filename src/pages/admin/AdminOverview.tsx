import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, Store, Truck, IndianRupee, TrendingUp, 
  Clock, CheckCircle2, AlertCircle, ArrowUpRight,
  ArrowDownRight, Loader2, Search, Filter
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

const AdminOverview = () => {
  const [stats, setStats] = useState({
    customers: 0,
    pharmacies: 0,
    delivery: 0,
    orders: 0,
    revenue: 0,
    pendingPharmacies: 0,
    pendingKYC: 0
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          { count: custCount },
          { count: phCount },
          { count: delCount },
          { data: orders },
          { count: pendingPh }
        ] = await Promise.all([
          supabase.from("user_roles").select("*", { count: 'exact', head: true }).eq("role", "customer"),
          supabase.from("pharmacies").select("*", { count: 'exact', head: true }),
          supabase.from("delivery_partners").select("*", { count: 'exact', head: true }),
          supabase.from("orders").select("total, created_at, status"),
          supabase.from("pharmacies").select("*", { count: 'exact', head: true }).eq("status", "pending")
        ]);

        const totalRevenue = orders?.reduce((acc, o) => acc + (o.status === 'delivered' ? Number(o.total) : 0), 0) || 0;
        
        setStats({
          customers: custCount || 0,
          pharmacies: phCount || 0,
          delivery: delCount || 0,
          orders: orders?.length || 0,
          revenue: totalRevenue,
          pendingPharmacies: pendingPh || 0,
          pendingKYC: 0 // We'll add this logic if needed
        });

        // Mock data for the chart based on last 7 days
        const last7Days = [...Array(7)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toISOString().split('T')[0];
        }).reverse();

        const data = last7Days.map(date => ({
          name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          sales: orders?.filter(o => o.created_at.startsWith(date)).length || 0,
          revenue: orders?.filter(o => o.created_at.startsWith(date) && o.status === 'delivered')
                    .reduce((acc, o) => acc + Number(o.total), 0) || 0
        }));
        setChartData(data);

      } catch (err) {
        console.error("Stats Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">System Performance</h1>
          <p className="text-muted-foreground font-bold">Real-time health of MediGo ecosystem.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="font-bold gap-2"><Filter className="h-4 w-4" /> Filter</Button>
          <Button className="bg-[#10847E] font-bold gap-2"><ArrowUpRight className="h-4 w-4" /> Export</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Revenue", val: `₹${stats.revenue.toLocaleString()}`, icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50", trend: "+12%", up: true },
          { label: "Active Orders", val: stats.orders, icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50", trend: "+5%", up: true },
          { label: "Customers", val: stats.customers, icon: Users, color: "text-purple-600", bg: "bg-purple-50", trend: "+18%", up: true },
          { label: "Pharmacies", val: stats.pharmacies, icon: Store, color: "text-orange-600", bg: "bg-orange-50", trend: stats.pendingPharmacies > 0 ? `${stats.pendingPharmacies} Pending` : "Stable", up: stats.pendingPharmacies === 0 }
        ].map((s, i) => (
          <Card key={i} className="border-none shadow-soft hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className={`p-3 rounded-2xl ${s.bg} ${s.color}`}>
                  <s.icon className="h-6 w-6" />
                </div>
                <Badge variant={s.up ? "success" : "warning"} className="text-[10px] font-black uppercase tracking-widest">
                  {s.trend}
                </Badge>
              </div>
              <div className="mt-4 space-y-1">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                <p className="text-2xl font-black text-gray-900 tracking-tighter">{s.val}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <Card className="lg:col-span-2 border-none shadow-soft overflow-hidden">
          <CardHeader className="border-b bg-gray-50/50">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
               <TrendingUp className="h-4 w-4 text-[#10847E]" /> Revenue & Sales Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-10">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10847E" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10847E" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#999' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#999' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', fontWeight: 900 }}
                    itemStyle={{ color: '#10847E' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10847E" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pending Actions */}
        <Card className="border-none shadow-soft h-full">
           <CardHeader className="border-b bg-gray-50/50">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
               <Clock className="h-4 w-4 text-orange-500" /> Urgent Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y">
                {stats.pendingPharmacies > 0 && (
                  <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex gap-4">
                       <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                          <Store className="h-6 w-6" />
                       </div>
                       <div>
                          <p className="font-black text-sm text-gray-800">New Pharmacy Requests</p>
                          <p className="text-xs font-bold text-muted-foreground">{stats.pendingPharmacies} applications waiting</p>
                       </div>
                    </div>
                    <Button size="sm" className="rounded-lg font-black h-8 text-[10px] uppercase tracking-widest bg-orange-500 hover:bg-orange-600">Review</Button>
                  </div>
                )}
                <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex gap-4">
                     <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <Users className="h-6 w-6" />
                     </div>
                     <div>
                        <p className="font-black text-sm text-gray-800">KYC Verifications</p>
                        <p className="text-xs font-bold text-muted-foreground">All caught up! ✅</p>
                     </div>
                  </div>
                </div>
                <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex gap-4">
                     <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                        <AlertCircle className="h-6 w-6" />
                     </div>
                     <div>
                        <p className="font-black text-sm text-gray-800">Reported Issues</p>
                        <p className="text-xs font-bold text-muted-foreground">0 unresolved complaints</p>
                     </div>
                  </div>
                </div>
             </div>
          </CardContent>
          <div className="p-6 border-t mt-auto">
             <Button variant="ghost" className="w-full font-black text-[10px] uppercase tracking-[0.2em] text-[#10847E]">View All Activities</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

// Sub-component for icons
const ShoppingBag = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
);

export default AdminOverview;
