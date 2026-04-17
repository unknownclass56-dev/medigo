import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

const DeliveryProfile = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profile }, { data: partner }] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, bank_name, account_number, ifsc_code").eq("user_id", user.id).maybeSingle(),
        supabase.from("delivery_partners").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      if (profile) { 
        setFullName(profile.full_name ?? ""); 
        setPhone(profile.phone ?? "");
        setBankName(profile.bank_name ?? "");
        setAccountNumber(profile.account_number ?? "");
        setIfscCode(profile.ifsc_code ?? "");
      }
      if (partner) { setPartnerId(partner.id); setVehicleType(partner.vehicle_type ?? ""); setVehicleNo(partner.vehicle_no ?? ""); }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const [{ error: pe }, { error: de }] = await Promise.all([
      supabase.from("profiles").update({ 
        full_name: fullName, 
        phone,
        bank_name: bankName,
        account_number: accountNumber,
        ifsc_code: ifscCode
      }).eq("user_id", user.id),
      partnerId
        ? supabase.from("delivery_partners").update({ vehicle_type: vehicleType, vehicle_no: vehicleNo }).eq("id", partnerId)
        : supabase.from("delivery_partners").insert({ user_id: user.id, vehicle_type: vehicleType, vehicle_no: vehicleNo }),
    ]);
    setSaving(false);
    if (pe || de) toast({ title: (pe ?? de)!.message, variant: "destructive" });
    else toast({ title: "Saved" });
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="container max-w-2xl space-y-6 py-6">
      <h1 className="text-2xl font-bold">Your profile</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Personal & vehicle details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2"><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
          <div className="grid gap-2"><Label>Full name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Vehicle type</Label><Input value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} placeholder="Bike / Scooter / Car" /></div>
          <div className="grid gap-2"><Label>Vehicle number</Label><Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Payout / Bank details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2"><Label>Bank Name</Label><Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. HDFC Bank" /></div>
          <div className="grid gap-2"><Label>Account Number</Label><Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Enter 12-16 digit number" /></div>
          <div className="grid gap-2"><Label>IFSC Code</Label><Input value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} placeholder="e.g. HDFC0001234" /></div>
        </CardContent>
      </Card>
      <Button onClick={save} disabled={saving} size="lg">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save profile</Button>
    </div>
  );
};

export default DeliveryProfile;
