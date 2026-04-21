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

interface ProfileData {
  full_name: string;
  phone: string;
  email: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
}

const emptyAddr: AddressForm = { line1: "", line2: "", city: "", state: "", pincode: "", lat: null, lng: null, display: "" };

const CustomerProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    phone: "",
    email: "",
    bank_name: "",
    account_number: "",
    ifsc_code: ""
  });
  const [addr, setAddr] = useState<AddressForm>(emptyAddr);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: address }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("addresses").select("*").eq("user_id", user.id).eq("is_default", true).maybeSingle(),
      ]);
      if (p) {
        setProfile({
          full_name: p.full_name ?? "",
          phone: p.phone ?? "",
          email: (p as any).email ?? user.email ?? "",
          bank_name: p.bank_name ?? "",
          account_number: p.account_number ?? "",
          ifsc_code: p.ifsc_code ?? ""
        });
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
          let line1 = "";
          let city = "";
          let state = "";
          let pincode = "";

          try {
            const { data, error } = await supabase.functions.invoke("reverse-geocode", { body: { lat, lng } });
            if (error) throw error;
            if (data) {
              line1 = data.line1 || data.display_name?.split(",")[0] || "";
              city = data.city || "";
              state = data.state || "";
              pincode = data.pincode || "";
            }
          } catch (edgeErr) {
            console.warn("Edge function failed, falling back to direct API", edgeErr);
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`);
            if (res.ok) {
              const data = await res.json();
              line1 = data.address.road || data.display_name.split(",")[0];
              city = data.address.city || data.address.town || data.address.village || "";
              state = data.address.state || "";
              pincode = data.address.postcode || "";
            }
          }

          const fullAddress = [line1, city, state, pincode].filter(Boolean).join(", ");

          setAddr(prev => ({
            ...prev,
            line1: line1 || prev.line1,
            city: city || prev.city,
            state: state || prev.state,
            pincode: pincode || prev.pincode,
            lat,
            lng,
            display: fullAddress || `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
          }));
          
          toast({ 
            title: fullAddress ? "Location detected! 📍" : "Coordinates detected", 
            description: fullAddress ? "Address fields updated." : "Please enter street details manually." 
          });
        } catch (e: any) {
          console.error("Detection Error:", e);
          toast({ title: "Could not get address", description: "GPS worked, but address lookup failed. Please enter manually.", variant: "destructive" });
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
    if (!profile.full_name.trim() || !profile.phone.trim()) {
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
      .update({ 
        full_name: profile.full_name, 
        phone: profile.phone,
        bank_name: profile.bank_name,
        account_number: profile.account_number,
        ifsc_code: profile.ifsc_code
      })
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
      <h1 className="text-2xl font-black text-gray-800">Your Account</h1>

      <Card className="shadow-soft border-primary/10">
        <CardHeader className="bg-primary/5"><CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Identity & Contact</CardTitle></CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-2">
            <Label htmlFor="email" className="font-bold text-xs">Email ID</Label>
            <Input id="email" value={profile.email} disabled className="bg-gray-50 font-bold" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="font-bold text-xs">Full Name</Label>
              <Input id="name" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder="e.g. John Doe" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone" className="font-bold text-xs">Phone Number</Label>
              <Input id="phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="e.g. 9876543210" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft border-orange-200/50">
        <CardHeader className="bg-orange-50/50"><CardTitle className="text-sm font-black uppercase tracking-widest text-orange-700">Bank Details (For Payouts)</CardTitle></CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-2">
            <Label htmlFor="bank_name" className="font-bold text-xs">Bank Name</Label>
            <Input id="bank_name" value={profile.bank_name} onChange={(e) => setProfile({ ...profile, bank_name: e.target.value })} placeholder="e.g. HDFC Bank" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="acc_num" className="font-bold text-xs">Account Number</Label>
              <Input id="acc_num" value={profile.account_number} onChange={(e) => setProfile({ ...profile, account_number: e.target.value })} placeholder="1234..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ifsc" className="font-bold text-xs">IFSC Code</Label>
              <Input id="ifsc" value={profile.ifsc_code} onChange={(e) => setProfile({ ...profile, ifsc_code: e.target.value.toUpperCase() })} placeholder="HDFC0001234" />
            </div>
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
