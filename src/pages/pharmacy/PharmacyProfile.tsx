import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

const PharmacyProfile = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, bank_name, account_number, ifsc_code")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        setFullName(profile.full_name ?? "");
        setPhone(profile.phone ?? "");
        setBankName(profile.bank_name ?? "");
        setAccountNumber(profile.account_number ?? "");
        setIfscCode(profile.ifsc_code ?? "");
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone,
        bank_name: bankName,
        account_number: accountNumber,
        ifsc_code: ifscCode,
      })
      .eq("user_id", user.id);

    setSaving(false);
    if (error) toast({ title: error.message, variant: "destructive" });
    else toast({ title: "Profile updated successfully" });
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="container max-w-2xl space-y-6 py-6 font-sans">
      <div className="flex items-center gap-3">
        <User className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Your Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your personal and payout details.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Personal Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2"><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
          <div className="grid gap-2"><Label>Full Name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" /></div>
          <div className="grid gap-2"><Label>Phone Number</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Payout / Bank Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2"><Label>Bank Name</Label><Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. HDFC Bank" /></div>
          <div className="grid gap-2"><Label>Account Number</Label><Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Enter your bank account number" /></div>
          <div className="grid gap-2"><Label>IFSC Code</Label><Input value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} placeholder="e.g. HDFC0001234" /></div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} size="lg" className="w-full sm:w-auto">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Save Profile
      </Button>
    </div>
  );
};

export default PharmacyProfile;
