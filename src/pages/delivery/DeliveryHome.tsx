import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Bike, Loader2, MapPin, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ComplaintForm from "@/components/ComplaintForm";

interface Partner {
  id: string;
  is_online: boolean;
  approved: boolean;
  total_deliveries: number;
  rating: number | null;
  vehicle_type: string | null;
  vehicle_no: string | null;
}

const DeliveryHome = () => {
  const { user } = useAuth();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [locStatus, setLocStatus] = useState<"idle" | "detecting" | "ok" | "error">("idle");
  const [locCoords, setLocCoords] = useState<{ lat: number; lng: number } | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("delivery_partners").select("*").eq("user_id", user.id).maybeSingle();
    if (data) {
      setPartner(data as Partner);
      if (data.current_lat && data.current_lng) {
        setLocCoords({ lat: data.current_lat, lng: data.current_lng });
        setLocStatus("ok");
      }
    } else {
      const { data: created } = await supabase.from("delivery_partners").insert({ user_id: user.id }).select().single();
      if (created) setPartner(created as Partner);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  // ── Continuous location watch while online ──────────────────────────────
  useEffect(() => {
    if (!partner?.is_online || !partner?.id) return;
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocCoords({ lat, lng });
        setLocStatus("ok");
        await supabase.from("delivery_partners")
          .update({ current_lat: lat, current_lng: lng })
          .eq("id", partner.id);
      },
      (err) => {
        console.error("Location watch error:", err.message);
        setLocStatus("error");
        toast({
          title: "Location error",
          description: err.code === 1
            ? "Location permission denied. Please allow location access in browser settings."
            : "Could not get your location. Make sure GPS is enabled.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [partner?.is_online, partner?.id]);

  // ── Detect location (manual or on toggle) ──────────────────────────────
  const detectLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser."));
        return;
      }
      setLocStatus("detecting");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocCoords(coords);
          setLocStatus("ok");
          resolve(coords);
        },
        (err) => {
          setLocStatus("error");
          reject(new Error(
            err.code === 1
              ? "Location permission denied. Please allow it in browser settings and try again."
              : "Could not detect location. Make sure GPS is on."
          ));
        },
        { enableHighAccuracy: true, timeout: 20000 }
      );
    });
  };

  const toggleOnline = async (val: boolean) => {
    if (!partner) return;
    if (val && !partner.approved) {
      return toast({ title: "Awaiting admin approval", description: "You can't go online until approved.", variant: "destructive" });
    }

    if (val) {
      // Must get location FIRST before going online
      try {
        toast({ title: "Detecting your location…", description: "Please allow location access when prompted." });
        const coords = await detectLocation();
        // Save location + go online together
        const { error } = await supabase.from("delivery_partners").update({
          is_online: true,
          current_lat: coords.lat,
          current_lng: coords.lng,
        }).eq("id", partner.id);
        if (error) throw error;
        setPartner(p => p ? { ...p, is_online: true } : p);
        toast({ title: "You're online 🚴", description: `Location detected · ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` });
      } catch (err: any) {
        toast({ title: "Could not go online", description: err.message, variant: "destructive" });
        setLocStatus("error");
      }
    } else {
      const { error } = await supabase.from("delivery_partners").update({ is_online: false }).eq("id", partner.id);
      if (error) return toast({ title: error.message, variant: "destructive" });
      setPartner(p => p ? { ...p, is_online: false } : p);
      toast({ title: "You're offline", description: "No delivery requests will be sent to you." });
    }
  };

  const refreshLocation = async () => {
    if (!partner?.id) return;
    try {
      const coords = await detectLocation();
      await supabase.from("delivery_partners").update({ current_lat: coords.lat, current_lng: coords.lng }).eq("id", partner.id);
      toast({ title: "Location updated", description: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` });
    } catch (err: any) {
      toast({ title: "Location error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="container max-w-4xl space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold">Delivery dashboard</h1>
        <p className="text-muted-foreground">Toggle yourself online to start receiving requests.</p>
      </div>

      {partner && (
        <Card className={partner.is_online ? "border-primary/40 bg-primary/5" : ""}>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Bike className="h-6 w-6 text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Service status</span>
                  <Badge variant={partner.approved ? "default" : "secondary"}>{partner.approved ? "Approved" : "Pending"}</Badge>
                  <Badge variant={partner.is_online ? "default" : "outline"}>{partner.is_online ? "Online" : "Offline"}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {!partner.approved ? "Awaiting admin approval — toggle is locked."
                    : partner.is_online ? "You're online — sharing live location, accepting jobs."
                    : "You're offline — no requests will be sent to you."}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="online" className="text-sm">{partner.is_online ? "Online" : "Offline"}</Label>
              <Switch id="online" checked={partner.is_online} onCheckedChange={toggleOnline} disabled={!partner.approved} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Status Card */}
      <Card className={`border-2 ${
        locStatus === "ok" ? "border-green-400/50 bg-green-50/50 dark:bg-green-950/20" :
        locStatus === "error" ? "border-destructive/40 bg-destructive/5" :
        locStatus === "detecting" ? "border-primary/30 bg-primary/5" :
        "border-dashed"
      }`}>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
              locStatus === "ok" ? "bg-green-100 text-green-600" :
              locStatus === "error" ? "bg-destructive/10 text-destructive" :
              locStatus === "detecting" ? "bg-primary/10 text-primary" :
              "bg-muted text-muted-foreground"
            }`}>
              {locStatus === "detecting" ? <Loader2 className="h-5 w-5 animate-spin" /> :
               locStatus === "ok" ? <CheckCircle className="h-5 w-5" /> :
               locStatus === "error" ? <AlertTriangle className="h-5 w-5" /> :
               <MapPin className="h-5 w-5" />}
            </div>
            <div>
              <div className="font-semibold text-sm">
                {locStatus === "ok" ? "Location detected" :
                 locStatus === "error" ? "Location error — delivery routing disabled" :
                 locStatus === "detecting" ? "Detecting location…" :
                 "Location not yet detected"}
              </div>
              <div className="text-xs text-muted-foreground">
                {locCoords
                  ? `${locCoords.lat.toFixed(5)}, ${locCoords.lng.toFixed(5)}`
                  : locStatus === "error"
                    ? "Allow location access in browser → refresh"
                    : "Toggle online to auto-detect, or use Refresh below"}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={refreshLocation}
            disabled={locStatus === "detecting"}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${locStatus === "detecting" ? "animate-spin" : ""}`} />
            {locStatus === "detecting" ? "Detecting…" : "Refresh"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total deliveries", value: String(partner?.total_deliveries ?? 0) },
          { label: "Rating", value: partner?.rating ? Number(partner.rating).toFixed(1) : "—" },
          { label: "Vehicle", value: partner?.vehicle_type ?? "Not set" },
        ].map((s, i) => (
          <Card key={i} className="shadow-soft"><CardContent className="p-5">
            <div className="text-sm text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-2xl font-bold">{s.value}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card className="mt-8 border-dashed border-2 bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer">
        <Dialog>
          <DialogTrigger asChild>
            <CardContent className="p-8 flex flex-col items-center text-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                <Bike className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold underline">Help & Support</div>
                <div className="text-sm text-muted-foreground mt-1">Facing issues with a job or location tracking? Submit a complaint here.</div>
              </div>
            </CardContent>
          </DialogTrigger>
          <DialogContent>
            <ComplaintForm />
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
};

export default DeliveryHome;
