import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, MapPin, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AddressForm {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  lat: number | null;
  lng: number | null;
  display: string;
}

const emptyAddr: AddressForm = { line1: "", line2: "", city: "", state: "", pincode: "", lat: null, lng: null, display: "" };

const CustomerProfile = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addr, setAddr] = useState<AddressForm>(emptyAddr);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profile }, { data: address }] = await Promise.all([
        supabase.from("profiles").select("full_name, phone").eq("user_id", user.id).maybeSingle(),
        supabase.from("addresses").select("*").eq("user_id", user.id).eq("is_default", true).maybeSingle(),
      ]);
      if (profile) {
        setFullName(profile.full_name ?? "");
        setPhone(profile.phone ?? "");
      }
      if (address) {
        setAddressId(address.id);
        setAddr({
          line1: address.line1 ?? "",
          line2: address.line2 ?? "",
          city: address.city ?? "",
          state: address.state ?? "",
          pincode: address.pincode ?? "",
          lat: address.lat,
          lng: address.lng,
          display: [address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(", "),
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported by your browser", variant: "destructive" });
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const { data, error } = await supabase.functions.invoke("reverse-geocode", { body: { lat, lng } });
          if (error || !data) throw error ?? new Error("No data");
          setAddr({
            line1: data.line1 || "",
            line2: data.line2 || "",
            city: data.city || "",
            state: data.state || "",
            pincode: data.pincode || "",
            lat,
            lng,
            display: data.display_name || "",
          });
          toast({ title: "Location detected", description: data.display_name });
        } catch (e: any) {
          toast({ title: "Could not get address", description: e?.message ?? "Try again", variant: "destructive" });
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        setDetecting(false);
        toast({ title: "Permission denied", description: err.message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const save = async () => {
    if (!user) return;
    if (!fullName.trim() || !phone.trim()) {
      toast({ title: "Name and phone are required", variant: "destructive" });
      return;
    }
    if (!addr.line1 || !addr.city || addr.lat == null || addr.lng == null) {
      toast({ title: "Please detect or enter your address", variant: "destructive" });
      return;
    }
    setSaving(true);

    const { error: pErr } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone })
      .eq("user_id", user.id);

    const addrPayload = {
      user_id: user.id,
      line1: addr.line1,
      line2: addr.line2 || null,
      city: addr.city,
      state: addr.state || null,
      pincode: addr.pincode || null,
      lat: addr.lat,
      lng: addr.lng,
      is_default: true,
      label: "Home",
    };

    const { error: aErr } = addressId
      ? await supabase.from("addresses").update(addrPayload).eq("id", addressId)
      : await supabase.from("addresses").insert(addrPayload);

    setSaving(false);
    if (pErr || aErr) {
      toast({ title: "Could not save", description: (pErr ?? aErr)?.message, variant: "destructive" });
    } else {
      toast({ title: "Profile saved" });
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container max-w-2xl space-y-6 py-6">
      <h1 className="text-2xl font-bold">Your profile</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Personal details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ""} disabled />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Aarav Sharma" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Delivery address</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Button type="button" variant="secondary" onClick={detectLocation} disabled={detecting} className="w-full sm:w-auto">
            {detecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
            Detect my location
          </Button>

          <div className="grid gap-2">
            <Label htmlFor="display">Detected address</Label>
            <Textarea id="display" value={addr.display} readOnly rows={2} placeholder="Click 'Detect my location' to auto-fill" className="resize-none" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="line1">Address line 1</Label>
              <Input id="line1" value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="line2">Address line 2</Label>
              <Input id="line2" value={addr.line2} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input id="pincode" value={addr.pincode} onChange={(e) => setAddr({ ...addr, pincode: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Coordinates</Label>
              <Input value={addr.lat && addr.lng ? `${addr.lat.toFixed(5)}, ${addr.lng.toFixed(5)}` : ""} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} size="lg" className="w-full sm:w-auto">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Save profile
      </Button>
    </div>
  );
};

export default CustomerProfile;
