import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Filter, Store, MapPin, Phone, 
  CheckCircle2, XCircle, Clock, ExternalLink,
  ChevronRight, MoreVertical, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const AdminPharmacies = () => {
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const fetchPharmacies = async () => {
    setLoading(true);
    let query = supabase.from("pharmacies").select("*");
    
    if (filter !== "all") {
      query = query.eq("status", filter);
    }
    
    const { data } = await query.order("created_at", { ascending: false });
    setPharmacies(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPharmacies();
  }, [filter]);

  const updateStatus = async (id: string, status: "approved" | "pending" | "rejected" | "suspended") => {
    const { error } = await supabase
      .from("pharmacies")
      .update({ status })
      .eq("id", id);
    
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status Updated", description: `Pharmacy is now ${status}.` });
      fetchPharmacies();
    }
  };

  const filtered = pharmacies.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Pharmacy Network</h1>
          <p className="text-muted-foreground font-bold">Manage and verify your partner pharmacies.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or city..." 
              className="pl-9 w-64 rounded-xl border-gray-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 bg-gray-100/50 p-1.5 rounded-2xl w-fit">
        {["all", "pending", "approved", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === f ? "bg-white text-[#10847E] shadow-sm" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((p) => (
            <Card key={p.id} className="group border-none shadow-soft hover:shadow-xl transition-all duration-500 overflow-hidden bg-white">
              <CardContent className="p-0 flex flex-col md:flex-row h-full">
                {/* Left Side: Basic Info */}
                <div className="p-6 flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                         <Store className="h-5 w-5 text-[#10847E]" />
                         <h3 className="font-black text-xl text-gray-800 tracking-tight">{p.name}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {p.city || "N/A"}, {p.pincode || ""}
                      </div>
                    </div>
                    <Badge className={`uppercase text-[9px] font-black px-3 py-1 rounded-full ${
                      p.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      p.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                      'bg-red-50 text-red-600 border-red-100'
                    }`}>
                      {p.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Phone</p>
                      <p className="text-sm font-bold text-gray-700 flex items-center gap-1"><Phone className="h-3 w-3" /> {p.phone || "No phone"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">License No</p>
                      <p className="text-sm font-bold text-gray-700 truncate">{p.license_no || "N/A"}</p>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-2">
                    {p.status !== 'approved' && (
                      <Button 
                        onClick={() => updateStatus(p.id, 'approved')}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 font-black text-[10px] uppercase tracking-widest gap-2 h-10 rounded-xl"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Approve
                      </Button>
                    )}
                    {p.status !== 'rejected' && (
                      <Button 
                        variant="ghost"
                        onClick={() => updateStatus(p.id, 'rejected')}
                        className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50 font-black text-[10px] uppercase tracking-widest gap-2 h-10 rounded-xl"
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </Button>
                    )}
                  </div>
                </div>

                {/* Right Side: Action Strip */}
                <div className="md:w-16 bg-gray-50/50 flex flex-row md:flex-col items-center justify-center gap-4 py-4 border-t md:border-t-0 md:border-l border-gray-100">
                  <button className="p-2 text-gray-400 hover:text-[#10847E] transition-colors"><ExternalLink className="h-5 w-5" /></button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors"><MoreVertical className="h-5 w-5" /></button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPharmacies;
