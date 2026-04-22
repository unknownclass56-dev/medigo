import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bike, Loader2, MapPin, Phone, CheckCircle2, Timer, Volume2, RefreshCw, Banknote, Smartphone, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

// ── Voice alert ───────────────────────────────────────────────────────────────
const speak = (text: string) => {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "hi-IN";
    u.rate = 0.9;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch { /* ignore if browser doesn't support */ }
};

// ── Per-job Countdown ─────────────────────────────────────────────────────────
function useCountdown(createdAt: string, windowSec: number) {
  const [secs, setSecs] = useState(() => {
    const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
    return Math.max(0, windowSec - elapsed);
  });

  useEffect(() => {
    if (secs <= 0) return;
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [createdAt, windowSec]);

  return secs;
}

function JobCard({
  job, windowSec, processing, onAccept,
}: {
  job: any; windowSec: number; processing: string | null; onAccept: (id: string) => void;
}) {
  const secs = useCountdown(job.updated_at || job.created_at, windowSec);
  const expired = secs === 0;
  const timerColor = secs > 60 ? "text-green-600" : secs > 20 ? "text-yellow-600" : "text-destructive animate-pulse";

  const addr = job.delivery_address ?? {};

  return (
    <Card className={`overflow-hidden transition-all ${expired ? "opacity-50" : "border-primary/40 shadow-md"}`}>
      <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-b border-primary/10 text-xs">
        <span className="font-mono font-semibold">#{job.id?.slice(0, 8)}</span>
        <span className={`flex items-center gap-1 font-bold ${expired ? "text-muted-foreground" : timerColor}`}>
          <Timer className="h-3.5 w-3.5" />
          {expired ? "Expired" : `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`}
        </span>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Earnings highlight */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Delivery Payout</div>
            <div className="text-2xl font-black text-primary">
              ₹{Number(job.delivery_charge ?? 0).toFixed(2)}
            </div>
          </div>
          <Badge variant="outline" className="text-[11px]">Awaiting Pickup</Badge>
        </div>

        {/* Customer Detail Section */}
        <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-3">
           <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700">
                <User className="h-4 w-4" />
              </div>
              <div className="font-black text-slate-900">{job.profiles?.full_name ?? "Customer"}</div>
           </div>
           
           <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-1" />
              <div className="text-slate-600 font-medium leading-relaxed">
                 <span className="block text-[10px] uppercase tracking-widest text-slate-400 font-black mb-0.5">Delivery Address</span>
                 {[addr.line1, addr.line2, addr.city, addr.pincode].filter(Boolean).join(", ") || "Address not available"}
              </div>
           </div>

           {job.profiles?.phone && (
             <a href={`tel:${job.profiles.phone}`} className="flex items-center justify-center gap-2 w-full bg-white border-2 border-blue-100 text-blue-600 rounded-lg px-3 py-2 text-xs font-black hover:bg-blue-50 transition-colors">
               <Phone className="h-3.5 w-3.5" /> CALL: {job.profiles.phone}
             </a>
           )}
        </div>

        {/* Accept button */}
        {!expired && (
          <Button
            className="w-full gap-2"
            size="sm"
            onClick={() => onAccept(job.id)}
            disabled={processing === job.id}
          >
            {processing === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Accept Delivery
          </Button>
        )}
        {expired && (
          <div className="text-xs text-center text-destructive font-medium">⏰ Job window expired</div>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveJobCard({ job, processing, onDeliver }: { job: any; processing: string | null; onDeliver: (id: string, method: string) => void }) {
  const addr = job.delivery_address ?? {};
  const [open, setOpen] = useState(false);

  return (
    <Card className="border-primary/30 shadow-md overflow-hidden">
      <div className="px-4 py-2 bg-primary/5 border-b border-primary/10 flex items-center justify-between text-xs">
        <span className="font-mono font-semibold">#{job.id?.slice(0, 8)}</span>
        <Badge className="text-[10px]">{job.status?.replace(/_/g, " ")}</Badge>
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Your Payout</div>
            <div className="text-xl font-black text-primary">₹{Number(job.delivery_charge ?? 0).toFixed(2)}</div>
          </div>
        </div>
        {/* Customer Detail Section */}
        <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-3">
           <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700">
                <User className="h-4 w-4" />
              </div>
              <div className="font-black text-slate-900">{job.profiles?.full_name ?? "Customer"}</div>
           </div>
           
           <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-1" />
              <div className="text-slate-600 font-medium leading-relaxed">
                 <span className="block text-[10px] uppercase tracking-widest text-slate-400 font-black mb-0.5">Delivery Address</span>
                 {[addr.line1, addr.line2, addr.city, addr.pincode].filter(Boolean).join(", ") || "Address not available"}
              </div>
           </div>

           {job.profiles?.phone && (
             <a href={`tel:${job.profiles.phone}`} className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-black hover:bg-blue-700 transition-colors">
               <Phone className="h-4 w-4" /> CALL CUSTOMER
             </a>
           )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="w-full"
              variant="default"
              size="sm"
              disabled={processing === job.id}
            >
              {processing === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "✅ Mark as Delivered"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-center text-xl font-black">Payment Collection</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-6">
              <div className="text-center space-y-1">
                <div className="text-sm text-muted-foreground font-bold uppercase tracking-wider">Collect Amount</div>
                <div className="text-4xl font-black text-primary">₹{Number(job.total ?? 0).toFixed(2)}</div>
              </div>
              <div className="space-y-3">
                <p className="text-center text-sm font-semibold text-muted-foreground">How did the customer pay?</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col gap-2 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
                    onClick={() => { setOpen(false); onDeliver(job.id, "cod"); }}
                  >
                    <Banknote className="h-8 w-8" />
                    <span className="font-bold">Cash</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                    onClick={() => { setOpen(false); onDeliver(job.id, "online"); }}
                  >
                    <Smartphone className="h-8 w-8" />
                    <span className="font-bold">UPI / Online</span>
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
const DeliveryJobs = () => {
  const { user } = useAuth();
  const [partner, setPartner] = useState<any>(null);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [windowSec, setWindowSec] = useState(120);
  const prevJobIds = useRef<Set<string>>(new Set());

  // ── Enrich orders with profile data ────────────────────────────────────────
  const enrichOrders = async (orders: any[]) => {
    if (!orders.length) return [];
    const customerIds = Array.from(new Set(orders.map(o => o.customer_id)));
    const { data: profs } = await supabase.from("profiles").select("user_id, full_name, phone").in("user_id", customerIds);
    const pm: Record<string, any> = {};
    (profs ?? []).forEach(p => { pm[p.user_id] = p; });
    return orders.map(o => ({ ...o, profiles: pm[o.customer_id] ?? { full_name: "Customer", phone: null } }));
  };

  // ── Load data ───────────────────────────────────────────────────────────────
  const loadData = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);

    const [{ data: p }, { data: cfg }] = await Promise.all([
      supabase.from("delivery_partners").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("platform_config").select("pharmacy_accept_window_seconds, dp_accept_window_seconds").eq("id", 1).maybeSingle(),
    ]);

    setPartner(p);
    if (cfg?.dp_accept_window_seconds) setWindowSec(cfg.dp_accept_window_seconds);
    else if (cfg?.pharmacy_accept_window_seconds) setWindowSec(cfg.pharmacy_accept_window_seconds);

    // Available jobs (awaiting_pickup + unassigned)
    const { data: avail, error: availErr } = await supabase
      .from("orders")
      .select("id, status, total, delivery_charge, created_at, updated_at, customer_id, delivery_address")
      .eq("status", "awaiting_pickup")
      .is("delivery_partner_id", null)
      .order("updated_at", { ascending: false });

    if (availErr) {
      console.error("❌ Available jobs fetch error:", availErr.message);
      toast({ title: "Could not load jobs", description: availErr.message, variant: "destructive" });
    }

    // My active jobs
    const myJobsQuery = p?.id
      ? await supabase
        .from("orders")
        .select("id, status, total, delivery_charge, created_at, updated_at, customer_id, delivery_address")
        .eq("delivery_partner_id", p.id)
        .in("status", ["out_for_delivery", "awaiting_pickup"])
        .order("updated_at", { ascending: false })
      : { data: [] };

    const enrichedAvail = await enrichOrders(avail ?? []);
    const enrichedMine = await enrichOrders(myJobsQuery.data ?? []);

    // ── Voice alert for NEW jobs ──────────────────────────────────────────────
    const newJobIds = new Set(enrichedAvail.map((j: any) => j.id));
    const trulyNew = enrichedAvail.filter((j: any) => !prevJobIds.current.has(j.id));
    if (trulyNew.length > 0 && prevJobIds.current.size > 0) {
      speak(`Nayi delivery request aayi hai! ${trulyNew.length} order aayi hai. Jaldi accept karo!`);
      toast({ title: `🔔 ${trulyNew.length} new job(s) available!`, description: "Tap to accept before timer runs out." });
    }
    prevJobIds.current = newJobIds;

    setAvailableJobs(enrichedAvail);
    setMyJobs(enrichedMine);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Realtime subscription ───────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("delivery-orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          const record = payload.new as any;
          // Only refresh on relevant status changes
          if (
            record?.status === "awaiting_pickup" ||
            record?.status === "out_for_delivery" ||
            record?.status === "delivered"
          ) {
            loadData(true);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  // ── Accept job ──────────────────────────────────────────────────────────────
  const acceptJob = async (orderId: string) => {
    if (!partner?.id) return;
    if (!partner.approved) {
      toast({ title: "Account not approved", description: "Wait for admin approval.", variant: "destructive" });
      return;
    }
    setProcessing(orderId);
    try {
      const { error } = await supabase.from("orders").update({
        delivery_partner_id: partner.id,
        status: "out_for_delivery",
      }).eq("id", orderId).eq("status", "awaiting_pickup");

      if (error) throw error;
      toast({ title: "Job accepted! 🚴", description: "Head to the pharmacy for pickup." });
      await loadData(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  // ── Mark delivered ──────────────────────────────────────────────────────────
  const markDelivered = async (orderId: string, paymentMethod: string) => {
    setProcessing(orderId);
    try {
      const { error } = await supabase.from("orders").update({
        status: "delivered",
        payment_status: "paid",
        payment_method: paymentMethod,
      }).eq("id", orderId);
      if (error) throw error;
      toast({ title: "Delivered! ✅", description: "Great work!" });
      await loadData(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="container max-w-3xl space-y-8 py-6 pb-20">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Available Jobs</h1>
          <p className="text-xs text-muted-foreground">Auto-updates in real-time · Accept window: {windowSec}s</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadData()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />Refresh
        </Button>
      </div>

      {/* My Active Deliveries */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />My Active Deliveries
        </h2>
        {myJobs.length === 0 ? (
          <div className="text-sm text-muted-foreground bg-muted/20 p-8 rounded-xl text-center border-dashed border-2">
            No active deliveries. Accept a job below!
          </div>
        ) : myJobs.map(j => (
          <ActiveJobCard key={j.id} job={j} processing={processing} onDeliver={markDelivered} />
        ))}
      </section>

      {/* Available Jobs */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Bike className="h-5 w-5 text-primary" />
          Pickup Requests
          {availableJobs.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full">
              <Volume2 className="h-3 w-3" />{availableJobs.length} new
            </span>
          )}
        </h2>

        {!partner?.is_online ? (
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <Bike className="h-8 w-8 text-muted-foreground" />
              <div className="font-bold">You are offline</div>
              <div className="text-sm text-muted-foreground">Go online from the Overview tab to receive jobs.</div>
            </CardContent>
          </Card>
        ) : availableJobs.length === 0 ? (
          <div className="text-sm text-muted-foreground bg-muted/20 p-8 rounded-xl text-center border-dashed border-2">
            No pickup requests right now. You'll be notified instantly when a pharmacy accepts an order.
          </div>
        ) : (
          availableJobs.map(j => (
            <JobCard
              key={j.id}
              job={j}
              windowSec={windowSec}
              processing={processing}
              onAccept={acceptJob}
            />
          ))
        )}
      </section>
    </div>
  );
};

export default DeliveryJobs;
