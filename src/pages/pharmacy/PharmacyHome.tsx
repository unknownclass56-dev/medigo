import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Save, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ComplaintForm from "@/components/ComplaintForm";

interface Pharmacy {
  id: string;
  name: string;
  address: string;
  city: string | null;
  pincode: string | null;
  phone: string | null;
  license_no: string | null;
  lat: number;
  lng: number;
  status: "pending" | "approved" | "rejected" | "suspended";
  is_online: boolean;
}

const PharmacyHome = () => {
  const { user } = useAuth();
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", city: "", pincode: "", phone: "", license_no: "", lat: 0, lng: 0 });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("pharmacies").select("*").eq("owner_id", user.id).maybeSingle();
    if (data) {
      setPharmacy(data as Pharmacy);
      setForm({
        name: data.name, address: data.address, city: data.city ?? "", pincode: data.pincode ?? "",
        phone: data.phone ?? "", license_no: data.license_no ?? "", lat: data.lat, lng: data.lng,
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const detect = () => {
    if (!navigator.geolocation) return toast({ title: "Geolocation unsupported", variant: "destructive" });
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      try {
        const { data } = await supabase.functions.invoke("reverse-geocode", { body: { lat, lng } });
        setForm((f) => ({
          ...f, lat, lng,
          address: f.address || data?.line1 || "",
          city: f.city || data?.city || "",
          pincode: f.pincode || data?.pincode || "",
        }));
        toast({ title: "Location detected" });
      } finally { setDetecting(false); }
    }, (err) => { setDetecting(false); toast({ title: err.message, variant: "destructive" }); }, { enableHighAccuracy: true, timeout: 15000 });
  };

  const save = async () => {
    if (!user) return;
    if (!form.name || !form.address || !form.lat) return toast({ title: "Name, address and location required", variant: "destructive" });
    setSaving(true);
    const payload = { ...form, owner_id: user.id };
    const { error } = pharmacy
      ? await supabase.from("pharmacies").update(payload).eq("id", pharmacy.id)
      : await supabase.from("pharmacies").insert(payload);
    setSaving(false);
    if (error) toast({ title: error.message, variant: "destructive" });
    else { toast({ title: "Saved" }); load(); }
  };

  const toggleOpen = async (val: boolean) => {
    if (!pharmacy) return;
    const { error } = await supabase.from("pharmacies").update({ is_open: val }).eq("id", pharmacy.id);
    if (error) return toast({ title: error.message, variant: "destructive" });
    setPharmacy({ ...pharmacy, is_online: val });
    toast({ title: val ? "Service enabled" : "Service paused", description: val ? "Customers can now order from you." : "Your medicines are hidden from customers." });
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="container max-w-4xl space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold">Pharmacy dashboard</h1>
        <p className="text-muted-foreground">Manage your store, inventory and orders.</p>
      </div>

      {pharmacy && (
        <Card className={pharmacy.is_online && pharmacy.status === "approved" ? "border-primary/40 bg-primary/5" : "border-muted"}>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Store className="h-6 w-6 text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Service status</span>
                  <Badge variant={pharmacy.status === "approved" ? "default" : "secondary"}>{pharmacy.status}</Badge>
                  <Badge variant={pharmacy.is_online ? "default" : "outline"}>{pharmacy.is_online ? "Open" : "Closed"}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {pharmacy.status !== "approved"
                    ? "Awaiting admin approval — orders won't reach you yet."
                    : pharmacy.is_online
                      ? "You're accepting new orders. Customers can see your medicines."
                      : "Service paused — your medicines are hidden from customers."}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="open" className="text-sm">{pharmacy.is_online ? "Open" : "Closed"}</Label>
              <Switch id="open" checked={pharmacy.is_online} onCheckedChange={toggleOpen} disabled={pharmacy.status !== "approved"} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">{pharmacy ? "Store details" : "Register your pharmacy"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2"><Label>Pharmacy name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-2 sm:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid gap-2"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Pincode</Label><Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="grid gap-2"><Label>License no.</Label><Input value={form.license_no} onChange={(e) => setForm({ ...form, license_no: e.target.value })} /></div>
            <div className="grid gap-2 sm:col-span-2"><Label>Coordinates</Label><Input value={form.lat && form.lng ? `${form.lat.toFixed(5)}, ${form.lng.toFixed(5)}` : ""} disabled placeholder="Click 'Detect store location'" /></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={detect} disabled={detecting}>
              {detecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}Detect store location
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{pharmacy ? "Save changes" : "Register pharmacy"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed border-2 bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer">
        <Dialog>
          <DialogTrigger asChild>
            <CardContent className="p-8 flex flex-col items-center text-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold">Help & Support</div>
                <div className="text-sm text-muted-foreground">Having trouble with an order or your store settings? Submit a complaint to the admin.</div>
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

export default PharmacyHome;
